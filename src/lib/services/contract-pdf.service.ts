import { createPrinter, getLogoBase64 } from './pdf-printer';

// ─── Datos fijos del Proveedor (editar aquí cuando cambien) ─────
const PROVEEDOR = {
    nombre: 'Carlos Rojas Garita',
    cedula: '2-0711-0008',
    empresa: 'WM Muebles Contemporáneos',
    banco: {
        titular: 'CARLOS ALFREDO ROJAS GARITA',
        cuentaBac: '945952745',
        iban: 'CR96010200009459527452',
        sinpe: '6022 0044',
    },
};

function crc(v: number | string): string {
    const n = typeof v === 'string' ? Number(v) : v;
    if (isNaN(n)) return String(v);
    const formatted = Math.round(n).toLocaleString('es-CR');
    return '₡' + formatted;
}

// Convierte un Buffer + mimeType a data URI, lo único que pdfmake necesita
// para insertar la imagen — nunca se guarda en disco ni en ningún bucket.
function toDataUri(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

const C = {
    slate900: '#0f172a',
    slate700: '#334155',
    slate500: '#64748b',
    slate200: '#e2e8f0',
    slate50: '#f8fafc',
    primary: '#c9861f', // ajustar al color de marca real si es distinto
};

export interface ContractImage {
    buffer: Buffer;
    mimeType: string;
}

// Todo lo que entra aquí es texto que el usuario escribió en el formulario
// al momento de generar el contrato — nada de esto viene de, ni se guarda
// en, Client/Project/Quotation. Es "rellenar y usar una sola vez".
export interface ContractData {
    consumidorNombre: string;
    consumidorCedula: string;
    consumidorDomicilio: string;

    colorExterior: string;
    colorInterior: string;
    colorSobre: string;
    colorTapetaExterior?: string;
    colorTapetaInterior?: string;

    valorTotal: number;
    anticipo60: number;
    pagoInstalacion30: number;
    pagoFinal10: number;

    accesorios: { nombre: string; monto: number }[];
    totalAccesorios: number;

    fechaEntregaEstimada: string;
    domicilioEntrega: string;

    observacionesGenerales?: string;

    // Imágenes — se insertan directo en el PDF, nunca se persisten
    imagenDescripcionGeneral?: ContractImage;
    imagenesDescripcionVisual?: ContractImage[];
    imagenMuestraColorExterior?: ContractImage;
    imagenMuestraColorInterior?: ContractImage;

    // Capítulo 13 — depende de lo que el cliente contrató en ESTE proyecto,
    // por eso es una imagen por accesorio (opcional), no un set fijo.
    referenciasVisuales?: { nombre: string; imagen: ContractImage }[];
}

function seccionFirma(texto: string) {
    return {
        table: {
            widths: ['*', 'auto'],
            body: [[
                { text: texto, fontSize: 9, border: [true, true, true, true], borderColor: [C.slate200, C.slate200, C.slate200, C.slate200] },
                { text: 'Firma del Consumidor: ______________________', fontSize: 9, border: [true, true, true, true], borderColor: [C.slate200, C.slate200, C.slate200, C.slate200] },
            ]],
        },
        margin: [0, 8, 0, 14] as [number, number, number, number],
    };
}

function capituloTitulo(n: number, titulo: string) {
    return { text: `CAPÍTULO ${n}. ${titulo}`, fontSize: 11, bold: true, color: C.primary, margin: [0, 14, 0, 6] as [number, number, number, number] };
}

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
    const printer = createPrinter();
    const logo = getLogoBase64();

    const imagenesDescripcionVisual = (data.imagenesDescripcionVisual || []).map((img) => ({
        image: toDataUri(img.buffer, img.mimeType),
        width: 230,
        margin: [0, 4, 8, 4] as [number, number, number, number],
    }));

    const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [40, 100, 40, 60],
        header: {
            margin: [40, 24, 40, 0],
            columns: [
                logo ? { image: logo, width: 60 } : { text: '' },
                { text: PROVEEDOR.empresa, alignment: 'right', fontSize: 14, bold: true, color: C.primary, margin: [0, 10, 0, 0] },
            ],
        },
        footer: (currentPage: number, pageCount: number) => ({
            margin: [40, 10, 40, 0],
            columns: [
                { text: `${PROVEEDOR.empresa} · Grecia, Alajuela, Costa Rica`, fontSize: 7, color: C.slate500 },
                { text: `Pág. ${currentPage}/${pageCount}`, alignment: 'right', fontSize: 7, color: C.slate500 },
            ],
        }),
        defaultStyle: { font: 'DejaVuSans', fontSize: 10, color: C.slate900 },
        content: [
            { text: 'CONTRATO DE COMPRA-VENTA DE MOBILIARIO', fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 2] },
            { text: PROVEEDOR.empresa, fontSize: 11, alignment: 'center', color: C.slate500, margin: [0, 0, 0, 12] },

            {
                text: [
                    'El presente ',
                    { text: 'CONTRATO DE COMPRA-VENTA AL CONTADO', bold: true },
                    ' que celebran por una parte ',
                    { text: PROVEEDOR.empresa, bold: true },
                    `, representado por el señor ${PROVEEDOR.nombre}, cédula ${PROVEEDOR.cedula}, en adelante referido como `,
                    { text: '"El Proveedor"', bold: true },
                    '; y por la otra parte, ',
                    { text: data.consumidorNombre || '_______________________', bold: true, italics: true },
                    `, portador(a) de la cédula N° `,
                    { text: data.consumidorCedula || '_______________', italics: true },
                    `, con domicilio en ${data.consumidorDomicilio || '_______________________'}, en adelante referido como `,
                    { text: '"El Consumidor"', bold: true },
                    '; quienes acuerdan sujetarse a las siguientes cláusulas:',
                ],
                margin: [0, 0, 0, 10],
            },

            { text: 'DESCRIPCIÓN GENERAL DEL PROYECTO', bold: true, fontSize: 10, margin: [0, 4, 0, 4] },
            data.imagenDescripcionGeneral
                ? { image: toDataUri(data.imagenDescripcionGeneral.buffer, data.imagenDescripcionGeneral.mimeType), width: 340, margin: [0, 0, 0, 10] }
                : { text: '(Sin imagen adjunta)', fontSize: 8, italics: true, color: C.slate500, margin: [0, 0, 0, 10] },

            { text: 'DESCRIPCIÓN VISUAL DEL PROYECTO', bold: true, fontSize: 10, margin: [0, 4, 0, 4] },
            imagenesDescripcionVisual.length
                ? { columns: imagenesDescripcionVisual, columnGap: 8, margin: [0, 0, 0, 10] }
                : { text: '(Sin imágenes adjuntas)', fontSize: 8, italics: true, color: C.slate500, margin: [0, 0, 0, 10] },

            {
                columns: [
                    { text: [{ text: 'Color externo del mueble: ', bold: true }, data.colorExterior || '_______________'], fontSize: 9 },
                    { text: [{ text: 'Color interno del mueble: ', bold: true }, data.colorInterior || '_______________'], fontSize: 9 },
                    { text: [{ text: 'Sobre: ', bold: true }, data.colorSobre || '_______________'], fontSize: 9 },
                ],
                margin: [0, 0, 0, 10],
            },

            capituloTitulo(1, 'OBJETO DEL CONTRATO'),
            { text: 'El presente contrato tiene por objeto la compra-venta e instalación del mobiliario descrito en la cotización adjunta, que forma parte integral del presente documento.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'El Proveedor se compromete a: transportar, instalar y limpiar el mobiliario contratado, de forma que el Consumidor pueda hacer uso de él. Asimismo, se adjuntarán fotografías del proceso de producción e instalación del proyecto.', fontSize: 9.5 },

            capituloTitulo(2, 'VALOR DEL CONTRATO Y FORMA DE PAGO'),
            { text: [`El valor total del mobiliario es de `, { text: crc(data.valorTotal), bold: true }, ' (trece por ciento de IVA no incluido).'], fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'El pago se realizará en las siguientes fases:', fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                ul: [
                    `60% (${crc(data.anticipo60)}) como anticipo, mediante depósito o transferencia bancaria.`,
                    `30% (${crc(data.pagoInstalacion30)}) antes del inicio de la instalación del proyecto.`,
                    `10% (${crc(data.pagoFinal10)}) una semana después de la finalización total de la instalación.`,
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 8],
            },
            { text: 'Datos bancarios para transferencia:', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
            {
                ul: [
                    `Titular: ${PROVEEDOR.banco.titular}`,
                    `Cuenta BAC: ${PROVEEDOR.banco.cuentaBac}`,
                    `IBAN: ${PROVEEDOR.banco.iban}`,
                    `SINPE Móvil: ${PROVEEDOR.banco.sinpe}`,
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'Nota: De requerir factura electrónica, se sumará el 13% de IVA al monto total cotizado.', fontSize: 8.5, italics: true, color: C.slate500 },

            capituloTitulo(3, 'ACCESORIOS Y HERRAJES'),
            { text: 'Se entiende por accesorios los herrajes, fregaderos, especieros, cuberteros, jaladeras y demás elementos relacionados. Los accesorios se cotizan por separado y deben ser cancelados en su totalidad por el Consumidor. No aplica el esquema de pago fraccionado descrito en el Capítulo 2.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'Desglose de accesorios:', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
            data.accesorios.length
                ? { ul: data.accesorios.map((a) => `${a.nombre}: ${crc(a.monto)}`), fontSize: 9.5, margin: [0, 0, 0, 6] }
                : { text: '(Sin accesorios en este proyecto)', fontSize: 9, italics: true, color: C.slate500, margin: [0, 0, 0, 6] },
            { text: [`Valor total de los accesorios: `, { text: crc(data.totalAccesorios), bold: true }, ' — Debe cancelarse el 100% del total.'], fontSize: 9.5 },

            capituloTitulo(4, 'MATERIALES, COLORES Y ACABADOS'),
            { text: '4.1 Interior de los Muebles', bold: true, fontSize: 9.5, margin: [0, 4, 0, 3] },
            { text: 'El interior de los muebles (caras internas, fondos y divisiones no visibles) será fabricado en melamina de color blanco estándar, salvo indicación expresa y por escrito del Consumidor. Si el Consumidor desea que el interior sea del mismo color de la melamina exterior o en otro color específico, deberá solicitarlo de forma explícita durante la etapa de selección de colores. Dicha solicitud conllevará un ajuste en el precio, dado que implica un mayor costo de material, el cual será comunicado al Consumidor antes de proceder.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: '4.2 Selección y Aprobación de Colores de Melamina', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
            { text: 'El Consumidor deberá seleccionar y aprobar los colores de melamina durante la etapa de escogencia de colores establecida por el Proveedor. Una vez aprobados los colores por escrito o mediante firma en este contrato, no se aceptarán cambios sin costo adicional. Los cambios solicitados después de iniciada la producción generarán costos adicionales a cargo del Consumidor.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: '4.3 Selección y Aprobación del Color de Tapeta (Canto)', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
            { text: 'El Consumidor deberá seleccionar y aprobar el color de la tapeta (canto o enchape) en la misma etapa de escogencia de colores. El Consumidor reconoce y acepta que no todos los colores de melamina cuentan con una tapeta de color exactamente idéntico, ya que la correspondencia entre ambos materiales depende de la disponibilidad del proveedor.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'En caso de que el Consumidor no seleccione la tapeta o no apruebe una opción específica, el Proveedor instalará el color más parecido disponible recomendado por su proveedor de materiales, sin que esto sea motivo de reclamo posterior.', fontSize: 9.5, margin: [0, 0, 0, 6] },

            { text: 'REGISTRO DE COLORES SELECCIONADOS Y APROBADOS', bold: true, fontSize: 9.5, margin: [0, 4, 0, 4] },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [{ text: 'Elemento', bold: true, fontSize: 8.5 }, { text: 'Color de Melamina', bold: true, fontSize: 8.5 }, { text: 'Color de Tapeta', bold: true, fontSize: 8.5 }],
                        [{ text: 'Melamina exterior', fontSize: 8.5 }, { text: data.colorExterior || '—', fontSize: 8.5 }, { text: data.colorTapetaExterior || data.colorExterior || '—', fontSize: 8.5 }],
                        [{ text: 'Melamina interior', fontSize: 8.5 }, { text: data.colorInterior || '—', fontSize: 8.5 }, { text: data.colorTapetaInterior || data.colorInterior || '—', fontSize: 8.5 }],
                    ],
                },
                layout: { fillColor: (i: number) => (i === 0 ? C.slate50 : null) },
                margin: [0, 0, 0, 10],
            },

            { text: 'MUESTRA VISUAL DE COLORES APROBADOS', bold: true, fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: 'Melamina exterior', fontSize: 8.5, bold: true, margin: [0, 0, 0, 3] },
                            data.imagenMuestraColorExterior
                                ? { image: toDataUri(data.imagenMuestraColorExterior.buffer, data.imagenMuestraColorExterior.mimeType), width: 220 }
                                : { text: '(Sin muestra adjunta)', fontSize: 8, italics: true, color: C.slate500 },
                        ],
                    },
                    {
                        width: '*',
                        stack: [
                            { text: 'Melamina interior', fontSize: 8.5, bold: true, margin: [0, 0, 0, 3] },
                            data.imagenMuestraColorInterior
                                ? { image: toDataUri(data.imagenMuestraColorInterior.buffer, data.imagenMuestraColorInterior.mimeType), width: 220 }
                                : { text: '(Sin muestra adjunta)', fontSize: 8, italics: true, color: C.slate500 },
                        ],
                    },
                ],
                columnGap: 10,
                margin: [0, 0, 0, 10],
            },

            capituloTitulo(5, 'REVISIÓN DE ACABADOS Y APROBACIÓN DE HOJA DE DISEÑO'),
            { text: '5.1 Visita al Taller para Revisión de Acabados', bold: true, fontSize: 9.5, margin: [0, 4, 0, 3] },
            { text: 'Es responsabilidad del Consumidor visitar el taller del Proveedor para revisar muebles ya fabricados que muestren materiales, acabados, texturas y colores similares a los de su proyecto. Esta visita debe realizarse antes de la firma del presente contrato o durante la etapa de aprobación de diseño. El Consumidor acepta que, al haber tenido la oportunidad de revisar muestras físicas, no podrá presentar reclamos posteriores por diferencias de textura, brillo, tono o acabado que sean propias del material seleccionado.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: '5.2 Aprobación de la Hoja de Diseño para Producción', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
            { text: 'Antes de iniciar la producción, el Proveedor entregará al Consumidor la Hoja de Diseño del proyecto, documento que detalla las dimensiones, materiales y distribución de cada pieza del mobiliario. El Consumidor deberá revisar este documento con detenimiento y firmarlo como señal de aprobación.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'Una vez firmada la Hoja de Diseño, el Proveedor procederá con la fabricación. No se aceptarán reclamos ni modificaciones relacionadas con las medidas, distribución o materiales especificados en dicho documento, ya que se considera que el Consumidor los revisó, comprendió y aprobó explícitamente.', fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'Cualquier modificación solicitada después de firmada la Hoja de Diseño, o durante la etapa de producción, generará costos adicionales a cargo del Consumidor, los cuales serán cotizados y aprobados por escrito antes de ejecutarse.', fontSize: 9.5 },
            seccionFirma('El Consumidor declara haber revisado la Hoja de Diseño y aprueba su contenido para proceder con la producción.'),

            capituloTitulo(6, 'COMPROBANTES DE PAGO'),
            { text: 'El Proveedor entregará comprobantes digitales por los pagos recibidos, siempre que sean solicitados por el Consumidor. En caso de requerir factura electrónica, se sumará el 13% correspondiente al IVA al monto total final cotizado.', fontSize: 9.5 },

            capituloTitulo(7, 'FECHAS DE ENTREGA Y PLAZOS'),
            { text: [{ text: 'Fecha estimada de entrega: ', bold: true }, data.fechaEntregaEstimada || '_______________'], fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'El plazo de entrega e instalación que corresponde a 30 días hábiles, es decir de lunes a viernes, comenzará una vez confirmada la disponibilidad de los materiales necesarios y el pago del 60%. La fecha de instalación puede cambiar por motivos ajenos al control del Proveedor, tales como:', fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                ul: [
                    'Condiciones climáticas adversas.',
                    'Fallos en maquinaria esencial.',
                    'Enfermedad o accidente laboral.',
                    'Atrasos en la entrega de materiales por parte de proveedores.',
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'El Proveedor notificará al Consumidor con antelación razonable sobre cualquier eventualidad que afecte los plazos acordados.', fontSize: 9.5 },

            capituloTitulo(8, 'TRANSPORTE E INSTALACIÓN'),
            { text: [{ text: 'Domicilio de entrega: ', bold: true }, data.domicilioEntrega || '_______________'], fontSize: 9.5, margin: [0, 0, 0, 6] },
            { text: 'El mobiliario será entregado e instalado en el domicilio del Consumidor indicado anteriormente. Si el Consumidor opta por retirar el mobiliario directamente en el taller del Proveedor, asumirá la total responsabilidad por cualquier pérdida, daño o deterioro que ocurra a partir de ese momento.', fontSize: 9.5 },

            capituloTitulo(9, 'CONDICIONES DEL ÁREA DE INSTALACIÓN'),
            { text: 'El área de instalación debe cumplir con las siguientes condiciones antes de la fecha acordada:', fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                ul: [
                    'Suelo nivelado y terminado.',
                    'Paredes con repellos y acabados terminados.',
                    'Instalación eléctrica en funcionamiento (cuando aplique).',
                    'Puertas con buques terminados (cuando aplique).',
                    'El espacio debe estar libre de otros materiales u obstáculos que impidan el trabajo.',
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'Si estas condiciones no se cumplen y el Proveedor deba reprogramar la instalación, el Consumidor asumirá los costos adicionales de transporte y mano de obra generados por la reprogramación.', fontSize: 9.5 },

            capituloTitulo(10, 'GARANTÍAS'),
            {
                ul: [
                    'Mobiliario: Garantía de 1 año por defectos de fabricación, contados a partir de la fecha de entrega.',
                    'Herrajes: Garantía de 3 meses por defectos de fabricación.',
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'El Consumidor deberá presentar su reclamación por escrito. La garantía cubre exclusivamente defectos de fábrica y no incluye daños ocasionados por:', fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                ul: [
                    'Uso indebido o mal manejo por parte del Consumidor.',
                    'Daños por humedad, plagas, condiciones climáticas o factores externos.',
                    'Modificaciones realizadas por terceros ajenos al Proveedor.',
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'Las variaciones en color, diseño o textura, propias de la naturaleza del mobiliario y los materiales, no son motivo de garantía. Si el daño no está cubierto por la garantía, el Consumidor asumirá los costos de materiales, accesorios y transporte necesarios para la reparación.', fontSize: 9.5 },

            capituloTitulo(11, 'LIMITACIÓN DE RECLAMOS POSTERIORES'),
            { text: 'El Consumidor acepta que una vez firmado el presente contrato, aprobada la Hoja de Diseño y seleccionados los colores y materiales en la etapa correspondiente, no se aceptarán reclamos posteriores por los siguientes aspectos:', fontSize: 9.5, margin: [0, 0, 0, 4] },
            {
                ul: [
                    'Dimensiones del mobiliario según lo aprobado en la Hoja de Diseño.',
                    'Colores de melamina y tapeta seleccionados y aprobados.',
                    'Diferencias de tono o textura entre la melamina y la tapeta, inherentes al material.',
                    'Color blanco del interior del mueble, cuando no se haya solicitado otro color expresamente.',
                    'Acabados y texturas de los materiales, cuando se haya tenido la oportunidad de verlos en el taller.',
                    'Distribución interna, número de cajones, entrepaños u otros elementos especificados en el diseño aprobado.',
                ],
                fontSize: 9.5,
                margin: [0, 0, 0, 6],
            },
            { text: 'El Consumidor reconoce haber leído, comprendido y aceptado todas las condiciones de diseño, materiales y acabados, y que firma el presente contrato en pleno conocimiento de las características del mobiliario que recibirá.', fontSize: 9.5 },

            capituloTitulo(12, 'PENALIZACIONES'),
            {
                ul: [
                    'Si el Consumidor incumple con las condiciones del Capítulo 9, deberá cubrir los costos de transporte adicional generados.',
                    'Si el Consumidor cancela la instalación el mismo día pactado, deberá pagar una multa de ₡30 000,00 (treinta mil colones exactos). Para evitar esta penalización, debe notificar con un mínimo de 48 horas de anticipación.',
                    'Los cambios de diseño solicitados después de firmada la Hoja de Diseño generarán costos adicionales que el Consumidor deberá cancelar previo a su ejecución.',
                    'El anticipo del 60% no es reembolsable en caso de desistimiento del proyecto por parte del Consumidor una vez iniciada la producción.',
                ],
                fontSize: 9.5,
            },

            ...(data.referenciasVisuales && data.referenciasVisuales.length > 0
                ? [
                    capituloTitulo(13, 'REFERENCIAS VISUALES DE ACCESORIOS CONTRATADOS'),
                    { text: 'Las siguientes imágenes corresponden a los accesorios efectivamente contratados en este proyecto, a modo de referencia visual de sus características.', fontSize: 9, italics: true, color: C.slate500, margin: [0, 0, 0, 6] as [number, number, number, number] },
                    ...chunk(data.referenciasVisuales, 2).map((par) => ({
                        columns: par.map((ref) => ({
                            width: '*' as const,
                            stack: [
                                { image: toDataUri(ref.imagen.buffer, ref.imagen.mimeType), width: 220 },
                                { text: ref.nombre, fontSize: 8.5, bold: true, alignment: 'center' as const, margin: [0, 3, 0, 0] as [number, number, number, number] },
                            ],
                        })),
                        columnGap: 10,
                        margin: [0, 0, 0, 10] as [number, number, number, number],
                    })),
                ]
                : []),

            ...(data.observacionesGenerales
                ? [
                    { text: 'OBSERVACIONES GENERALES', fontSize: 11, bold: true, color: C.primary, margin: [0, 14, 0, 6] as [number, number, number, number] },
                    { text: data.observacionesGenerales, fontSize: 9.5 },
                ]
                : []),

            { text: `Leído y entendido el presente contrato, ambas partes lo firman en la ciudad de Grecia, a los ____ días del mes de ________________ del año ________.`, fontSize: 9.5, bold: true, margin: [0, 20, 0, 30] },

            {
                columns: [
                    { text: '_____________________________\n' + PROVEEDOR.nombre + '\nProveedor\nCédula: ' + PROVEEDOR.cedula, fontSize: 9, alignment: 'center' },
                    { text: '_____________________________\n' + (data.consumidorNombre || 'El Consumidor') + '\nCédula: ' + (data.consumidorCedula || '_______________'), fontSize: 9, alignment: 'center' },
                ],
            },
        ],
    };

    return new Promise((resolve, reject) => {
        const doc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}