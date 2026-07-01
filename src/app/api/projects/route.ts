import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

const PROJECT_INCLUDE = {
  client: true,
  quotations: { orderBy: { version: 'desc' as const } },
  productionStages: { orderBy: { createdAt: 'asc' as const } },
  sale: true,
  calendarEvents: true,
  _count: { select: { quotations: true, payments: true, projectFiles: true } },
};

export const GET = withAuth(async () => {
  try {
    const projects = await prisma.project.findMany({
      include: { client: true, sale: true, _count: { select: { quotations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, data: projects });
  } catch (e) { return handleError(e); }
});

export const POST = withBlockTrabajador(async (req) => {
  try {
    const { clientId, nombreProyecto, ubicacion, descripcion, fechaInstalacionTentativa } = await req.json();
    if (!clientId || !nombreProyecto) throw new AppError('clientId y nombreProyecto son requeridos', 400);

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new AppError('Cliente no encontrado', 404);

    const project = await prisma.project.create({
      data: {
        clientId,
        nombreProyecto,
        ubicacion,
        descripcion,
        fechaInstalacionTentativa: fechaInstalacionTentativa ? new Date(fechaInstalacionTentativa) : null,
        productionStages: {
          create: [
            { nombre: 'Diseño', orden: 1 },
            { nombre: 'Producción', orden: 2 },
            { nombre: 'Acabados', orden: 3 },
            { nombre: 'Instalación', orden: 4 },
          ],
        },
      },
      include: PROJECT_INCLUDE,
    });
    return NextResponse.json({ ok: true, data: project }, { status: 201 });
  } catch (e) { return handleError(e); }
});
