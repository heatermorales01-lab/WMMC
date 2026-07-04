// @ts-ignore
import PdfPrinter from 'pdfmake';
import fs from 'fs';
import path from 'path';

// vfs_fonts en esta versión exporta directamente el objeto { 'Roboto-Regular.ttf': '...' }
const vfs = require('pdfmake/build/vfs_fonts') as Record<string, string>;

// ─── Logo de la empresa (base64, cacheado) ─────────────
let logoCache: string | null = null;

export function getLogoBase64(): string | null {
    if (logoCache !== null) return logoCache;

    try {
        const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo.png');

        if (!fs.existsSync(logoPath)) {
            logoCache = null;
            return null;
        }

        const buffer = fs.readFileSync(logoPath);

        logoCache = `data:image/png;base64,${buffer.toString('base64')}`;
        return logoCache;

    } catch (err) {
        console.error("Logo error:", err);
        logoCache = null;
        return null;
    }
}

export function createPrinter() {
    const vfsFonts = (vfs as any).pdfMake?.vfs || vfs;

    const getFont = (name: string) => {
        const font = vfsFonts[name];

        if (!font) {
            throw new Error(`Fuente no encontrada: ${name}`);
        }

        return Buffer.from(font, "base64");
    };

    return new (PdfPrinter as any)({
        Roboto: {
            normal: getFont("Roboto-Regular.ttf"),
            bold: getFont("Roboto-Medium.ttf"),
            italics: getFont("Roboto-Italic.ttf"),
            bolditalics: getFont("Roboto-MediumItalic.ttf"),
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
