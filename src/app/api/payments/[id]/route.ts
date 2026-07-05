import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
    try {

        const payment = await prisma.payment.findUnique({
            where: {
                id: params.id,
            },
            include: {
                receipt: true,
            },
        });

        if (!payment) {
            throw new AppError('Pago no encontrado', 404);
        }

        // Eliminar primero el recibo
        if (payment.receipt) {
            await prisma.receipt.delete({
                where: {
                    id: payment.receipt.id,
                },
            });
        }

        // Luego eliminar el pago
        await prisma.payment.delete({
            where: {
                id: payment.id,
            },
        });

        return NextResponse.json({
            ok: true,
            message: 'Pago eliminado correctamente',
        });

    } catch (e) {
        return handleError(e);
    }
});