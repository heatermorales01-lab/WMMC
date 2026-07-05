import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const POST = withBlockTrabajador(async (req) => {
    try {
        const {
            projectId,
            monto,
            observaciones,
            comprobanteUrl,
            metodoPago,
        } = await req.json();

        if (!projectId || monto === undefined || monto === null) {
            throw new AppError("projectId y monto son requeridos", 400);
        }

        if (Number(monto) <= 0) {
            throw new AppError(
                "El monto debe ser mayor que cero.",
                400
            );
        }

        const sale = await prisma.sale.findFirst({
            where: { projectId },
        });

        if (!sale) {
            throw new AppError(
                "Este proyecto no tiene una venta activa.",
                400
            );
        }

        // Calcular cuánto se ha pagado hasta el momento
        const pagosActuales = await prisma.payment.aggregate({
            where: {
                projectId,
            },
            _sum: {
                monto: true,
            },
        });

        const totalPagado = Number(pagosActuales._sum.monto ?? 0);
        const saldoPendiente = Number(sale.total) - totalPagado;

        // Validar que el monto no exceda el saldo
        if (Number(monto) > saldoPendiente) {
            throw new AppError(
                `El monto excede el saldo pendiente. Saldo disponible: ₡${saldoPendiente.toLocaleString('es-CR')}`,
                400
            );
        }

        const payment = await prisma.payment.create({
            data: {
                projectId,
                monto: Number(monto),
                metodoPago: metodoPago ?? "TRANSFERENCIA",
                observaciones,
                comprobanteUrl,
            },
        });

        const receipt = await prisma.receipt.create({
            data: {
                paymentId: payment.id,
                numeroRecibo: `REC-${Date.now().toString().slice(-8)}`,
            },
        });

        return NextResponse.json(
            {
                ok: true,
                data: { payment, receipt },
            },
            { status: 201 }
        );
    } catch (e: any) {

        console.error("=== ERROR PAYMENT ===");
        console.error(e);

        if (e.code) console.error("Code:", e.code);
        if (e.meta) console.error("Meta:", e.meta);

        return handleError(e);
    }
});
