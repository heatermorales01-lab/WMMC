import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { generateReceiptPDF } from '@/lib/services/receipt-pdf.service';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const receipt = await (prisma as any).receipt.findFirst({
      where: { paymentId: params.id },
      include: {
        payment: {
          include: {
            sale: {
              include: {
                project: { include: { client: true } },
                quotation: true,
              },
            },
          },
        },
      },
    });
    if (!receipt) throw new AppError('Recibo no encontrado', 404);
    const buffer = await generateReceiptPDF(receipt as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Recibo-${receipt.numeroRecibo}.pdf"`,
      },
    });
  } catch (e) { return handleError(e); }
});
