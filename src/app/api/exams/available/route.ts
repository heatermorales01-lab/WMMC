import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

// GET — exámenes publicados (activo: true) más, por cada uno, el último
// intento de ESTE trabajador (o null si nunca lo ha tomado). Es lo que
// alimenta la pantalla "Mis exámenes".
export const GET = withAuth(async (_req, _ctx, user) => {
  try {
    const exams = await (prisma as any).exam.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
      include: {
        secciones: { include: { preguntas: { select: { id: true, puntaje: true } } } },
      },
    });

    const misIntentos = await (prisma as any).examAttempt.findMany({
      where: { workerId: user.userId, examId: { in: exams.map((e: any) => e.id) } },
      orderBy: { fechaCreacion: 'desc' },
    });

    const data = exams.map((e: any) => {
      const puntajeMaximo = e.secciones
        .filter((s: any) => !s.opcional)
        .reduce((acc: number, s: any) => acc + s.preguntas.reduce((a: number, p: any) => a + Number(p.puntaje), 0), 0);
      const ultimoIntento = misIntentos.find((a: any) => a.examId === e.id) || null;
      return {
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        duracionMinutos: e.duracionMinutos,
        puntajeMaximo,
        puedeReintentar: !!ultimoIntento?.reintentoAutorizado,
        ultimoIntento: ultimoIntento
          ? {
              id: ultimoIntento.id,
              estado: ultimoIntento.estado,
              fechaCreacion: ultimoIntento.fechaCreacion,
              fechaEnvio: ultimoIntento.fechaEnvio,
              fechaRevision: ultimoIntento.fechaRevision,
              notaFinal: ultimoIntento.estado === 'REVISADO' ? ultimoIntento.notaFinal : null,
              puntajeMaximo: ultimoIntento.puntajeMaximo,
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) { return handleError(e); }
});
