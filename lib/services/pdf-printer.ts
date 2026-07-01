// @ts-ignore
import PdfMake from 'pdfmake/build/pdfmake.js';
import fs from 'fs';
import path from 'path';

// vfs_fonts en esta versión exporta directamente el objeto { 'Roboto-Regular.ttf': '...' }
const vfs = require('pdfmake/build/vfs_fonts') as Record<string, string>;

// ─── Logo de la empresa (base64, cacheado) ─────────────
let logoCache: string | null = null;
export function getLogoBase64(): string | null {
  if (logoCache !== null) return logoCache;
  try {
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    const buffer = fs.readFileSync(logoPath);
    logoCache = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export function createPrinter(): any {
  return new (PdfMake as any)({
    Roboto: {
      normal:      Buffer.from(vfs['Roboto-Regular.ttf'],       'base64'),
      bold:        Buffer.from(vfs['Roboto-Medium.ttf'],        'base64'),
      italics:     Buffer.from(vfs['Roboto-Italic.ttf'],        'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'],  'base64'),
    },
  });
}

export function buildPdfBuffer(printer: any, docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
