import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// PUT — edita una pregunta. Para SELECCION_UNICA, reemplaza por completo
// el set de opciones con el que llega en el body (más simple y menos
// propenso a errores que tratar de diferenciar cuáles cambiaron).
export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { tipo, enunciado, puntaje, guiaEvaluador, criticaSeguridad, opciones, orden } = await req.json();

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

    const question = await (prisma as any).$transaction(async (tx: any) => {
      if (tipo === 'SELECCION_UNICA') {
        await tx.examOption.deleteMany({ where: { questionId: params.questionId } });
      }
      return tx.examQuestion.update({
        where: { id: params.questionId },
        data: {
          tipo,
          enunciado: enunciado.trim(),
          puntaje: Number(puntaje),
          guiaEvaluador: guiaEvaluador || null,
          criticaSeguridad: !!criticaSeguridad,
          ...(orden != null ? { orden: Number(orden) } : {}),
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
            : { opciones: { deleteMany: {} } }),
        },
        include: { opciones: true },
      });
    });

    return NextResponse.json({ ok: true, data: question, message: 'Pregunta actualizada' });
  } catch (e) { return handleError(e); }
});

// DELETE — borra la pregunta (y en cascada sus opciones/respuestas).
export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    await (prisma as any).examQuestion.delete({ where: { id: params.questionId } });
    return NextResponse.json({ ok: true, message: 'Pregunta eliminada' });
  } catch (e) { return handleError(e); }
});
