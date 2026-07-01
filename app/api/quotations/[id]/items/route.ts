import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE, recalcularTotalesCotizacion } from '@/lib/quotation-helpers';
import { calcularPrecioMueble } from '@/lib/services/quotation-engine.service';

export const POST = withBlockTrabajador(async (req, { params }) => {
  try {
    const {
      furnitureTypeId, materialId, countertopTypeId, descripcion, nombrePersonalizado, fondoPersonalizado,
      largo, alto, ancho, cantidad = 1, estiloDoble, tipoCajonEspecial, cascada, extras = [],
    } = await req.json();

    if (!furnitureTypeId || !materialId || !largo) {
      throw new AppError('furnitureTypeId, materialId y largo son requeridos', 400);
    }

    const quotationId = params.id;
    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!quotation) throw new AppError('Cotización no encontrada', 404);
    if (quotation.estado === 'APROBADA') throw new AppError('No se pueden modificar cotizaciones aprobadas', 400);

    const furnitureType = await prisma.furnitureType.findUnique({ where: { id: furnitureTypeId } });
    if (!furnitureType) throw new AppError('Tipo de mueble no encontrado', 404);

    const materialPrice = await (prisma as any).materialFurniturePrice.findUnique({
      where: { furnitureTypeId_materialId: { furnitureTypeId, materialId } },
    });

    const precioBase = materialPrice ? Number(materialPrice.precio) : Number(furnitureType.precioBase);
    const precioBase210 = materialPrice?.precioBase210 ? Number(materialPrice.precioBase210) : 0;
    const costoExtraCm = materialPrice?.costoExtraCm ? Number(materialPrice.costoExtraCm) : 0;

    let precioSobre = 0;
    if (countertopTypeId) {
      const countertop = await prisma.countertopType.findUnique({ where: { id: countertopTypeId } });
      if (!countertop) throw new AppError('Tipo de sobre no encontrado', 404);
      precioSobre = Number(countertop.precioM2);
    }

    const precioUnitario = calcularPrecioMueble({
      tipo: furnitureType.nombre, largo: Number(largo),
      alto: alto ? Number(alto) : 0, ancho: ancho ? Number(ancho) : 0,
      precioBase, precioSobre, precioBase210, costoExtraCm, estiloDoble, tipoCajonEspecial, cascada,
    });

    const subtotalMueble = precioUnitario * Number(cantidad);

    const extrasData: any[] = [];
    let subtotalExtras = 0;
    for (const ex of extras) {
      const extra = await prisma.extra.findUnique({ where: { id: ex.extraId } });
      if (!extra) continue;
      const subtotalExtra = Number(extra.precio) * Number(ex.cantidad);
      subtotalExtras += subtotalExtra;
      extrasData.push({ extraId: ex.extraId, cantidad: Number(ex.cantidad), subtotal: subtotalExtra });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.quotationItem.create({
        data: {
          quotationId, furnitureTypeId, materialId, countertopTypeId,
          descripcion, nombrePersonalizado: nombrePersonalizado || null,
          fondoPersonalizado: fondoPersonalizado || null,
          largo, alto, ancho, cantidad: Number(cantidad),
          precioUnitario, subtotal: subtotalMueble + subtotalExtras,
          quotationItemExtras: { create: extrasData },
        },
      });
      await recalcularTotalesCotizacion(tx, quotationId);
    });

    const updated = await prisma.quotation.findUnique({ where: { id: quotationId }, include: QUOTATION_INCLUDE });
    return NextResponse.json({ ok: true, data: updated }, { status: 201 });
  } catch (e) { return handleError(e); }
});
