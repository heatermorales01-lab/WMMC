import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const schedules = await (prisma as any).paymentSchedule.findMany({
      where: { projectId: params.id },
      orderBy: { orden: 'asc' as const },
    });
    return NextResponse.json({ ok: true, data: schedules });
  } catch (e) { return handleError(e); }
});

export const POST = withBlockTrabajador(async (req, { params }) => {
  try {
    const { cuotas } = await req.json();
    await (prisma as any).paymentSchedule.deleteMany({ where: { projectId: params.id } });
    const created = await (prisma as any).paymentSchedule.createMany({
      data: cuotas.map((c: any, i: number) => ({
        projectId: params.id,
        descripcion: c.descripcion,
        porcentaje: c.porcentaje,
        fechaEstimada: c.fechaEstimada ? new Date(c.fechaEstimada) : null,
        pagado: false,
        orden: i + 1,
      })),
    });
    return NextResponse.json({ ok: true, data: created });
  } catch (e) { return handleError(e); }
});
