import { Controller, Get, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('invoices')
@UseGuards(KeycloakAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':commandeId/download')
  async download(
    @Param('commandeId', ParseIntPipe) commandeId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const commande = await this.invoicesService.getFactureData(commandeId, user);
    const doc = this.invoicesService.buildPdf(commande);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=facture-${commande.facture!.numeroFacture}.pdf`,
    );

    doc.pipe(res);
    doc.end();

    await this.invoicesService.markPrinted(commande.facture!.idFacture);
  }
}
