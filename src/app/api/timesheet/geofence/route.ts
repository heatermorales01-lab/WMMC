import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { geofenceActivo } from '@/lib/geofence';

// GET — cualquier usuario autenticado puede consultar si la comprobación
// de ubicación está activa.
export const GET = withAuth(async () => {
    try {
        const activo = await geofenceActivo();
        return NextResponse.json({ ok: true, data: { activo } });
    } catch (e) { return handleError(e); }
});

// PUT — solo el administrador puede activar/desactivar la comprobación.
// Pensado para los días en que el GPS del taller falla: en vez de que
// nadie pueda marcar, la admin la desactiva temporalmente desde la app.
export const PUT = withAdmin(async (req) => {
    try {
        const { activo } = await req.json();
        if (typeof activo !== 'boolean') {
            throw new AppError('activo debe ser true o false', 400);
        }
        const existing = await (prisma as any).geofenceConfig.findFirst();
        const config = existing
            ? await (prisma as any).geofenceConfig.update({ where: { id: existing.id }, data: { activo } })
            : await (prisma as any).geofenceConfig.create({ data: { activo } });
        return NextResponse.json({
            ok: true,
            data: { activo: config.activo },
            message: activo ? 'Comprobación de ubicación activada' : 'Comprobación de ubicación desactivada',
        });
    } catch (e) { return handleError(e); }
});