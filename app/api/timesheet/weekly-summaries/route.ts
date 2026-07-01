import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const where: any = userId ? { userId } : {};
    const summaries = await (prisma as any).weeklyTimesheetSummary.findMany({
      where,
      include: { user: { select: { nombre: true, correo: true } } },
      orderBy: { semanaInicio: 'desc' },
    });
    return NextResponse.json({ ok: true, data: summaries });
  } catch (e) { return handleError(e); }
});
