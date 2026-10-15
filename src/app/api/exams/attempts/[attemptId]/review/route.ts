import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// GET — detalle completo de un intento para la pantalla de revisión del
// administrador: trae la estructura del examen CON la clave de
// respuestas y la guía del evaluador, más las respuestas del trabajador
// ya emparejadas pregunta por pregunta.
export const GET = withAdmin(async (_req, { params }) => {
  try {
    const attempt = await (prisma as any).examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        exam: {
          include: {
            secciones: {
              orderBy: { orden: 'asc' },
              include: { preguntas: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' } } } } },
            },
          },
        },
        worker: { select: { nombre: true, correo: true } },
        evaluador: { select: { nombre: true } },
        respuestas: true,
      },
    });
    if (!attempt) throw new AppError('Intento no encontrado', 404);

    const posterior = await (prisma as any).examAttempt.findFirst({
      where: { examId: attempt.examId, workerId: attempt.workerId, fechaCreacion: { gt: attempt.fechaCreacion } },
      select: { id: true },
    });
    const esUltimo = !posterior;

    const respuestasPorPregunta = new Map(attempt.respuestas.map((r: any) => [r.questionId, r]));

    const secciones = attempt.exam.secciones.map((s: any) => ({
      id: s.id,
      nombre: s.nombre,
      opcional: s.opcional,
      preguntas: s.preguntas.map((p: any) => {
        const r: any = respuestasPorPregunta.get(p.id);
        return {
          id: p.id,
          tipo: p.tipo,
          enunciado: p.enunciado,
          puntaje: p.puntaje,
          criticaSeguridad: p.criticaSeguridad,
          guiaEvaluador: p.guiaEvaluador,
          opciones: p.opciones.map((o: any) => ({ id: o.id, texto: o.texto, esCorrecta: o.esCorrecta })),
          respuesta: r
            ? {
                opcionId: r.opcionId,
                textoRespuesta: r.textoRespuesta,
                puntajeObtenido: r.puntajeObtenido,
                observacionEvaluador: r.observacionEvaluador,
                calificada: r.calificada,
              }
            : null,
        };
      }),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        id: attempt.id,
        examNombre: attempt.exam.nombre,
        estado: attempt.estado,
        trabajador: attempt.worker.nombre,
        correo: attempt.worker.correo,
        puesto: attempt.puesto,
        fechaCreacion: attempt.fechaCreacion,
        fechaEnvio: attempt.fechaEnvio,
        fechaRevision: attempt.fechaRevision,
        evaluador: attempt.evaluador?.nombre || null,
        puntajeAutomatico: attempt.puntajeAutomatico,
        puntajeManual: attempt.puntajeManual,
        puntajeMaximo: attempt.puntajeMaximo,
        notaFinal: attempt.notaFinal,
        resultadoPractica: attempt.resultadoPractica,
        observacionesPractica: attempt.observacionesPractica,
        observacionesEvaluador: attempt.observacionesEvaluador,
        reintentoAutorizado: attempt.reintentoAutorizado,
        esUltimo: esUltimo,
        secciones,
      },
    });
  } catch (e) { return handleError(e); }
});
