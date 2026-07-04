/**
 * PDF de Recibo de Pago — WM Muebles Contemporáneos
 */
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { createPrinter, buildPdfBuffer, getLogoBase64 } from '@/lib/services/pdf-printer';
import { Prisma } from '@prisma/client';

const C = {
  primary:      '#d99c0b',
  primaryDark:  '#8a610a',
  white:        '#ffffff',
  slate900:     '#0f172a',
  slate700:     '#334155',
  slate500:     '#64748b',
  slate200:     '#e2e8f0',
  slate50:      '#f8fafc',
  success:      '#16a34a',
  successLight: '#dcfce7',
  danger:       '#dc2626',
};

function crc(v: number | string): string {
  const formatted = new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v));
  return '₡' + formatted;
}
function fdate(d?: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fdatetime(d?: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export interface ReceiptPDFData {
    receipt: {
        numeroRecibo: string;
        fechaGeneracion: Date;
    };

    payment: {
        monto: number;
        metodoPago: string;
        comprobanteUrl?: string | null;
        observaciones?: string | null;
        fechaPago: Date;
    };

    project: {
        nombreProyecto: string;
        ubicacion?: string | null;
        client: {
            nombre: string;
            telefono?: string | null;
            correo?: string | null;
        };
        sale?: {
            total: number;
        };
    };

    totalPagado: number;
    saldo: number;
}

export async function generateReceiptPDF(data: ReceiptPDFData): Promise<Buffer> {
  const { receipt, payment, project } = data;
  const { client } = project;
  const totalVenta   = Number(project.sale?.total || 0);
  const pct          = totalVenta > 0 ? Math.min(100, Math.round((data.totalPagado / totalVenta) * 100)) : 0;
  const barWidth     = 435; // ancho útil aprox en puntos
    const fillWidth = Math.max(pct > 0 ? 12 : 0, Math.round((barWidth * pct) / 100));
    const logo = getLogoBase64();


  const doc: any = {
    pageSize: 'LETTER',
    pageMargins: [60, 50, 60, 55],
    footer: (cur: number, total: number) => ({
      columns: [
        { text: 'WM Muebles Contemporáneos · Documento oficial de pago', fontSize: 7, color: C.slate500 },
        { text: `Pág ${cur}/${total}`, fontSize: 7, color: C.slate500, alignment: 'right' },
      ],
      margin: [60, 0],
    }),
    content: [
      // ── HEADER ──────────────────────────────────────
      {
        columns: [
          {
            stack: [
              // Logo + nombre empresa lado a lado
                  {
                      columns: [
                          ...(logo
                              ? [{
                                  image: logo,
                                  width: 55,
                                  margin: [0, 0, 12, 0],
                              }]
                              : []),
                  {
                    stack: [
                      { text: 'WM MUEBLES', fontSize: 20, bold: true, color: C.primary },
                      { text: 'CONTEMPORÁNEOS', fontSize: 10, bold: true, color: C.primaryDark, marginTop: 2 },
                      { text: 'Fabricación e instalación a medida', fontSize: 8, color: C.slate500, marginTop: 3 },
                    ],
                    width: '*',
                  },
                ],
                columnGap: 0,
              },
            ],
            width: '*',
          },
          {
            stack: [
              { text: 'RECIBO DE PAGO', fontSize: 13, bold: true, color: C.slate700, alignment: 'right' },
              { text: receipt.numeroRecibo, fontSize: 11, color: C.primary, bold: true, alignment: 'right', marginTop: 3 },
              { text: `Emitido: ${fdate(receipt.fechaGeneracion)}`, fontSize: 8, color: C.slate500, alignment: 'right', marginTop: 2 },
            ],
            width: 'auto',
          },
        ],
        columnGap: 20,
        marginBottom: 18,
      },

      // ── SELLO DE PAGO ────────────────────────────────
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            {
              stack: [
                { text: '✓  PAGO RECIBIDO', fontSize: 15, bold: true, color: C.success },
                { text: fdatetime(payment.fechaPago), fontSize: 9, color: C.slate700, marginTop: 4 },
              ],
              border: [false, false, false, false],
              fillColor: C.successLight,
              margin: [14, 12, 0, 12],
            },
            {
              stack: [
                { text: crc(payment.monto), fontSize: 22, bold: true, color: C.success, alignment: 'right' },
                { text: payment.metodoPago, fontSize: 9, color: C.slate500, alignment: 'right', marginTop: 3 },
              ],
              border: [false, false, false, false],
              fillColor: C.successLight,
              margin: [0, 12, 14, 12],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 1.5, vLineWidth: () => 0,
          hLineColor: () => C.success,
        },
        marginBottom: 20,
      },

      // ── CLIENTE Y PROYECTO ───────────────────────────
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'CLIENTE', fontSize: 8, bold: true, color: C.primary, marginBottom: 4 },
              { text: client.nombre, fontSize: 11, bold: true },
              ...(client.telefono ? [{ text: `Tel: ${client.telefono}`, fontSize: 9, color: C.slate700, lineHeight: 1.4 }] : []),
              ...(client.correo   ? [{ text: client.correo, fontSize: 9, color: C.slate700, lineHeight: 1.4 }] : []),
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'PROYECTO', fontSize: 8, bold: true, color: C.primary, marginBottom: 4 },
              { text: project.nombreProyecto, fontSize: 11, bold: true },
              ...(project.ubicacion ? [{ text: project.ubicacion, fontSize: 9, color: C.slate700 }] : []),
            ],
          },
        ],
        marginBottom: 18,
      },

      // ── DETALLE DEL PAGO ─────────────────────────────
      { text: 'DETALLE DEL PAGO', fontSize: 8, bold: true, color: C.primary, marginBottom: 6 },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Monto pagado',    fontSize: 9, color: C.slate500 }, { text: crc(payment.monto), fontSize: 9, bold: true, alignment: 'right' }],
            [{ text: 'Método de pago',  fontSize: 9, color: C.slate500 }, { text: payment.metodoPago, fontSize: 9, alignment: 'right' }],
            ...(payment.comprobanteUrl ? [[{ text: 'Comprobante', fontSize: 9, color: C.slate500 }, { text: payment.comprobanteUrl, fontSize: 8, alignment: 'right', color: C.slate700 }]] : []),
            ...(payment.observaciones  ? [[{ text: 'Observaciones', fontSize: 9, color: C.slate500 }, { text: payment.observaciones, fontSize: 9, alignment: 'right' }]] : []),
          ],
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0,
          hLineColor: () => C.slate200,
          paddingTop: () => 7, paddingBottom: () => 7,
          paddingLeft: () => 0, paddingRight: () => 0,
        },
        marginBottom: 18,
      },

      // ── RESUMEN FINANCIERO ───────────────────────────
      { text: 'RESUMEN DE CUENTA', fontSize: 8, bold: true, color: C.primary, marginBottom: 6 },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Total del proyecto',        fontSize: 10, color: C.slate700 }, { text: crc(totalVenta),        fontSize: 10, bold: true, alignment: 'right' }],
            [{ text: 'Total pagado a la fecha',   fontSize: 10, color: C.slate700 }, { text: crc(data.totalPagado),  fontSize: 10, bold: true, color: C.success, alignment: 'right' }],
            [
              { text: 'Saldo pendiente', fontSize: 10, bold: data.saldo > 0, color: data.saldo > 0 ? C.danger : C.slate700 },
              { text: crc(data.saldo),  fontSize: 10, bold: true, color: data.saldo > 0 ? C.danger : C.slate900, alignment: 'right' },
            ],
          ],
        },
        layout: {
          hLineWidth: (i:number, n:any) => (i===0||i===n.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i:number, n:any) => (i===0||i===n.table.body.length) ? C.slate500 : C.slate200,
          paddingTop: () => 7, paddingBottom: () => 7,
          paddingLeft: () => 0, paddingRight: () => 0,
        },
        marginBottom: 16,
      },

      // ── BARRA DE PROGRESO ────────────────────────────
      { text: `Progreso de pago: ${pct}%`, fontSize: 8, color: C.slate500, marginBottom: 5 },
      {
        canvas: [
          { type: 'rect', x:0, y:0, w: barWidth, h:10, r:5, color: C.slate200 },
          ...(fillWidth > 0 ? [{ type: 'rect' as const, x:0, y:0, w: fillWidth, h:10, r:5, color: pct>=100 ? C.success : C.primary }] : []),
        ],
        marginBottom: 32,
      },

      // ── FIRMA ────────────────────────────────────────
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              { canvas: [{ type: 'line', x1:0,y1:0,x2:200,y2:0, lineWidth:0.5, lineColor:C.slate500 }] },
              { text: 'Recibido conforme', fontSize: 8, color: C.slate500, marginTop: 4 },
              { text: client.nombre, fontSize: 9, bold: true, color: C.slate700, marginTop: 2 },
            ],
          },
        ],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: C.slate900 },
  };

  return buildPdfBuffer(createPrinter(), doc);
}
