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