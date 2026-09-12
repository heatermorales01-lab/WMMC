/**
 * PDF de Reporte Semanal de Horario — WM Muebles Contemporáneos
 */
import { createPrinter, buildPdfBuffer, getLogoBase64 } from '@/lib/services/pdf-printer';

const C = {
  primary:     '#d99c0b',
  primaryDark: '#8a610a',
  white:       '#ffffff',
  slate900:    '#0f172a',
  slate700:    '#334155',
  slate500:    '#64748b',
  slate200:    '#e2e8f0',
  success:     '#16a34a',
};

function crc(v: number | string): string {
  const formatted = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v));
  return '\u20a1' + formatted;
}
function fdate(d?: string | Date): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function ftime(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

export interface WeeklyReportRow {
  user: { nombre: string; correo: string };
  entries: Array<{
    fecha: string;
    horaEntrada: string;
    horaSalida: string | null;
    horasTrabajadas: string | number | null;
    minutosExcedentes?: number | null;
    desayunoInicio?: string | null;
    desayunoFin?: string | null;
    almuerzoInicio?: string | null;
    almuerzoFin?: string | null;
    cafeInicio?: string | null;
    cafeFin?: string | null;
    observaciones?: string | null;
  }>;
  totalHoras: number;
  totalExcedente?: number;
  tarifaHora?: number | null;
  salarioCalculado?: number | null;
}

export interface WeeklyReportData {
  semanaInicio: string;
  semanaFin: string;
  rows: WeeklyReportRow[];
}

function breakCell(inicio?: string | null, fin?: string | null): string {
  if (!inicio) return '—';
  if (!fin) return `${ftime(inicio)} (abierto)`;
  const mins = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  return `${ftime(inicio)}-${ftime(fin)} (${mins}')`;
}

export async function generateWeeklyTimesheetPDF(data: WeeklyReportData): Promise<Buffer> {
  const { rows } = data;

  const totalGeneral = rows.reduce((acc, r) => acc + Number(r.totalHoras), 0);
  const salarioGeneral = rows.reduce((acc, r) => acc + Number(r.salarioCalculado || 0), 0);
  const excedenteGeneral = rows.reduce((acc, r) => acc + Number(r.totalExcedente || 0), 0);

  const userSections = rows.flatMap((row) => {
    const entryRows = row.entries.map((e) => [
      { text: fdate(e.fecha), fontSize: 8 },
      { text: ftime(e.horaEntrada), fontSize: 8, alignment: 'center' },
      { text: breakCell(e.desayunoInicio, e.desayunoFin), fontSize: 7, alignment: 'center' },
      { text: breakCell(e.almuerzoInicio, e.almuerzoFin), fontSize: 7, alignment: 'center' },
      { text: breakCell(e.cafeInicio, e.cafeFin), fontSize: 7, alignment: 'center' },
      { text: ftime(e.horaSalida), fontSize: 8, alignment: 'center' },
      { text: e.horasTrabajadas != null ? Number(e.horasTrabajadas).toFixed(2) : '—', fontSize: 8, alignment: 'center', bold: true },
      { text: e.minutosExcedentes ? `-${Math.round(e.minutosExcedentes)}'` : '—', fontSize: 8, alignment: 'center', color: e.minutosExcedentes ? '#d97706' : C.slate500 },
    ]);

    return [
      {
        columns: [
          { text: row.user.nombre, bold: true, fontSize: 11, color: C.slate900 },
          {
            text: row.tarifaHora
              ? `${row.totalHoras.toFixed(2)} h  ×  ${crc(row.tarifaHora)}/h  =  ${crc(row.salarioCalculado || 0)}`
              : `${row.totalHoras.toFixed(2)} h  (sin tarifa configurada)`,
            fontSize: 10,
            bold: true,
            color: row.tarifaHora ? C.success : C.slate500,
            alignment: 'right',
          },
        ],
        marginTop: 14,
        marginBottom: 2,
      },
      ...(row.totalExcedente ? [{
        text: `Descansos excedidos en la semana: ${Math.round(row.totalExcedente)} minutos descontados`,
        fontSize: 8, color: '#dc2626', italics: true, marginBottom: 4,
      }] : [{ text: '', marginBottom: 0 }]),
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Fecha', bold: true, color: C.white, fontSize: 7 },
              { text: 'Entrada', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Desayuno', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Almuerzo', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Café', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Salida', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Horas pagas', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
              { text: 'Excedente', bold: true, color: C.white, fontSize: 7, alignment: 'center' },
            ],
            ...entryRows,
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => C.slate200,
          fillColor: (row: number) => row === 0 ? C.primary : null,
          paddingTop: () => 4, paddingBottom: () => 4,
          paddingLeft: () => 4, paddingRight: () => 4,
        },
      },
    ];
  });

  const doc: any = {
    pageSize: 'LETTER',
    pageMargins: [45, 45, 45, 55],
    footer: (cur: number, total: number) => ({
      columns: [
        { text: 'WM Muebles Contemporáneos · Reporte de control de horario', fontSize: 7, color: C.slate500 },
        { text: `Pág ${cur}/${total}`, fontSize: 7, color: C.slate500, alignment: 'right' },
      ],
      margin: [45, 0],
    }),
    content: [
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
            stack: [
              { text: 'REPORTE SEMANAL DE HORARIO', fontSize: 12, bold: true, color: C.slate700, alignment: 'right' },
              { text: `${fdate(data.semanaInicio)}  —  ${fdate(data.semanaFin)}`, fontSize: 10, color: C.primary, bold: true, alignment: 'right', marginTop: 3 },
            ],
            width: 'auto',
          },
        ],
        columnGap: 15,
        marginBottom: 10,
      },

      ...userSections,

      // Totales generales
      {
        marginTop: 20,
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'TOTAL GENERAL DE HORAS PAGAS:', bold: true, fontSize: 11, color: C.white, fillColor: C.primaryDark },
              { text: `${totalGeneral.toFixed(2)} h`, bold: true, fontSize: 11, color: C.white, fillColor: C.primaryDark, alignment: 'right' },
            ],
            ...(excedenteGeneral > 0 ? [[
              { text: 'TIEMPO ADICIONAL DE DESCANSO REGISTRADO:', bold: true, fontSize: 10, color: C.white, fillColor: '#d97706' },
              { text: `${Math.round(excedenteGeneral)} min`, bold: true, fontSize: 10, color: C.white, fillColor: '#d97706', alignment: 'right' },
            ]] : []),
            ...(salarioGeneral > 0 ? [[
              { text: 'TOTAL GENERAL DE SALARIOS:', bold: true, fontSize: 11, color: C.white, fillColor: C.success },
              { text: crc(salarioGeneral), bold: true, fontSize: 11, color: C.white, fillColor: C.success, alignment: 'right' },
            ]] : []),
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: () => 10, paddingRight: () => 10 },
      },
    ],
    defaultStyle: { font: 'DejaVuSans', fontSize: 10, color: C.slate900 },
  };

  return buildPdfBuffer(createPrinter(), doc);
}
