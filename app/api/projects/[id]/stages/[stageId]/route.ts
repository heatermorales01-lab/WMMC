import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const PATCH = withAuth(async (req, { params }) => {
  try {
    const { completado, notas } = await req.json();
    const stage = await (prisma as any).productionStage.update({
      where: { id: params.stageId },
      data: { completado, notas, fechaCompletado: completado ? new Date() : null },
    });
    return NextResponse.json({ ok: true, data: stage });
  } catch (e) { return handleError(e); }
});
