import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE } from '@/lib/quotation-helpers';
import { generateQuotationPDF } from '@/lib/services/quotation-pdf.service';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: params.id }, include: QUOTATION_INCLUDE });
    if (!q) throw new AppError('Cotización no encontrada', 404);
      const buffer = await generateQuotationPDF({
          quotation: q as any,
      });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Cotizacion-v${q.version}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (e) { return handleError(e); }
});
