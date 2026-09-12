import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase';
import { PAYMENT_RECEIPTS_BUCKET } from '@/lib/payment-receipts-storage';

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
  try {
    const file = await (prisma as any).paymentReceiptFile.findUnique({ where: { id: params.fileId } });
    if (!file) throw new AppError('Archivo no encontrado', 404);

    await supabaseAdmin.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([file.storagePath]);
    await (prisma as any).paymentReceiptFile.delete({ where: { id: params.fileId } });

    return NextResponse.json({ ok: true, message: 'Archivo eliminado' });
  } catch (e) { return handleError(e); }
});
