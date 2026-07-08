import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase';

export const DELETE = withAuth(async (_req, { params }) => {
    try {

        const file = await (prisma as any).projectFile.findUnique({
            where: {
                id: params.fileId,
            },
        });

        if (!file) {
            throw new AppError("Archivo no encontrado", 404);
        }

        const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

        // Obtener la ruta interna del archivo dentro del bucket
        const marker = `/storage/v1/object/public/${bucket}/`;
        const storagePath = file.urlArchivo.split(marker)[1];

        if (storagePath) {
            const { error } = await supabaseAdmin.storage
                .from(bucket)
                .remove([storagePath]);

            if (error) {
                throw error;
            }
        }

        await (prisma as any).projectFile.delete({
            where: {
                id: params.fileId,
            },
        });

        return NextResponse.json({
            ok: true,
            message: "Archivo eliminado",
        });

    } catch (e) {
        return handleError(e);
    }
});