import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

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

export const POST = withAdmin(async (req) => {
  try {
    const { furnitureTypeId, materialId, precio, precioBase210, costoExtraCm } = await req.json();
    const record = await (prisma as any).materialFurniturePrice.upsert({
      where: { furnitureTypeId_materialId: { furnitureTypeId, materialId } },
      update: { precio, precioBase210, costoExtraCm },
      create: { furnitureTypeId, materialId, precio, precioBase210, costoExtraCm },
      include: { furnitureType: true, material: true },
    });
    return NextResponse.json({ ok: true, data: record });
  } catch (e) { return handleError(e); }
});
