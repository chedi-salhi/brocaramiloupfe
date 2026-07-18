import { apiFetch } from "@/lib/api-client";
import type { Commande } from "@/lib/types";
import { OrderTracker } from "@/components/order-tracker";

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commande = await apiFetch<Commande>(`/orders/${id}`);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Commande #{commande.idCommande}</h1>
      <OrderTracker initialCommande={commande} />
    </div>
  );
}
