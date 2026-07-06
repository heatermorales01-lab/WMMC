import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin, withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

const PROJECT_INCLUDE = {
  client: true,
  quotations: { orderBy: { version: 'desc' as const } },
  productionStages: { orderBy: { createdAt: 'asc' as const } },
  sale: true,
  _count: { select: { quotations: true, payments: true, projectFiles: true } },
};

export const GET = withAuth(async (_req, { params }) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: params.id }, include: PROJECT_INCLUDE });
    if (!project) throw new AppError('Proyecto no encontrado', 404);
    return NextResponse.json({ ok: true, data: project });
  } catch (e) { return handleError(e); }
});

export const PUT = withAuth(async (req, { params }) => {
  try {
    const { nombreProyecto, ubicacion, descripcion, fechaInstalacionTentativa } = await req.json();
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { nombreProyecto, ubicacion, descripcion, fechaInstalacionTentativa: fechaInstalacionTentativa ? new Date(fechaInstalacionTentativa) : null },
      include: PROJECT_INCLUDE,
    });
    return NextResponse.json({ ok: true, data: project });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
    try {
        await prisma.$transaction(async (tx: any) => {

            const project = await tx.project.findUnique({
                where: { id: params.id },
                include: {
                    sale: true,
                },
            });

            if (!project) {
                throw new AppError('Proyecto no encontrado', 404);
            }

            // Obtener pagos del proyecto
            const payments = await tx.payment.findMany({
                where: {
                    projectId: params.id,
                },
                include: {
                    receipt: true,
                },
            });

            // Eliminar recibos
            for (const payment of payments) {
                if (payment.receipt) {
                    await tx.receipt.delete({
                        where: { id: payment.receipt.id },
                    });
                }
            }

            // Eliminar pagos
            await tx.payment.deleteMany({
                where: {
                    projectId: params.id,
                },
            });

            // Eliminar plan de pagos
            await tx.paymentSchedule.deleteMany({
                where: {
                    projectId: params.id,
                },
            });

            // Eliminar venta (si existe)
            if (project.sale) {
                await tx.sale.delete({
                    where: {
                        id: project.sale.id,
                    },
                });
            }

            // Eliminar cotizaciones
            const quotations = await tx.quotation.findMany({
                where: { projectId: params.id },
            });

            for (const q of quotations) {
                const items = await tx.quotationItem.findMany({
                    where: { quotationId: q.id },
                });

                for (const item of items) {
                    await tx.quotationItemExtra.deleteMany({
                        where: { quotationItemId: item.id },
                    });
                }

                await tx.quotationItem.deleteMany({
                    where: { quotationId: q.id },
                });

                await tx.quotationService.deleteMany({
                    where: { quotationId: q.id },
                });

                await tx.quotation.delete({
                    where: { id: q.id },
                });
            }

            // Eliminar producción, archivos, calendario y proyecto
            await tx.productionStage.deleteMany({
                where: { projectId: params.id },
            });

            await tx.projectFile.deleteMany({
                where: { projectId: params.id },
            });

            await tx.calendarEvent.deleteMany({
                where: { projectId: params.id },
            });

            await tx.project.delete({
                where: { id: params.id },
            });

        });

        return NextResponse.json({
            ok: true,
            message: 'Proyecto eliminado',
        });

    } catch (e) {
        return handleError(e);
    }
});
