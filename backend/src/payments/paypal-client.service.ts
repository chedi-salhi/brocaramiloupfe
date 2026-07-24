import { Injectable, Logger } from '@nestjs/common';

// Client REST minimal pour PayPal Orders API v2 (Checkout) — pas de SDK
// officiel ajouté exprès : seulement 3 appels HTTP nécessaires (token OAuth2,
// créer une commande, la capturer), le fetch natif de Node 20+ suffit sans
// nouvelle dépendance. Sandbox uniquement pour l'instant (voir
// PAYPAL_API_BASE dans backend/.env) — même code fonctionnerait en
// production en changeant juste cette URL et les identifiants.
interface PaypalLink {
  href: string;
  rel: string;
  method: string;
}

interface PaypalCreateOrderResponse {
  id: string;
  status: string;
  links: PaypalLink[];
}

interface PaypalCaptureResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

@Injectable()
export class PaypalClientService {
  private readonly logger = new Logger(PaypalClientService.name);
  private readonly apiBase = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
  private readonly clientId = process.env.PAYPAL_CLIENT_ID;
  private readonly clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  // Pas de cache de token ici (chaque appel en redemande un) : volume trop
  // faible pour que ça compte (un paiement en ligne = 2 appels PayPal max),
  // et ça évite toute la complexité d'un cache qui expire pendant qu'une
  // requête est en cours.
  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants — voir backend/.env',
      );
    }
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(`${this.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Échec OAuth2 PayPal (${res.status}): ${body}`);
      throw new Error("Impossible d'obtenir un token PayPal");
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async createOrder(params: {
    amount: string;
    currency: string;
    customId: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<PaypalCreateOrderResponse> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: params.customId,
            amount: { currency_code: params.currency, value: params.amount },
          },
        ],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          user_action: 'PAY_NOW',
          brand_name: 'Brocaramilou',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    const data = (await res.json()) as PaypalCreateOrderResponse;
    if (!res.ok) {
      this.logger.error(`Échec création commande PayPal (${res.status}): ${JSON.stringify(data)}`);
      throw new Error('Impossible de créer la commande PayPal');
    }
    return data;
  }

  // Ne lève pas d'exception sur un échec de capture (commande déjà capturée,
  // refusée, etc.) — PaymentsService interprète juste `status` du retour et
  // marque le paiement FAILED si ce n'est pas "COMPLETED", plutôt que de
  // faire remonter une 500 générique au client.
  async captureOrder(paypalOrderId: string): Promise<PaypalCaptureResponse> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = (await res.json()) as PaypalCaptureResponse;
    if (!res.ok) {
      this.logger.error(`Échec capture PayPal (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }
}
