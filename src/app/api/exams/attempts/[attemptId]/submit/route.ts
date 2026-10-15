import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { preguntasQueCuentan, puntajeMaximoExamen, requiereRevisionManual, sumarPuntaje } from '@/lib/exam-helpers';

// POST — envía el examen: autocalifica las preguntas de selección única,
// deja las abiertas pendientes, y decide si el intento puede cerrarse
// solo (REVISADO automático, solo posible si no hay preguntas abiertas
// ni preguntas marcadas como críticas de seguridad en ninguna sección que
// cuente para la nota) o si debe esperar a un administrador (EN_REVISION).
export const POST = withAuth(async (_req, { params }, user) => {
  try {
    const attempt = await (prisma as any).examAttempt.findUnique({
      where: { id: params.attemptId },
      include: { respuestas: true },
    });
    if (!attempt) throw new AppError('Intento no encontrado', 404);
    if (attempt.workerId !== user.userId) throw new AppError('Sin permiso', 403);
    if (attempt.estado !== 'EN_PROGRESO') throw new AppError('Este examen ya fue enviado', 409);

    const exam = await (prisma as any).exam.findUnique({
      where: { id: attempt.examId },
      include: { secciones: { include: { preguntas: { include: { opciones: true } } } } },
    });
    if (!exam) throw new AppError('Examen no encontrado', 404);

    const respuestasPorPregunta = new Map(attempt.respuestas.map((r: any) => [r.questionId, r]));
    const preguntas = preguntasQueCuentan(exam.secciones);

    await (prisma as any).$transaction(async (tx: any) => {
      for (const p of preguntas) {
        const r: any = respuestasPorPregunta.get(p.id);

        if (p.tipo === 'SELECCION_UNICA') {
          const opcionCorrecta = p.opciones.find((o: any) => o.esCorrecta);
          const acertó = !!r?.opcionId && r.opcionId === opcionCorrecta?.id;
          const data = {
            attemptId: params.attemptId,
            questionId: p.id,
            opcionId: r?.opcionId || null,
            puntajeObtenido: acertó ? Number(p.puntaje) : 0,
            calificada: true,
          };
          await tx.examAnswer.upsert({
            where: { attemptId_questionId: { attemptId: params.attemptId, questionId: p.id } },
            update: data,
            create: data,
          });
        } else if (!r) {
          // Pregunta abierta sin ninguna respuesta guardada — se crea el
          // registro igual (vacío) para que aparezca en la revisión como
          // "sin responder" y el admin pueda calificarla con 0.
          await tx.examAnswer.create({
            data: { attemptId: params.attemptId, questionId: p.id, textoRespuesta: null, calificada: false },
          });
        }
      }
    });

    const respuestasActualizadas = await (prisma as any).examAnswer.findMany({ where: { attemptId: params.attemptId } });
    const mapaRespuestas = new Map(respuestasActualizadas.map((r: any) => [r.questionId, r]));

    const puntajeAutomatico = sumarPuntaje(exam.secciones, mapaRespuestas as any, 'SELECCION_UNICA');
    const necesitaRevision = requiereRevisionManual(exam.secciones, mapaRespuestas as any);
    const puntajeMaximo = puntajeMaximoExamen(exam.secciones);

    const dataFinal: any = {
      estado: necesitaRevision ? 'EN_REVISION' : 'REVISADO',
      fechaEnvio: new Date(),
      puntajeAutomatico,
      puntajeMaximo,
    };
    if (!necesitaRevision) {
      dataFinal.puntajeManual = 0;
      dataFinal.notaFinal = puntajeAutomatico;
      dataFinal.fechaRevision = new Date();
    }

    await (prisma as any).examAttempt.update({ where: { id: params.attemptId }, data: dataFinal });

    return NextResponse.json({
      ok: true,
      data: { estado: dataFinal.estado },
      message: necesitaRevision
        ? 'Examen enviado. Quedó pendiente de revisión del administrador.'
        : `Examen enviado y calificado automáticamente: ${puntajeAutomatico}/${puntajeMaximo}`,
    });
  } catch (e) { return handleError(e); }
});
