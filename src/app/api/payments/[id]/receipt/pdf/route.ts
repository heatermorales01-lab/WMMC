import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { generateReceiptPDF } from '@/lib/services/receipt-pdf.service';

export const GET = withBlockTrabajador(async (_req, { params }) => {
    try {

        const receipt = await prisma.receipt.findFirst({
            where: {
                paymentId: params.id,
            },
            include: {
                payment: {
                    include: {
                        project: {
                            include: {
                                client: true,
                                sale: true,
                            },
                        },
                    },
                },
            },
        });

        if (!receipt) {
            throw new AppError("Recibo no encontrado", 404);
        }

        const sale = await prisma.sale.findFirst({
            where: {
                projectId: receipt.payment.projectId,
            }
        });

        const pagos = await prisma.payment.findMany({
            where: {
                projectId: receipt.payment.projectId,
            }
        });

        const totalPagado = pagos.reduce(
            (a, p) => a + Number(p.monto),
            0
        );

        const saldo =
            Number(sale?.total ?? 0) - totalPagado;

        const pdf = await generateReceiptPDF({

            receipt: {
                numeroRecibo: receipt.numeroRecibo ?? "",
                fechaGeneracion: receipt.fechaGeneracion,
            },

            payment: {
                monto: Number(receipt.payment.monto),
                metodoPago: receipt.payment.metodoPago,
                comprobanteUrl: receipt.payment.comprobanteUrl,
                observaciones: receipt.payment.observaciones,
                fechaPago: receipt.payment.fechaPago,
            },

            project: {
                nombreProyecto: receipt.payment.project.nombreProyecto,
                ubicacion: receipt.payment.project.ubicacion,

                client: {
                    nombre: receipt.payment.project.client.nombre,
                    telefono: receipt.payment.project.client.telefono,
                    correo: receipt.payment.project.client.correo,
                },

                sale: {
                    total: Number(sale?.total ?? 0),
                },
            },

            totalPagado,
            saldo,

        });

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition":
                    `attachment; filename="${receipt.numeroRecibo}.pdf"`
            }
        });

    } catch (e: any) {

        console.error("=== ERROR PDF ===");
        console.error(e);

        return handleError(e);
    }
});