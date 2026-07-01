import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withAdmin(async () => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: roles });
  } catch (e) { return handleError(e); }
});
