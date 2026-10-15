import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { puntajeMaximoExamen } from '@/lib/exam-helpers';

// Deja la estructura del examen lista para el trabajador: SIN `esCorrecta`
// en las opciones y SIN `guiaEvaluador` en las preguntas. Esta función es
// la única puerta por la que la clave de respuestas podría filtrarse, así
// que cualquier cambio aquí hay que revisarlo con cuidado.
function sanitizarParaTrabajador(exam: any) {
  return {
    id: exam.id,
    nombre: exam.nombre,
    descripcion: exam.descripcion,
    instrucciones: exam.instrucciones,
    duracionMinutos: exam.duracionMinutos,
    secciones: exam.secciones.map((s: any) => ({
      id: s.id,
      nombre: s.nombre,
      opcional: s.opcional,
      preguntas: s.preguntas.map((p: any) => ({
        id: p.id,
        tipo: p.tipo,
        enunciado: p.enunciado,
        puntaje: p.puntaje,
        opciones: p.opciones.map((o: any) => ({ id: o.id, texto: o.texto })),
      })),
    })),
  };
}

// GET — estructura del examen (sanitizada) + el intento EN_PROGRESO más
// reciente de este trabajador para este examen, si existe, con sus
// respuestas ya guardadas (para poder retomarlo donde quedó).
export const GET = withAuth(async (_req, { params }, user) => {
  try {
    const exam = await (prisma as any).exam.findUnique({
      where: { id: params.id },
      include: {
        secciones: {
          orderBy: { orden: 'asc' },
          include: { preguntas: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' } } } } },
        },
      },
    });
    if (!exam || !exam.activo) throw new AppError('Examen no disponible', 404);

    const intentoAbierto = await (prisma as any).examAttempt.findFirst({
      where: { examId: params.id, workerId: user.userId, estado: 'EN_PROGRESO' },
      include: { respuestas: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      data: {
        exam: sanitizarParaTrabajador(exam),
        intento: intentoAbierto
          ? {
              id: intentoAbierto.id,
              puesto: intentoAbierto.puesto,
              respuestas: intentoAbierto.respuestas.map((r: any) => ({
                questionId: r.questionId,
                opcionId: r.opcionId,
                textoRespuesta: r.textoRespuesta,
              })),
            }
          : null,
      },
    });
  } catch (e) { return handleError(e); }
});

// POST — inicia un intento nuevo, o retoma el EN_PROGRESO si ya existe
// (para que recargar la página o perder conexión a mitad del examen no
// cree un segundo intento). Si ya hay uno ENVIADO/EN_REVISION pendiente
// de que el admin lo revise, no deja empezar otro.
export const POST = withAuth(async (req, { params }, user) => {
  try {
    const { puesto } = await req.json().catch(() => ({}));

    const exam = await (prisma as any).exam.findUnique({
      where: { id: params.id },
      include: { secciones: { include: { preguntas: true } } },
    });
    if (!exam || !exam.activo) throw new AppError('Examen no disponible', 404);

    const existente = await (prisma as any).examAttempt.findFirst({
      where: { examId: params.id, workerId: user.userId, estado: { in: ['EN_PROGRESO', 'ENVIADO', 'EN_REVISION'] } },
      orderBy: { fechaCreacion: 'desc' },
    });

    if (existente) {
      if (existente.estado === 'EN_PROGRESO') {
        return NextResponse.json({ ok: true, data: { id: existente.id }, message: 'Continuando intento en curso' });
      }
      throw new AppError('Ya tienes un intento enviado pendiente de revisión para este examen', 409);
    }

    const attempt = await (prisma as any).examAttempt.create({
      data: {
        examId: params.id,
        workerId: user.userId,
        puesto: puesto || null,
        puntajeMaximo: puntajeMaximoExamen(exam.secciones),
      },
    });

    return NextResponse.json({ ok: true, data: { id: attempt.id }, message: 'Examen iniciado' }, { status: 201 });
  } catch (e) { return handleError(e); }
});
