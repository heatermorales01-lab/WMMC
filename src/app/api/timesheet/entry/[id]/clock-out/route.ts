import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    getFase,
    calcularHorasPagas,
    getMinutosPermitidos,
    now,
} from '@/lib/timesheet-helpers';
import { validarUbicacionTallerMultiple } from '@/lib/geofence';
export const PATCH = withAuth(async (req, { params }, user) => {
    try {
        const { observaciones, muestras } = await req.json().catch(() => ({}));
        const ubicacion = validarUbicacionTallerMultiple(muestras);
            if (!ubicacion.ok) throw new AppError(ubicacion.mensaje!, 403);

        const entry = await (prisma as any).timesheetEntry.findUnique({
            where: { id: params.id }
        });

        if (!entry) throw new AppError('Registro no encontrado', 404);

        if (entry.userId !== user.userId && user.roleName !== 'ADMINISTRADOR')
            throw new AppError('Sin permiso', 403);

        if (entry.horaSalida)
            throw new AppError('La salida ya fue registrada', 409);

        if (getFase(entry) !== 'TRABAJANDO')
            throw new AppError('Hay un descanso en curso. Finalízalo primero.', 409);

        const current = now();

        const minutosPermitidos = await getMinutosPermitidos();

        const { horas, minutosExcedentes } = calcularHorasPagas(
            {
                ...entry,
                horaSalida: current,
            },
            minutosPermitidos
        );

        const updated = await (prisma as any).timesheetEntry.update({
            where: { id: params.id },
            data: {
                horaSalida: current,
                horasTrabajadas: horas,
                minutosExcedentes,
                observaciones,
            },
        });

        return NextResponse.json({
            ok: true,
            data: {
                ...updated,
                fase: 'FINALIZADO',
            },
            message: `Salida registrada. Total horas: ${horas}`,
        });

    } catch (e) {
        return handleError(e);
    }
});