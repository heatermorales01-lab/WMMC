import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// POST — agrega una pregunta a una sección. Para SELECCION_UNICA, el
// body trae `opciones: [{ texto, esCorrecta }]` y se crean junto con la
// pregunta en una sola operación.
export const POST = withAdmin(async (req, { params }) => {
  try {
    const { tipo, enunciado, puntaje, guiaEvaluador, criticaSeguridad, opciones } = await req.json();

    if (!enunciado?.trim()) throw new AppError('El enunciado es obligatorio', 400);
    if (tipo !== 'SELECCION_UNICA' && tipo !== 'ABIERTA') throw new AppError('Tipo de pregunta inválido', 400);
    if (!puntaje || Number(puntaje) <= 0) throw new AppError('El puntaje debe ser mayor a 0', 400);

    if (tipo === 'SELECCION_UNICA') {
      if (!Array.isArray(opciones) || opciones.length < 2) {
        throw new AppError('Una pregunta de selección única necesita al menos 2 opciones', 400);
      }
      if (!opciones.some((o: any) => o.esCorrecta)) {
        throw new AppError('Debes marcar cuál opción es la correcta', 400);
      }
    }

    const section = await (prisma as any).examSection.findUnique({ where: { id: params.sectionId } });
    if (!section) throw new AppError('Sección no encontrada', 404);

    const ultima = await (prisma as any).examQuestion.findFirst({
      where: { sectionId: params.sectionId },
      orderBy: { orden: 'desc' },
    });

    const question = await (prisma as any).examQuestion.create({
      data: {
        sectionId: params.sectionId,
        tipo,
        enunciado: enunciado.trim(),
        puntaje: Number(puntaje),
        guiaEvaluador: guiaEvaluador || null,
        criticaSeguridad: !!criticaSeguridad,
        orden: (ultima?.orden ?? -1) + 1,
        ...(tipo === 'SELECCION_UNICA'
          ? {
              opciones: {
                create: opciones.map((o: any, i: number) => ({
                  texto: String(o.texto || '').trim(),
                  esCorrecta: !!o.esCorrecta,
                  orden: i,
                })),
              },
            }
          : {}),
      },
      include: { opciones: true },
    });

    return NextResponse.json({ ok: true, data: question, message: 'Pregunta agregada' }, { status: 201 });
  } catch (e) { return handleError(e); }
});
