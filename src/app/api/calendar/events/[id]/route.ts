import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAuth(async (req, { params }, user) => {
  try {
    const { titulo, descripcion, fecha, tipo, projectId } = await req.json();
    const event = await (prisma as any).calendarEvent.findUnique({ where: { id: params.id } });
    if (!event) throw new AppError('Evento no encontrado', 404);
    if (user.roleName !== 'ADMINISTRADOR' && event.createdById !== user.userId) {
      throw new AppError('No tenés permiso para editar este evento', 403);
    }
    const updated = await (prisma as any).calendarEvent.update({
      where: { id: params.id },
      data: {
        titulo: titulo?.trim() ?? event.titulo,
        descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : event.descripcion,
        fecha: fecha ? new Date(fecha) : event.fecha,
        tipo: tipo ?? event.tipo,
        projectId: projectId !== undefined ? (projectId || null) : event.projectId,
      },
      include: { project: { select: { id: true, nombreProyecto: true } }, createdBy: { select: { nombre: true } } },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  try {
    const event = await (prisma as any).calendarEvent.findUnique({ where: { id: params.id } });
    if (!event) throw new AppError('Evento no encontrado', 404);
    if (user.roleName !== 'ADMINISTRADOR' && event.createdById !== user.userId) {
      throw new AppError('No tenés permiso para eliminar este evento', 403);
    }
    await (prisma as any).calendarEvent.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Evento eliminado' });
  } catch (e) { return handleError(e); }
});
