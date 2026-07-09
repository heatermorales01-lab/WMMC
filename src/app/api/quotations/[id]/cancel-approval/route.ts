import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const POST = withBlockTrabajador(async (_req, { params }) => {
    try {
        await prisma.$transaction(async (tx) => {

            // Buscar la cotización
            const quotation = await tx.quotation.findUnique({
                where: { id: params.id },
            });

            if (!quotation) {
                throw new AppError('Cotización no encontrada', 404);
            }

            if (quotation.estado !== 'APROBADA') {
                throw new AppError(
                    'Solo una cotización aprobada puede anularse.',
                    400
                );
            }

            // Buscar la venta asociada
            const sale = await tx.sale.findFirst({
                where: {
                    quotationId: quotation.id,
                },
            });

            if (sale) {

                // Buscar todos los pagos del proyecto
                const payments = await tx.payment.findMany({
                    where: {
                        projectId: quotation.projectId,
                    },
                    include: {
                        receipt: true,
                    },
                });

                // Eliminar primero los recibos
                for (const payment of payments) {
                    if (payment.receipt) {
                        await tx.receipt.delete({
                            where: {
                                id: payment.receipt.id,
                            },
                        });
                    }
                }

                // Luego eliminar los pagos
                await tx.payment.deleteMany({
                    where: {
                        projectId: quotation.projectId,
                    },
                });

                // Eliminar plan de pagos
                await tx.paymentSchedule.deleteMany({
                    where: {
                        projectId: quotation.projectId,
                    },
                });

                // Eliminar venta
                await tx.sale.delete({
                    where: {
                        id: sale.id,
                    },
                });
            }

            // Volver la cotización a borrador
            await tx.quotation.update({
                where: {
                    id: quotation.id,
                },
                data: {
                    estado: 'BORRADOR',
                },
            });

            // Volver el proyecto a cotización
            await tx.project.update({
                where: {
                    id: quotation.projectId,
                },
                data: {
                    estado: 'COTIZACION',
                },
            });

        });

        return NextResponse.json({
            ok: true,
            message: 'La aprobación fue anulada correctamente.',
        });

    } catch (e) {
        return handleError(e);
    }
});