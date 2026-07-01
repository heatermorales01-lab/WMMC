import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const PATCH = withAuth(async (req, { params }) => {
  try {
    const { estado } = await req.json();
    const project = await prisma.project.update({ where: { id: params.id }, data: { estado } });
    return NextResponse.json({ ok: true, data: project });
  } catch (e) { return handleError(e); }
});
