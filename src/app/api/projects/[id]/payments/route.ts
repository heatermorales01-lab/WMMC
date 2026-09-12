import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { withAdmin } from '@/lib/auth';

export const GET = withBlockTrabajador(async (_req, { params }) => {
    try {
        // Obtener la venta del proyecto
        const sale = await prisma.sale.findFirst({
            where: {
                projectId: params.id,
            },
        });

        // Obtener todos los pagos del proyecto
        const payments = await prisma.payment.findMany({
            where: {
                projectId: params.id,
            },
            include: {
                receipt: true,
                _count: { select: { receiptFiles: true } },
            },
            orderBy: {
                fechaPago: 'desc',
            },
        });

        // Obtener información del proyecto
        const project = await prisma.project.findUnique({
            where: {
                id: params.id,
            },
            select: {
                nombreProyecto: true,
                client: {
                    select: {
                        nombre: true,
                    },
                },
            },
        });

        // Si aún no existe una venta
        if (!sale) {
            return NextResponse.json({
                ok: true,
                data: {
                    payments: [],
                    resumen: {
                        totalVenta: 0,
                        totalPagado: 0,
                        saldo: 0,
                    },
                    project,
                },
            });
        }

        const totalPagado = payments.reduce(
            (acc, pago) => acc + Number(pago.monto),
            0
        );

        const saldo = Number(sale.total ?? 0) - totalPagado;

        return NextResponse.json({
            ok: true,
            data: {
                payments,
                resumen: {
                    totalVenta: Number(sale.total ?? 0),
                    totalPagado,
                    saldo,
                },
                project,
            },
        });
    } catch (e) {
        return handleError(e);
    }

});

export const DELETE = withAdmin(async (_req, { params }) => {

    const payment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: {
            receipt: true
        }
    });

    if (!payment) {
        return NextResponse.json(
            { error: "Pago no encontrado" },
            { status: 404 }
        );
    }

    await prisma.$transaction(async (tx) => {

        if (payment.receipt) {

            await tx.receipt.delete({
                where: {
                    id: payment.receipt.id
                }
            });

        }

        await tx.payment.delete({
            where: {
                id: payment.id
            }
        });

    });

    return NextResponse.json({
        ok: true
    });

});