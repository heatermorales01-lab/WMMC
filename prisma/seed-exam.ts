// Carga el examen inicial "Evaluación de conocimientos del taller WM"
// (30 preguntas + casos prácticos opcionales) en las tablas genéricas de
// exámenes. Es idempotente: si ya existe un examen con ese nombre, no
// vuelve a crearlo.
//
// Uso:  npx ts-node prisma/seed-exam.ts
//
// Las preguntas viven en la base de datos, no en el código de la app —
// este script solo es la carga inicial. Después el administrador puede
// editarlas o crear exámenes nuevos desde Evaluaciones → Exámenes.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SU = { tipo: 'SU'; q: string; pts: number; opts: string[]; correcta: number; critica?: boolean };
type AB = { tipo: 'AB'; q: string; pts: number; guia: string; critica?: boolean };
type P = SU | AB;

const su = (q: string, opts: string[], correcta: number, pts: number, critica = false): SU => ({ tipo: 'SU', q, pts, opts, correcta, critica });
const ab = (q: string, guia: string, pts: number, critica = false): AB => ({ tipo: 'AB', q, pts, guia, critica });

const SECCIONES: { nombre: string; opcional?: boolean; preguntas: P[] }[] = [
  {
    nombre: 'Parte I. Reconocimiento y uso de herramientas',
    preguntas: [
      su('¿Qué herramienta del catálogo se utiliza para medir el largo o ancho de una pieza?', ['Escuadra armadora', 'Cinta métrica', 'Nivel pequeño', 'Sargento'], 1, 2.5),
      su('¿Cuál es la función principal de una escuadra?', ['Aplicar pegamento', 'Medir únicamente el peso', 'Comprobar ángulos y escuadra', 'Pulir cantos'], 2, 2.5),
      su('¿Para qué se utiliza normalmente un sargento?', ['Sujetar piezas durante el armado o trabajo', 'Cortar melamina', 'Medir profundidades', 'Aplicar pintura'], 0, 2.5),
      su('¿Cuál herramienta del catálogo está diseñada para lijar superficies?', ['Alicate', 'Lijadora circular', 'Pistola de clavos', 'Avellanador'], 1, 2.5),
      su('¿Qué herramienta se utiliza para realizar perforaciones?', ['Taladro', 'Maso de hule', 'Nivel', 'Cutter'], 0, 2.5),
      su('¿Para qué sirve un avellanador?', ['Cortar tableros en línea recta', 'Preparar el alojamiento para que la cabeza de un tornillo quede al ras o hundida', 'Medir el espesor de un tablero', 'Sujetar una bisagra'], 1, 2.5),
      su('¿Cuál es la diferencia entre un atornillador y un taladro, en términos generales?', ['No existe ninguna diferencia de uso', 'El atornillador está orientado a colocar tornillos; el taladro, a perforar, aunque algunos equipos hacen ambas tareas', 'El taladro solo se utiliza para lijar', 'El atornillador sirve únicamente para cortar metal'], 1, 2.5),
      su('¿Qué accesorio del catálogo permite realizar perforaciones circulares de mayor diámetro que una broca convencional, según su diseño?', ['Broca sierra', 'Escuadra pequeña', 'Disco de lija', 'Tapa tornillos'], 0, 2.5),
      su('¿Para qué se utiliza habitualmente el maso de hule?', ['Golpear piezas con menor riesgo de marcar su superficie que con un martillo metálico', 'Cortar tornillos', 'Perforar melamina', 'Medir los cantos'], 0, 2.5),
      su('Antes de utilizar una herramienta eléctrica, ¿qué debe hacer?', ['Utilizarla inmediatamente para ahorrar tiempo', 'Revisar su estado, accesorios, cable o alimentación y protecciones, y confirmar que sabe usarla', 'Retirar las protecciones para ver mejor', 'Probarla con la pieza sostenida con la mano cerca del accesorio'], 1, 2.5),
    ],
  },
  {
    nombre: 'Parte II. Interpretación de una hoja de corte',
    preguntas: [
      ab('Mencione cuatro datos que debe revisar antes de comenzar a fabricar un mueble y explique por qué son importantes.', 'Puede mencionar cliente, proyecto, lugar, material, color, estilo, tipo de riel, accesorios, observaciones o fechas.', 5),
      ab('En la hoja aparecen letras para identificar las piezas, como A, B, C y D. ¿Por qué es importante conservar esos códigos durante el proceso de fabricación?', 'Los códigos relacionan cada pieza con su descripción, dimensiones, cantidad y proceso.', 5),
      ab('La pieza A, identificada como piso, indica cantidad 1, largo 200,0 y ancho 62,0. ¿Qué información representan estos números y qué debe confirmar el trabajador antes de cortar?', 'Son las dimensiones indicadas. Confirmar unidades, referencia, medidas y material antes de cortar.', 5),
      ab('En la pieza A aparecen indicaciones de canto en las columnas FRO, IZQ y DER, con medidas 200, 62 y 62. ¿Qué debe hacer el trabajador con esta información antes de pasar la pieza a la enchapadora?', 'Identificar y preparar los cantos correspondientes; confirmar el significado de las abreviaturas según la convención de WM.', 5),
      ab('La pieza B, identificada como laterales y divisor, indica una cantidad de 2. Si solamente se encuentra una pieza fabricada, ¿qué debe hacer el trabajador y qué debe revisar para detectar el faltante?', 'Comparar cantidad requerida y fabricada, revisar hoja, piezas cortadas y avance; informar el faltante.', 5),
    ],
  },
  {
    nombre: 'Parte III. Enchapadora de cantos industrial',
    preguntas: [
      su('¿Cuál es la función principal de una enchapadora de cantos?', ['Perforar los tableros para colocar bisagras', 'Aplicar y procesar el material de canto en los bordes de las piezas', 'Cortar tableros a las dimensiones indicadas', 'Lijar exclusivamente las caras de la melamina'], 1, 3),
      ab('Antes de iniciar el enchapado, ¿qué aspectos debe comprobar el operador? Mencione al menos cuatro.', 'Tipo y color de canto, referencia y orientación de pieza, ajustes del procedimiento, estado de máquina y protecciones.', 3),
      ab('¿Por qué es importante verificar el tipo y color del canto, así como la orientación de la pieza, antes de introducirla en la máquina?', 'Evitar defectos de acabado, canto incorrecto, procesamiento por el lado equivocado y desperdicio.', 3),
      su('Durante el funcionamiento, el canto queda mal adherido o la pieza presenta un defecto. ¿Cuál es la actuación correcta?', ['Introducir la mano para acomodar el canto mientras la máquina funciona', 'Continuar trabajando y revisar todos los defectos al final', 'Seguir el procedimiento seguro de parada, informar del problema y no intervenir hasta que sea seguro hacerlo', 'Aumentar la velocidad sin consultar a nadie'], 2, 3, true),
      ab('Si se produce un atasco o es necesario limpiar, ajustar o retirar residuos de una zona peligrosa, ¿qué debe hacerse?', 'Aplicar la parada y aislamiento de energías requeridos; no intervenir hasta controlar los riesgos.', 3, true),
    ],
  },
  {
    nombre: 'Parte IV. Sierra de corte para tableros',
    preguntas: [
      su('Antes de realizar un corte, ¿qué debe verificar el operador?', ['Únicamente el color del tablero', 'Las dimensiones, la referencia de la pieza, el estado de la máquina y del disco, las protecciones y el procedimiento de corte', 'Solamente que haya otra persona cerca', 'Que el disco esté girando antes de acercar la pieza'], 1, 3),
      ab('¿Por qué es importante confirmar las medidas y el sentido del corte antes de encender la sierra?', 'Evitar cortes incorrectos, desperdicio, piezas inutilizables y accidentes.', 3),
      su('Si una pieza es demasiado pequeña, inestable o difícil de sujetar con seguridad, ¿qué debe hacer el operador?', ['Sostenerla con los dedos cerca del disco', 'Improvisar una guía sin autorización', 'Detenerse y consultar el método de corte seguro, utilizando los dispositivos adecuados', 'Empujarla rápidamente para terminar antes'], 2, 3, true),
      ab('¿Qué debe hacer el operador si escucha un ruido inusual, detecta vibraciones anormales o nota que una protección no funciona correctamente?', 'Suspender la operación de forma segura, evitar el uso y comunicar la anomalía.', 3, true),
      ab('Explique por qué nunca se deben retirar residuos cerca del disco mientras la máquina está en movimiento.', 'Existe riesgo de contacto con el disco, proyección y atrapamiento. Seguir procedimientos de parada y aislamiento.', 3, true),
    ],
  },
  {
    nombre: 'Parte V. Seguridad y prevención de accidentes',
    preguntas: [
      ab('Mencione cuatro elementos o medidas de protección que pueden ser necesarios al trabajar en el taller, según el riesgo y las instrucciones aplicables.', 'Protección ocular, auditiva y respiratoria según exposición, calzado de seguridad y ropa ajustada. Evitar guantes cerca de elementos giratorios si existe riesgo de atrapamiento.', 4),
      ab('Un compañero está utilizando una máquina sin la protección correspondiente. ¿Qué debe hacer usted?', 'Advertir del peligro sin exponerse, solicitar parada segura y comunicar al responsable.', 4, true),
      ab('¿Qué procedimiento debe seguir antes de cambiar un disco, una broca o un accesorio, o de realizar una limpieza dentro de una zona peligrosa?', 'Detener el equipo y aplicar el aislamiento de energías requerido para impedir un arranque inesperado.', 4, true),
      ab('¿Por qué no se debe utilizar ropa holgada, joyas o accesorios que puedan quedar atrapados en maquinaria giratoria? ¿Qué precauciones deben tomarse con el cabello largo?', 'Pueden engancharse y arrastrar al trabajador; mantener el cabello recogido y asegurado.', 4),
      ab('Si ocurre un accidente o se detecta una condición peligrosa, aunque nadie resulte lesionado, ¿qué debe hacer el trabajador?', 'Detener actividad si es seguro, alertar al responsable, seguir el procedimiento de emergencia/reporte y evitar exposición de otros.', 4),
    ],
  },
  {
    // Sección opcional (oral/práctica): se guarda y se comenta, pero no suma a la nota de 100.
    nombre: 'Casos prácticos (opcional)',
    opcional: true,
    preguntas: [
      ab('Caso 1. Una pieza no coincide con la hoja de corte. La hoja indica una medida diferente a la pieza recibida. ¿Cómo procede antes de cortarla?', 'Registrar observaciones del evaluador.', 1),
      ab('Caso 2. Una pieza sale con el canto levantado. ¿Qué revisaría y a quién informaría antes de continuar con la producción?', 'Registrar observaciones del evaluador.', 1),
      ab('Caso 3. Un compañero necesita retirar un recorte junto a la sierra. ¿Qué debe hacer antes de acercarse a la zona de corte?', 'Registrar observaciones del evaluador.', 1, true),
      ab('Caso 4. Faltan tornillos o herrajes para terminar un mueble. ¿Cómo verifica cuáles corresponden al proyecto y qué hace si no encuentra el accesorio indicado?', 'Registrar observaciones del evaluador.', 1),
      ab('Caso 5. Un trabajador nuevo debe utilizar una máquina que nunca ha operado. ¿Qué debe hacer antes de ponerla en funcionamiento?', 'Registrar observaciones del evaluador.', 1, true),
    ],
  },
];

async function main() {
  const NOMBRE = 'Evaluación de conocimientos del taller WM';

  const existente = await prisma.exam.findFirst({ where: { nombre: NOMBRE } });
  if (existente) {
    console.log('ℹ️  El examen ya existe, no se vuelve a crear.');
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: { nombre: 'ADMINISTRADOR' } }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('No hay ningún usuario ADMINISTRADOR para asignar como creador del examen.');

  await prisma.exam.create({
    data: {
      nombre: NOMBRE,
      descripcion: 'Examen teórico de herramientas, hoja de corte, enchapadora, sierra y seguridad.',
      instrucciones:
        'Lea cuidadosamente cada pregunta. Seleccione una sola respuesta cuando corresponda. En las preguntas prácticas, explique el procedimiento que utilizaría en el taller. Si no conoce una respuesta, indíquelo; el objetivo es evaluar los conocimientos reales y detectar necesidades de capacitación.',
      duracionMinutos: 60,
      activo: true,
      createdById: admin.id,
      secciones: {
        create: SECCIONES.map((s, si) => ({
          nombre: s.nombre,
          opcional: !!s.opcional,
          orden: si,
          preguntas: {
            create: s.preguntas.map((p, pi) => ({
              tipo: p.tipo === 'SU' ? 'SELECCION_UNICA' : 'ABIERTA',
              enunciado: p.q,
              puntaje: p.pts,
              orden: pi,
              criticaSeguridad: !!p.critica,
              guiaEvaluador: p.tipo === 'AB' ? p.guia : null,
              ...(p.tipo === 'SU'
                ? { opciones: { create: p.opts.map((texto, oi) => ({ texto, orden: oi, esCorrecta: oi === p.correcta })) } }
                : {}),
            })),
          },
        })),
      },
    },
  });

  console.log('✅ Examen inicial cargado y publicado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
