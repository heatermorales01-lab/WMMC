import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const PATCH = withAuth(async (req, { params }) => {
    try {

        const {
            estado,
            fechaInicio,
            fechaFin,
        } = await req.json();

        const stage = await prisma.productionStage.update({
            where: {
                id: params.stageId,
            },
            data: {
                estado,
                fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
                fechaFin: fechaFin ? new Date(fechaFin) : undefined,
            },
        });

        return NextResponse.json({
            ok: true,
            data: stage,
        });

    } catch (e) {
        return handleError(e);
    }
});