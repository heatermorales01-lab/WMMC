import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase';

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

        const file = formData.get("archivo") as File | null;
        const tipo = (formData.get("tipo") as string) || "OTRO";

        if (!file) {
            return NextResponse.json(
                { ok: false, error: "No se recibió archivo" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();

        const extension = file.name.split(".").pop();

        const filename = `${params.id}/${Date.now()}.${extension}`;

        const { error } = await supabaseAdmin.storage
            .from("project-files")
            .upload(filename, Buffer.from(bytes), {
                contentType: file.type,
                upsert: false,
            });

        if (error) throw error;

        const { data } = supabaseAdmin.storage
            .from("project-files")
            .getPublicUrl(filename);

        const projectFile = await (prisma as any).projectFile.create({
            data: {
                projectId: params.id,
                nombreArchivo: file.name,
                urlArchivo: data.publicUrl,
                tipo,
                subidoPor: user.userId,
            },
        });

        return NextResponse.json(
            {
                ok: true,
                data: projectFile,
            },
            { status: 201 }
        );
    } catch (e) {
        return handleError(e);
    }
});
