import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    startOfDay,
    endOfDay,
    getFase,
    getCostaRicaDate,
} from '@/lib/timesheet-helpers';

export const POST = withAuth(async (_req, _ctx, user) => {
    try {

        const now = getCostaRicaDate();

        console.log("====================================");
        console.log("Hora servidor:", new Date());
        console.log("Hora Costa Rica:", now);
        console.log("ISO:", now.toISOString());
        console.log("Locale CR:", now.toLocaleString("es-CR"));
        console.log("Inicio día:", startOfDay(now).toISOString());
        console.log("Fin día:", endOfDay(now).toISOString());
        console.log("====================================");

        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

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
                horaEntrada: now,
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