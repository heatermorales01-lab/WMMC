import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

const TIPOS_EVENTO = ['MEDICION', 'TALLER', 'REUNION', 'OTRO'];
const AUDIENCIAS = [
    'TODOS',
    'ADMIN',
    'ADMIN_EMPLEADOS',
    'ADMIN_TRABAJADORES',
];

export const GET = withAuth(async (_req, _ctx, user) => {
  try {
      const isAdmin = user.roleName === 'ADMINISTRADOR';
      const isEmpleado = user.roleName === 'EMPLEADO';
      const isTrabajador = user.roleName === 'TRABAJADOR';

    const projects = await prisma.project.findMany({
      where: { fechaInstalacionTentativa: { not: null }, estado: { notIn: ['FINALIZADO', 'CANCELADO'] } },
      select: { id: true, nombreProyecto: true, estado: true, fechaInstalacionTentativa: true, client: { select: { nombre: true } } },
    });

      const customEvents = await (prisma as any).calendarEvent.findMany({
          where: isAdmin
              ? {}
              : {
                  OR: [
                      { createdById: user.userId },
                      { audiencia: 'TODOS' },

                      ...(isEmpleado
                          ? [{ audiencia: 'ADMIN_EMPLEADOS' }]
                          : []),

                      ...(isTrabajador
                          ? [{ audiencia: 'ADMIN_TRABAJADORES' }]
                          : []),
                  ],
              },

          include: {
              project: {
                  select: {
                      id: true,
                      nombreProyecto: true,
                  },
              },
              createdBy: {
                  select: {
                      nombre: true,
                  },
              },
          },

          orderBy: {
              fecha: 'asc',
          },
      });

    //let schedules: any[] = [];
    //if (isAdmin) {
    //  schedules = await (prisma as any).paymentSchedule.findMany({
    //    where: { fechaEstimada: { not: null }, pagado: false },
    //    select: {
    //      id: true, descripcion: true, porcentaje: true, fechaEstimada: true,
    //      project: { select: { id: true, nombreProyecto: true, client: { select: { nombre: true } }, sale: { select: { total: true } } } },
    //    },
    //  });
    //}


    const events = [
      ...projects.map((p: any) => ({
        id: `install-${p.id}`, type: 'INSTALACION', title: `Instalación: ${p.nombreProyecto}`,
        date: p.fechaInstalacionTentativa, projectId: p.id, clientName: p.client?.nombre, estado: p.estado, editable: false,
      })),
      //...schedules.map((s: any) => {
      //  const monto = s.project?.sale?.total && s.porcentaje ? (Number(s.project.sale.total) * Number(s.porcentaje)) / 100 : null;
      //  return {
      //    id: `payment-${s.id}`, type: 'COBRO', title: `Cobro (${s.descripcion || 'Cuota'}): ${s.project?.nombreProyecto}`,
      //    date: s.fechaEstimada, projectId: s.project?.id, clientName: s.project?.client?.nombre,
      //    porcentaje: s.porcentaje ? Number(s.porcentaje) : null, monto, editable: false,
      //  };
      //}),
      ...customEvents.map((e: any) => ({
        id: `custom-${e.id}`, dbId: e.id, type: e.tipo, title: e.titulo, description: e.descripcion,
        date: e.fecha, projectId: e.projectId, projectName: e.project?.nombreProyecto,
        createdBy: e.createdBy.nombre, editable: true,
      })),
    ];

    return NextResponse.json({ ok: true, data: events });
  } catch (e) { return handleError(e); }
});

export const POST = withAuth(async (req, _ctx, user) => {
  try {
      const {
          titulo,
          descripcion,
          fecha,
          tipo,
          projectId,
          audiencia,
      } = await req.json();

    if (!titulo?.trim()) throw new AppError('El título es requerido', 400);
    if (!fecha) throw new AppError('La fecha es requerida', 400);
      if (!TIPOS_EVENTO.includes(tipo)) throw new AppError('Tipo inválido', 400);
      if (!AUDIENCIAS.includes(audiencia))
          throw new AppError('Audiencia inválida', 400);

    const event = await (prisma as any).calendarEvent.create({
        data: {
            titulo: titulo.trim(),
            descripcion: descripcion?.trim() || null,
            fecha: new Date(fecha),
            tipo,
            audiencia,
            projectId: projectId || null,
            createdById: user.userId,
        },
      include: { project: { select: { id: true, nombreProyecto: true } }, createdBy: { select: { nombre: true } } },
    });
    return NextResponse.json({ ok: true, data: event }, { status: 201 });
  } catch (e) { return handleError(e); }
});
