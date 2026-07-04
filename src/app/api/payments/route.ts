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

        if (!projectId || !monto) {
            throw new AppError("projectId y monto son requeridos", 400);
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
