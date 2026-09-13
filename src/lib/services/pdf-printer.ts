// @ts-ignore
import PdfPrinter from 'pdfmake';
import fs from 'fs';
import path from 'path';

// ─── Fuente ────────────────────────────────────────────
// Se usa DejaVu Sans en vez de la Roboto que trae pdfmake por defecto:
// la Roboto embebida en pdfmake NO incluye el glifo del símbolo
// colón costarricense ₡ (U+20A1) — se confirmó que el carácter no
// existe en esa fuente (glyph id 0 / .notdef), por eso se veía roto
// en los PDFs. DejaVu Sans sí tiene ese glifo y es de uso libre
// (dominio público / licencia Bitstream Vera).
// Los .ttf viven en /public/fonts para poder leerlos con fs en el
// entorno serverless de Vercel (igual que ya se hace con el logo).
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');

// ─── Logo de la empresa (base64, cacheado) ─────────────
let logoCache: string | null = null;

export function getLogoBase64(): string | null {
    if (logoCache !== null) return logoCache;

    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');

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
    const getFont = (filename: string) => fs.readFileSync(path.join(FONT_DIR, filename));

    return new (PdfPrinter as any)({
        DejaVuSans: {
            normal: getFont("DejaVuSans.ttf"),
            bold: getFont("DejaVuSans-Bold.ttf"),
            italics: getFont("DejaVuSans-Oblique.ttf"),
            bolditalics: getFont("DejaVuSans-BoldOblique.ttf"),
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
