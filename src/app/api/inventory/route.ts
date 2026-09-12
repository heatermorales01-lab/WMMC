import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logInventoryMovement } from '@/lib/audit';

export const GET = withAuth(async () => {
    try {
        const items = await prisma.inventoryItem.findMany({
            orderBy: { nombre: 'asc' },
        });

        const lowStockCount = items.filter(
            (i) => Number(i.stockActual) <= Number(i.stockMinimo)
        ).length;

        return NextResponse.json({
            ok: true,
            data: {
                items,
                lowStockCount,
            },
        });
    } catch (e) {
        return handleError(e);
    }
});

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
      const {
          nombre,
          categoria,
          unidadMedida,
          stockActual,
          stockMinimo,
      } = await req.json();

      if (!nombre) {
          throw new AppError('nombre es requerido', 400);
      }

      const item = await prisma.inventoryItem.create({
          data: {
              nombre,
              categoria,
              unidadMedida,
              stockActual: Number(stockActual) || 0,
              stockMinimo: Number(stockMinimo) || 0,
          },
      });

      await logInventoryMovement({
        userId: user.userId,
        itemId: item.id,
        itemNombre: item.nombre,
        tipoMovimiento: 'CREAR',
        detalle: { stockActual: item.stockActual, stockMinimo: item.stockMinimo },
      });

    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (e) { return handleError(e); }
});
