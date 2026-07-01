import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withAuth(async (_req, { params }) => {
  try {
    const files = await (prisma as any).projectFile.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' as const },
    });
    return NextResponse.json({ ok: true, data: files });
  } catch (e) { return handleError(e); }
});

// File upload uses FormData — Next.js handles this natively
export const POST = withAuth(async (req, { params }, user) => {
  try {
    const formData = await req.formData();
    const file = formData.get('archivo') as File | null;
    const tipo = formData.get('tipo') as string || 'OTRO';

    if (!file) return NextResponse.json({ ok: false, error: 'No se recibió archivo' }, { status: 400 });

    // In production use Supabase Storage — for now save metadata only
    // TODO: integrate Supabase Storage upload here
    const bytes = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;

    // Write to /tmp for local dev (not persistent in serverless)
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(bytes));

    const projectFile = await (prisma as any).projectFile.create({
      data: {
        projectId: params.id,
        nombreArchivo: file.name,
        urlArchivo: `/uploads/${filename}`,
        tipo,
        subidoPor: user.userId,
      },
    });
    return NextResponse.json({ ok: true, data: projectFile }, { status: 201 });
  } catch (e) { return handleError(e); }
});
