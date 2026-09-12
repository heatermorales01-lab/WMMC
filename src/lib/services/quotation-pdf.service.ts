/**
 * PDF de Cotización — WM Muebles Contemporáneos
 */
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { createPrinter, buildPdfBuffer, getLogoBase64 } from '@/lib/services/pdf-printer';

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

export interface QuotationPDFData {
  quotation: {
    id: string; version: number; estado: string;
    subtotal: string | number; total: string | number; createdAt: string;
    incluirIva?: boolean; ivaMonto?: string | number;
    descuento?: string | number; descuentoMotivo?: string | null;
    project: {
      nombreProyecto: string; ubicacion?: string; descripcion?: string;
      fechaInstalacionTentativa?: string;
      client: { nombre: string; telefono?: string; correo?: string; direccion?: string };
    };
    quotationItems: Array<{
      furnitureType: { nombre: string }; material: { nombre: string };
      countertopType?: { nombre: string }; descripcion?: string;
      largo: string | number; alto?: string | number; ancho?: string | number;
      cantidad: number; precioUnitario: string | number; subtotal: string | number;
      quotationItemExtras: Array<{ extra: { nombre: string }; cantidad: number; subtotal: string | number }>;
    }>;
    quotationServices: Array<{ service: { nombre: string }; cantidad: number; subtotal: string | number }>;
  };
}

export async function generateQuotationPDF(data: QuotationPDFData): Promise<Buffer> {
  const { quotation } = data;
  const { project } = quotation;
  const { client } = project;
  const code = `COT-${String(quotation.version).padStart(3,'0')}-${quotation.id.slice(0,6).toUpperCase()}`;

  // Filas de muebles
  const itemRows: any[][] = [];
  // Fondo estándar por tipo de mueble (informativo en el PDF)
  function getFondo(tipo: string): string | null {
    const t = tipo.toUpperCase();
    if (t.includes('CLOSET') || t.includes('BANIO') || t === 'BASE' || t === 'MUEBLE_TV') return '50 cm';
    if (t === 'TORRE' || t === 'ALACENA_REFRI') return '65 cm';
    return null;
  }

  quotation.quotationItems.forEach((item, idx) => {
    const dims = [`L:${item.largo}`, item.alto ? `A:${item.alto}` : null, item.ancho ? `An:${item.ancho}` : null]
      .filter(Boolean).join(' · ') + ' cm';
    const fondo = (item as any).fondoPersonalizado || getFondo(item.furnitureType.nombre);
    const dimsCompleto = fondo ? `${dims} · Fondo: ${fondo}` : dims;
    const sobre = item.countertopType ? ` + ${item.countertopType.nombre}` : '';
    // Usar nombre personalizado si existe, si no el nombre técnico del tipo
    const nombreMostrar = (item as any).nombrePersonalizado || item.furnitureType.nombre;

    // item.subtotal ya viene combinado (mueble + accesorios) desde el backend.
    // Para que el PDF no dé la impresión de que cada accesorio es un producto
    // aparte, mostramos en la fila principal SOLO el precio del mueble, cada
    // accesorio con el suyo debajo (en un bloque con fondo tenue), y cerramos
    // el grupo con una fila de "Subtotal del mueble" que suma ambos —
    // así queda explícito que el total ya incluye los accesorios listados.
    const subtotalExtras = item.quotationItemExtras.reduce((acc, ex) => acc + Number(ex.subtotal), 0);
    const subtotalMueble = Number(item.subtotal) - subtotalExtras;
    const tieneExtras = item.quotationItemExtras.length > 0;

    itemRows.push([
      { text: String(idx + 1), alignment: 'center', fontSize: 8, color: C.slate500 },
      {
        stack: [
          { text: `${nombreMostrar} — ${item.material.nombre}${sobre}`, bold: true, fontSize: 9 },
          { text: dimsCompleto, fontSize: 8, color: C.slate500, marginTop: 1 },
          ...(item.descripcion ? [{ text: item.descripcion, fontSize: 8, italics: true, color: C.slate700, marginTop: 1 }] : []),
        ],
      },
      { text: String(item.cantidad), alignment: 'center', fontSize: 9 },
      { text: crc(item.precioUnitario), alignment: 'right', fontSize: 9 },
      { text: crc(subtotalMueble), alignment: 'right', fontSize: 9, bold: true },
    ]);

    item.quotationItemExtras.forEach(ex => {
      itemRows.push([
        { text: '', border: [false,false,false,false], fillColor: C.slate50 },
        { text: `  ↳ ${ex.extra.nombre} × ${ex.cantidad}`, fontSize: 8, color: C.slate500, italics: true, border: [false,false,false,false], fillColor: C.slate50 },
        { text: '', border: [false,false,false,false], fillColor: C.slate50 },
        { text: '', border: [false,false,false,false], fillColor: C.slate50 },
        { text: crc(ex.subtotal), alignment: 'right', fontSize: 8, color: C.slate500, border: [false,false,false,false], fillColor: C.slate50 },
      ]);
    });

    if (tieneExtras) {
      itemRows.push([
        { text: '', border: [false,false,false,false], fillColor: C.slate50 },
        {
          text: 'Subtotal del mueble (incluye accesorios)', colSpan: 3, alignment: 'right',
          fontSize: 8, bold: true, italics: true, color: C.slate700,
          border: [false,false,false,true], borderColor: [C.slate200,C.slate200,C.slate200,C.slate200],
          fillColor: C.slate50,
        },
        {}, {},
        {
          text: crc(item.subtotal), alignment: 'right', fontSize: 9, bold: true, color: C.slate900,
          border: [false,false,false,true], borderColor: [C.slate200,C.slate200,C.slate200,C.slate200],
          fillColor: C.slate50,
        },
      ]);
    }
  });

  // Filas de servicios
  const svcRows: any[][] = quotation.quotationServices.length > 0 ? [
    [{ text: 'SERVICIOS', fontSize: 8, bold: true, color: C.slate700, colSpan: 5, fillColor: C.slate50 }, {},{},{},{}],
    ...quotation.quotationServices.map(qs => [
      { text: '', border:[false,false,false,false] },
      { text: `${qs.service.nombre} × ${qs.cantidad}`, fontSize: 9 },
      { text: '', alignment: 'center' },
      { text: '', alignment: 'right' },
      { text: crc(qs.subtotal), alignment: 'right', fontSize: 9, bold: true },
    ]),
  ] : [];

  const doc: any = {
    pageSize: 'LETTER',
    pageMargins: [45, 45, 45, 55],
    footer: (cur: number, total: number) => ({
      columns: [
        { text: 'WM Muebles Contemporáneos · Grecia, Alajuela, Costa Rica', fontSize: 7, color: C.slate500 },
        { text: `Pág ${cur}/${total}`, fontSize: 7, color: C.slate500, alignment: 'right' },
      ],
      margin: [45, 0],
    }),
    content: [
      // Header
      {
        columns: [
          ...(getLogoBase64() ? [{ image: getLogoBase64()!, width: 70, marginRight: 10 }] : []),
          {
            stack: [
              { text: 'WM MUEBLES', fontSize: 22, bold: true, color: C.primary },
              { text: 'CONTEMPORÁNEOS', fontSize: 11, bold: true, color: C.primaryDark, marginTop: 2 },
              { text: 'Fabricación e instalación a medida', fontSize: 8, color: C.slate500, marginTop: 3 },
            ],
            width: '*',
          },
          {
            width: 200,
            table: {
              widths: ['auto', '*'],
              body: [
                [{ text: 'COTIZACIÓN', bold: true, color: C.slate900, colSpan: 2, alignment: 'center', fillColor: C.primary, fontSize: 11 }, {}],
                [{ text: 'Número:', fontSize: 8, color: C.slate500, bold: true }, { text: code, fontSize: 9 }],
                [{ text: 'Fecha:', fontSize: 8, color: C.slate500, bold: true }, { text: fdate(quotation.createdAt), fontSize: 9 }],
                [{ text: 'Estado:', fontSize: 8, color: C.slate500, bold: true }, { text: quotation.estado, fontSize: 9 }],
              ],
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => C.slate200, vLineColor: () => C.slate200, paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 6, paddingRight: () => 6 },
          },
        ],
        columnGap: 20,
        marginBottom: 22,
      },

      // Cliente + Proyecto
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'CLIENTE', fontSize: 8, bold: true, color: C.primary, marginBottom: 4 },
              { text: client.nombre, fontSize: 11, bold: true },
              ...(client.telefono ? [{ text: `Tel: ${client.telefono}`, fontSize: 9, color: C.slate700 }] : []),
              ...(client.correo   ? [{ text: client.correo, fontSize: 9, color: C.slate700 }] : []),
              ...(client.direccion? [{ text: client.direccion, fontSize: 9, color: C.slate700 }] : []),
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'PROYECTO', fontSize: 8, bold: true, color: C.primary, marginBottom: 4 },
              { text: project.nombreProyecto, fontSize: 11, bold: true },
              ...(project.ubicacion ? [{ text: `Ubicación: ${project.ubicacion}`, fontSize: 9, color: C.slate700 }] : []),
              ...(project.fechaInstalacionTentativa ? [{ text: `Instalación estimada: ${fdate(project.fechaInstalacionTentativa)}`, fontSize: 9, color: C.slate700 }] : []),
            ],
          },
        ],
        marginBottom: 18,
      },

      // Tabla items
      { text: 'DETALLE DE COTIZACIÓN', fontSize: 8, bold: true, color: C.primary, marginBottom: 6 },
      {
        table: {
          headerRows: 1,
          widths: [18, '*', 35, 85, 85],
          body: [
            [
              { text: '#',         bold: true, color: C.slate900, alignment: 'center', fontSize: 8 },
              { text: 'Descripción', bold: true, color: C.slate900, fontSize: 8 },
              { text: 'Cant.',     bold: true, color: C.slate900, alignment: 'center', fontSize: 8 },
              { text: 'P. Unit.',  bold: true, color: C.slate900, alignment: 'right', fontSize: 8 },
              { text: 'Subtotal', bold: true, color: C.slate900, alignment: 'right', fontSize: 8 },
            ],
            ...itemRows,
            ...svcRows,
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths!.length) ? 1 : 0.5,
          hLineColor: () => C.slate200,
          vLineColor: () => C.slate200,
          fillColor: (row: number) => row === 0 ? C.primary : null,
          paddingTop: () => 6, paddingBottom: () => 6,
          paddingLeft: () => 7, paddingRight: () => 7,
        },
        marginBottom: 14,
      },

      // Totales + notas
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'CONDICIONES', fontSize: 8, bold: true, color: C.primary, marginBottom: 5 },
              { text: '• Precios en colones costarricenses (₡)', fontSize: 8, color: C.slate500, lineHeight: 1.5 },
              { text: '• Pagos únicamente por transferencia bancaria', fontSize: 8, color: C.slate500, lineHeight: 1.5 },
              { text: '• Cotización válida por 30 días naturales', fontSize: 8, color: C.slate500, lineHeight: 1.5 },
              { text: '• Los precios incluyen mano de obra de fabricación', fontSize: 8, color: C.slate500, lineHeight: 1.5 },
            ],
          },
          {
            width: 200,
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Subtotal muebles:', fontSize: 9, color: C.slate700 }, { text: crc(quotation.subtotal), fontSize: 9, bold: true, alignment: 'right' }],
                ...quotation.quotationServices.map(qs => [
                  { text: `${qs.service.nombre}:`, fontSize: 9, color: C.slate700 },
                  { text: crc(qs.subtotal), fontSize: 9, bold: true, alignment: 'right' },
                ]),
                ...(Number(quotation.descuento) > 0 ? [[
                  { text: quotation.descuentoMotivo ? `Descuento (${quotation.descuentoMotivo}):` : 'Descuento:', fontSize: 9, color: C.slate700 },
                  { text: `- ${crc(quotation.descuento || 0)}`, fontSize: 9, bold: true, alignment: 'right', color: C.primaryDark },
                ]] : []),
                ...(quotation.incluirIva ? [[
                  { text: 'IVA (13%):', fontSize: 9, color: C.slate700 },
                  { text: crc(quotation.ivaMonto || 0), fontSize: 9, bold: true, alignment: 'right' },
                ]] : []),
                [
                  { text: 'TOTAL:', fontSize: 11, bold: true, color: C.slate900, fillColor: C.primary },
                  { text: crc(quotation.total), fontSize: 11, bold: true, color: C.slate900, alignment: 'right', fillColor: C.primary },
                ],
              ],
            },
            layout: { hLineWidth: (i:number,n:any) => (i===0||i===n.table.body.length)?1:0.5, vLineWidth:()=>0, hLineColor:()=>C.slate200, paddingTop:()=>5, paddingBottom:()=>5, paddingLeft:()=>7, paddingRight:()=>7 },
          },
        ],
      },

      // Firmas
      {
        marginTop: 38,
        columns: [
          {
            width: '45%',
            stack: [
              { canvas: [{ type: 'line', x1:0,y1:0,x2:180,y2:0, lineWidth:0.5, lineColor:C.slate500 }] },
              { text: 'Firma del cliente', fontSize: 8, color: C.slate500, marginTop: 4 },
              { text: client.nombre, fontSize: 9, bold: true, color: C.slate700, marginTop: 2 },
            ],
          },
          { width: '*', text: '' },
          {
            width: '45%',
            stack: [
              { canvas: [{ type: 'line', x1:0,y1:0,x2:180,y2:0, lineWidth:0.5, lineColor:C.slate500 }] },
              { text: 'Autorizado por', fontSize: 8, color: C.slate500, marginTop: 4 },
              { text: 'WM Muebles Contemporáneos', fontSize: 9, bold: true, color: C.slate700, marginTop: 2 },
            ],
          },
        ],
      },
    ],
    defaultStyle: { font: 'DejaVuSans', fontSize: 10, color: C.slate900 },
  };

  return buildPdfBuffer(createPrinter(), doc);
}
