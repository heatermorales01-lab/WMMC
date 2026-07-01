import { prisma } from '@/lib/prisma';

export const QUOTATION_INCLUDE = {
  project: {
    include: {
      client: true,
    },
  },
  quotationItems: {
    include: {
      furnitureType: true,
      material: true,
      countertopType: true,
      quotationItemExtras: {
        include: { extra: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  quotationServices: {
    include: { service: true },
  },
};

export async function recalcularTotalesCotizacion(tx: any, quotationId: string): Promise<void> {
  const quotation = await tx.quotation.findUnique({
    where: { id: quotationId },
    select: { incluirIva: true, descuento: true },
  });

  const items = await tx.quotationItem.findMany({ where: { quotationId }, select: { subtotal: true } });
  const services = await tx.quotationService.findMany({ where: { quotationId }, select: { subtotal: true } });

  const subtotalItems = items.reduce((acc: number, i: any) => acc + Number(i.subtotal || 0), 0);
  const subtotalServices = services.reduce((acc: number, s: any) => acc + Number(s.subtotal || 0), 0);
  const subtotalGeneral = subtotalItems + subtotalServices;

  const descuento = Number(quotation?.descuento ?? 0);
  const subtotalConDescuento = Math.max(0, subtotalGeneral - descuento);
  const incluirIva = quotation?.incluirIva ?? false;
  const ivaMonto = incluirIva ? subtotalConDescuento * 0.13 : 0;
  const total = subtotalConDescuento + ivaMonto;

  await tx.quotation.update({
    where: { id: quotationId },
    data: { subtotal: subtotalItems, ivaMonto, total },
  });
}
