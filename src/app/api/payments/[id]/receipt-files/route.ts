import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ensureReceiptsBucket,
  isAllowedReceiptFile,
  PAYMENT_RECEIPTS_BUCKET,
  RECEIPT_ALLOWED_TYPES_LABEL,
  RECEIPT_MAX_SIZE_MB,
} from '@/lib/payment-receipts-storage';

// Firma cada URL bajo demanda (bucket privado, sin URLs públicas) con
// vencimiento corto — no se guardan URLs firmadas en la base de datos.
const SIGNED_URL_TTL_SECONDS = 60 * 5;

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const files = await (prisma as any).paymentReceiptFile.findMany({
      where: { paymentId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    const withUrls = await Promise.all(
      files.map(async (f: any) => {
        const { data } = await supabaseAdmin.storage
          .from(PAYMENT_RECEIPTS_BUCKET)
          .createSignedUrl(f.storagePath, SIGNED_URL_TTL_SECONDS);
        return { ...f, url: data?.signedUrl || null };
      })
    );

    return NextResponse.json({ ok: true, data: withUrls });
  } catch (e) { return handleError(e); }
});

export const POST = withBlockTrabajador(async (req, { params }, user) => {
  try {
    const payment = await (prisma as any).payment.findUnique({
      where: { id: params.id },
      include: { project: { select: { clientId: true } } },
    });
    if (!payment) throw new AppError('Pago no encontrado', 404);

    const formData = await req.formData();
    const file = formData.get('archivo') as File | null;
    if (!file) throw new AppError('No se recibió archivo', 400);

    if (!isAllowedReceiptFile(file)) {
      throw new AppError(
        `Archivo inválido. Solo se aceptan imágenes (${RECEIPT_ALLOWED_TYPES_LABEL}) de hasta ${RECEIPT_MAX_SIZE_MB}MB`,
        400
      );
    }

    await ensureReceiptsBucket();

    const extension = file.name.split('.').pop();
    const storagePath = `${params.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PAYMENT_RECEIPTS_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const receiptFile = await (prisma as any).paymentReceiptFile.create({
      data: {
        paymentId: params.id,
        clientId: payment.project?.clientId || null,
        storagePath,
        nombreArchivo: file.name,
        mimeType: file.type,
        subidoPor: user.userId,
      },
    });

    const { data: signed } = await supabaseAdmin.storage
      .from(PAYMENT_RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    return NextResponse.json({ ok: true, data: { ...receiptFile, url: signed?.signedUrl || null } }, { status: 201 });
  } catch (e) { return handleError(e); }
});
