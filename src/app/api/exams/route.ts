import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// GET — lista de exámenes (plantillas) para el panel de administrador:
// constructor + estado de publicación. Incluye conteo de secciones/
// preguntas y de intentos para que el admin vea de un vistazo qué
// exámenes están en uso.
export const GET = withAdmin(async () => {
  try {
    const exams = await (prisma as any).exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creador: { select: { nombre: true } },
        secciones: { include: { preguntas: { select: { id: true, puntaje: true } } } },
        _count: { select: { intentos: true } },
      },
    });

    const data = exams.map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion,
      duracionMinutos: e.duracionMinutos,
      version: e.version,
      activo: e.activo,
      creador: e.creador?.nombre,
      createdAt: e.createdAt,
      totalSecciones: e.secciones.length,
      totalPreguntas: e.secciones.reduce((acc: number, s: any) => acc + s.preguntas.length, 0),
      puntajeMaximo: e.secciones.reduce((acc: number, s: any) => acc + s.preguntas.reduce((a: number, p: any) => a + Number(p.puntaje), 0), 0),
      totalIntentos: e._count.intentos,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (e) { return handleError(e); }
});

// POST — crea un examen nuevo, vacío (sin secciones todavía), como
// borrador (activo: false) para que el admin lo arme en el constructor
// antes de publicarlo.
export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { nombre, descripcion, instrucciones, duracionMinutos } = await req.json();
    if (!nombre?.trim()) throw new AppError('El nombre del examen es obligatorio', 400);

    const exam = await (prisma as any).exam.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        instrucciones: instrucciones || null,
        duracionMinutos: duracionMinutos ? Number(duracionMinutos) : null,
        createdById: user.userId,
      },
    });

    return NextResponse.json({ ok: true, data: exam, message: 'Examen creado como borrador' }, { status: 201 });
  } catch (e) { return handleError(e); }
});
