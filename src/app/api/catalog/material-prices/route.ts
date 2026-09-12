import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const GET = withAuth(async () => {
  try {
    const prices = await (prisma as any).materialFurniturePrice.findMany({
      include: { furnitureType: true, material: true },
    });
    prices.sort((a: any, b: any) => {
      const ft = (a.furnitureType?.nombre || '').localeCompare(b.furnitureType?.nombre || '');
      if (ft !== 0) return ft;
      return (a.material?.nombre || '').localeCompare(b.material?.nombre || '');
    });
    return NextResponse.json({ ok: true, data: prices });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { furnitureTypeId, materialId, precio, precioBase210, costoExtraCm } = await req.json();

    const before = await (prisma as any).materialFurniturePrice.findUnique({
      where: { furnitureTypeId_materialId: { furnitureTypeId, materialId } },
    });

    const record = await (prisma as any).materialFurniturePrice.upsert({
      where: { furnitureTypeId_materialId: { furnitureTypeId, materialId } },
      update: { precio, precioBase210, costoExtraCm },
      create: { furnitureTypeId, materialId, precio, precioBase210, costoExtraCm },
      include: { furnitureType: true, material: true },
    });

    await logCatalogChange({
      userId: user.userId,
      modulo: 'PRECIOS',
      accion: before ? 'EDITAR' : 'CREAR',
      entidadId: record.id,
      entidadNombre: `${record.furnitureType?.nombre || ''} × ${record.material?.nombre || ''}`,
      valorAnterior: before ? { precio: before.precio, precioBase210: before.precioBase210, costoExtraCm: before.costoExtraCm } : null,
      valorNuevo: { precio: record.precio, precioBase210: record.precioBase210, costoExtraCm: record.costoExtraCm },
    });

    return NextResponse.json({ ok: true, data: record });
  } catch (e) { return handleError(e); }
});
