import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withAuth(async () => {
  try {
    const materials = await prisma.material.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: materials });
  } catch (e) { return handleError(e); }
});
