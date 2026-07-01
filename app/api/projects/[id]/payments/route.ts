import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const sale = await (prisma as any).sale.findFirst({
      where: { projectId: params.id },
      include: {
        payments: {
          include: { receipt: true },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { nombreProyecto: true, client: { select: { nombre: true } } },
    });

    if (!sale) {
      return NextResponse.json({ ok: true, data: { sale: null, payments: [], project } });
    }

    const totalPagado = sale.payments.reduce((acc: number, p: any) => acc + Number(p.monto), 0);
    const saldo = Number(sale.total) - totalPagado;

    return NextResponse.json({
      ok: true,
      data: { sale, payments: sale.payments, totalPagado, saldo, project },
    });
  } catch (e) { return handleError(e); }
});
