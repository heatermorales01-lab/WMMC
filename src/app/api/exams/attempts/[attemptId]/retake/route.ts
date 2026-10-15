import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// Valida que el intento sea REVISADO y el último de ese trabajador en ese
// examen (si ya hay uno posterior, la autorización ya no tiene sentido).
async function cargarIntentoAutorizable(attemptId: string) {
  const attempt = await (prisma as any).examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new AppError('Intento no encontrado', 404);
  if (attempt.estado !== 'REVISADO') throw new AppError('Solo se puede autorizar un nuevo intento sobre un examen ya revisado', 409);
  const posterior = await (prisma as any).examAttempt.findFirst({
    where: { examId: attempt.examId, workerId: attempt.workerId, fechaCreacion: { gt: attempt.fechaCreacion } },
    select: { id: true },
  });
  if (posterior) throw new AppError('El trabajador ya inició un intento posterior', 409);
  return attempt;
}

// POST — el administrador autoriza que el trabajador vuelva a tomar el examen.
export const POST = withAdmin(async (_req, { params }) => {
  try {
    await cargarIntentoAutorizable(params.attemptId);
    await (prisma as any).examAttempt.update({ where: { id: params.attemptId }, data: { reintentoAutorizado: true } });
    return NextResponse.json({ ok: true, message: 'Nuevo intento autorizado' });
  } catch (e) { return handleError(e); }
});

// DELETE — el administrador revoca la autorización (si el trabajador aún no lo inició).
export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    await cargarIntentoAutorizable(params.attemptId);
    await (prisma as any).examAttempt.update({ where: { id: params.attemptId }, data: { reintentoAutorizado: false } });
    return NextResponse.json({ ok: true, message: 'Autorización revocada' });
  } catch (e) { return handleError(e); }
});
