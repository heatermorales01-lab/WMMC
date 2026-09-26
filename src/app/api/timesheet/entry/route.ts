import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    startOfDay,
    endOfDay,
    getFase,
    now,
} from '@/lib/timesheet-helpers';
import { validarUbicacionTaller } from '@/lib/geofence';

export const POST = withAuth(async (req, _ctx, user) => {
    try {
        const { lat, lng } = await req.json().catch(() => ({}));
        const ubicacion = validarUbicacionTaller(lat, lng);
        if (!ubicacion.ok) throw new AppError(ubicacion.mensaje!, 403);

        const current = now();

        console.log("====================================");
        console.log("Hora servidor:", new Date());
        console.log("Hora Costa Rica:", current);
        console.log("ISO:", current.toISOString());
        console.log("Locale CR:", current.toLocaleString("es-CR"));
        console.log("Inicio día:", startOfDay(current).toISOString());
        console.log("Fin día:", endOfDay(current).toISOString());
        console.log("====================================");

        const todayStart = startOfDay(current);
        const todayEnd = endOfDay(current);

        const existing = await (prisma as any).timesheetEntry.findFirst({
            where: {
                userId: user.userId,
                fecha: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                horaSalida: null,
            },
        });

        if (existing) {
            throw new AppError("Ya tienes una jornada abierta hoy.", 409);
        }

        const entry = await (prisma as any).timesheetEntry.create({
            data: {
                userId: user.userId,
                fecha: todayStart,
                horaEntrada: current,
            },
        });
        console.log("Registro guardado:");
        console.log(entry);


        return NextResponse.json(
            {
                ok: true,
                data: {
                    ...entry,
                    fase: getFase(entry),
                },
                message: "Entrada registrada",
            },
            { status: 201 }
        );

    } catch (e) {
        return handleError(e);
    }
});