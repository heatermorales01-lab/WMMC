import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase';
import { PAYMENT_RECEIPTS_BUCKET } from '@/lib/payment-receipts-storage';

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
    try {

        const payment = await prisma.payment.findUnique({
            where: {
                id: params.id,
            },
            include: {
                receipt: true,
                receiptFiles: true,
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

        // Eliminar del bucket los archivos de respaldo del comprobante
        // (las filas de PaymentReceiptFile se eliminan solas por el
        // onDelete: Cascade del schema, pero los objetos en Storage no).
        if (payment.receiptFiles.length > 0) {
            await supabaseAdmin.storage
                .from(PAYMENT_RECEIPTS_BUCKET)
                .remove(payment.receiptFiles.map((f) => f.storagePath));
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