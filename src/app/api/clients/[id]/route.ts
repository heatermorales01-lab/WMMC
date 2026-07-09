import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { projects: { include: { _count: { select: { quotations: true } } } } },
    });
    if (!client) throw new AppError('Cliente no encontrado', 404);
    return NextResponse.json({ ok: true, data: client });
  } catch (e) { return handleError(e); }
});

export const PUT = withBlockTrabajador(async (req, { params }) => {
  try {
    const { nombre, telefono, correo, direccion } = await req.json();
    const client = await prisma.client.update({ where: { id: params.id }, data: { nombre, telefono, correo, direccion } });
    return NextResponse.json({ ok: true, data: client });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
    try {
        const projects = await prisma.project.count({
            where: {
                clientId: params.id,
            },
        });

        if (projects > 0) {
            throw new AppError(
                'No se puede eliminar este cliente porque tiene proyectos asociados.',
                400
            );
        }

        await prisma.client.delete({
            where: {
                id: params.id,
            },
        });

        return NextResponse.json({
            ok: true,
            message: 'Cliente eliminado',
        });

    } catch (e) {
        return handleError(e);
    }
});
