import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE, recalcularTotalesCotizacion } from '@/lib/quotation-helpers';

export const GET = withBlockTrabajador(async () => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: QUOTATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, data: quotations });
  } catch (e) { return handleError(e); }
});

export const POST = withBlockTrabajador(async (req, _ctx, user) => {
  try {
    const { projectId } = await req.json();
    if (!projectId) throw new AppError('projectId es requerido', 400);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Proyecto no encontrado', 404);

    const lastVersion = await prisma.quotation.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    const quotation = await prisma.quotation.create({
      data: { projectId, version: (lastVersion?.version ?? 0) + 1 },
      include: QUOTATION_INCLUDE,
    });
    return NextResponse.json({ ok: true, data: quotation }, { status: 201 });
  } catch (e) { return handleError(e); }
});
