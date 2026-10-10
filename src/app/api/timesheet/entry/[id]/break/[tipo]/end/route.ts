import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    getFase,
    BREAK_FIELDS,
    diffMinutes,
    getMinutosPermitidos,
    now,
} from '@/lib/timesheet-helpers';
import { validarUbicacionTallerMultiple } from '@/lib/geofence';

export const PATCH = withAuth(async (req, { params }, user) => {
    try {
        const { muestras } = await req.json().catch(() => ({}));
        const ubicacion = await validarUbicacionTallerMultiple(muestras);
        if (!ubicacion.ok) throw new AppError(ubicacion.mensaje!, 403);

        const fields = BREAK_FIELDS[params.tipo]; if (!fields) throw new AppError('Tipo de descanso inválido', 400);
        const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
        if (!entry) throw new AppError('Registro no encontrado', 404);
        if (entry.userId !== user.userId && user.roleName !== 'ADMINISTRADOR') throw new AppError('Sin permiso', 403);
        if (!entry[fields.start]) throw new AppError(`${fields.label} no había sido iniciado`, 409);
        if (entry[fields.end]) throw new AppError(`${fields.label} ya fue finalizado`, 409);
        const updated = await (prisma as any).timesheetEntry.update({ where: { id: params.id }, data: { [fields.end]: now() } });
        const minutosPermitidos = await getMinutosPermitidos();
        const dur = Math.round(diffMinutes(new Date(updated[fields.start]), new Date(updated[fields.end])));
        const perm = minutosPermitidos[params.tipo.toUpperCase()] ?? 0;
        const exc = Math.max(0, dur - perm);
        const msg = exc > 0 ? `${fields.label} finalizado — ${dur} min (${exc} min adicionales registrados)` : `${fields.label} finalizado — ${dur} min`;
        return NextResponse.json({ ok: true, data: { ...updated, fase: getFase(updated) }, message: msg });
    } catch (e) { return handleError(e); }
});