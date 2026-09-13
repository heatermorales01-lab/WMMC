import { supabaseAdmin } from '@/lib/supabase';

// Bucket dedicado y PRIVADO para respaldos de comprobantes de pago
// (distinto de "project-files", que hoy es público). Se usa un bucket
// separado justo por eso: acá no queremos URLs públicas, porque son
// documentos financieros de clientes.
export const PAYMENT_RECEIPTS_BUCKET = process.env.SUPABASE_RECEIPTS_BUCKET || 'payment-receipts';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

let bucketEnsured = false;

// Crea el bucket si no existe todavía. Idempotente: si ya existe, Supabase
// devuelve un error que ignoramos. Así no depende de un paso manual en el
// dashboard — se autoconfigura la primera vez que alguien sube un archivo.
export async function ensureReceiptsBucket() {
  if (bucketEnsured) return;

  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === PAYMENT_RECEIPTS_BUCKET);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(PAYMENT_RECEIPTS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    // Si otro request ya lo creó justo antes (condición de carrera), ignorar.
    if (error && !/already exists/i.test(error.message)) throw error;
  }

  bucketEnsured = true;
}

export function isAllowedReceiptFile(file: File) {
  return ALLOWED_MIME_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE_BYTES;
}

export const RECEIPT_MAX_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
export const RECEIPT_ALLOWED_TYPES_LABEL = 'JPG, PNG, WEBP o HEIC';
