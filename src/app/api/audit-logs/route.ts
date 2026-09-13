import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

// tipo=catalogo|inventario|horario, más filtros comunes: usuario, desde, hasta
export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'catalogo';
    const userId = searchParams.get('userId') || undefined;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const dateFilter = (desde || hasta) ? {
      createdAt: {
        ...(desde ? { gte: new Date(desde) } : {}),
        ...(hasta ? { lte: new Date(hasta + 'T23:59:59') } : {}),
      },
    } : {};

    if (tipo === 'inventario') {
      const logs = await (prisma as any).inventoryAuditLog.findMany({
        where: { ...(userId ? { userId } : {}), ...dateFilter },
        include: { user: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      return NextResponse.json({ ok: true, data: logs });
    }

    if (tipo === 'horario') {
      const logs = await (prisma as any).timesheetAuditLog.findMany({
        where: { ...(userId ? { adminId: userId } : {}), ...dateFilter },
        include: {
          admin: { select: { nombre: true } },
          trabajador: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      return NextResponse.json({ ok: true, data: logs });
    }

    // catálogo (default)
    const logs = await (prisma as any).catalogAuditLog.findMany({
      where: { ...(userId ? { userId } : {}), ...dateFilter },
      include: { user: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ ok: true, data: logs });
  } catch (e) { return handleError(e); }
});
