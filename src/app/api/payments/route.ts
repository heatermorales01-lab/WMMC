import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const POST = withBlockTrabajador(async (req, _ctx, user) => {
  try {
    const { projectId, monto, observaciones, comprobanteUrl } = await req.json();
    if (!projectId || !monto) throw new AppError('projectId y monto son requeridos', 400);

    const sale = await (prisma as any).sale.findFirst({ where: { projectId } });
    if (!sale) throw new AppError('Este proyecto no tiene una venta activa. Aprobá una cotización primero.', 400);

    const payment = await (prisma as any).payment.create({
      data: { saleId: sale.id, monto: Number(monto), observaciones, comprobanteUrl, registradoPor: user.userId },
    });

    const numeroRecibo = `REC-${Date.now().toString().slice(-8)}`;
    const receipt = await (prisma as any).receipt.create({
      data: {
        paymentId: payment.id,
        numeroRecibo,
        fechaGeneracion: new Date(),
        montoPagado: Number(monto),
        concepto: observaciones || 'Pago de proyecto',
      },
    });

    return NextResponse.json({ ok: true, data: { payment, receipt } }, { status: 201 });
  } catch (e) { return handleError(e); }
});
