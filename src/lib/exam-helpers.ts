// Helpers compartidos del módulo de evaluaciones. Mantiene en un solo
// lugar la lógica de "qué cuenta para el puntaje" para que enviar un
// examen (autocalificación) y finalizar una revisión (recálculo) usen
// exactamente las mismas reglas.
//
// Regla central: una pregunta cuenta para el puntaje del examen SOLO si
// pertenece a una sección NO opcional. Las secciones opcionales (ej.
// "Casos prácticos") se guardan y se pueden comentar, pero no suman a
// la nota de 100.

export type TipoPreguntaExamen = 'SELECCION_UNICA' | 'ABIERTA';

export interface PreguntaParaCalculo {
    id: string;
    tipo: TipoPreguntaExamen;
    puntaje: number;
    criticaSeguridad: boolean;
    // Solo presente cuando se cargaron las opciones (autocalificación al enviar).
    opciones?: { id: string; esCorrecta: boolean }[];
}

export interface SeccionParaCalculo {
    opcional: boolean;
    preguntas: PreguntaParaCalculo[];
}

export interface RespuestaParaCalculo {
    questionId: string;
    puntajeObtenido: number | null;
    calificada: boolean;
}

// Preguntas que sí cuentan para la nota (excluye las de secciones opcionales).
export function preguntasQueCuentan(secciones: SeccionParaCalculo[]): PreguntaParaCalculo[] {
    return secciones.filter((s) => !s.opcional).flatMap((s) => s.preguntas);
}

export function puntajeMaximoExamen(secciones: SeccionParaCalculo[]): number {
    return preguntasQueCuentan(secciones).reduce((acc, p) => acc + p.puntaje, 0);
}

// ¿Hay alguna pregunta (que cuenta para la nota) sin calificar todavía,
// o marcada como crítica de seguridad? En cualquiera de los dos casos el
// intento debe quedar EN_REVISION, nunca saltar directo a REVISADO.
export function requiereRevisionManual(
    secciones: SeccionParaCalculo[],
    respuestasPorPregunta: Map<string, RespuestaParaCalculo>
): boolean {
    const preguntas = preguntasQueCuentan(secciones);
    return preguntas.some((p) => {
        if (p.criticaSeguridad) return true;
        if (p.tipo === 'ABIERTA') {
            const r = respuestasPorPregunta.get(p.id);
            return !r || !r.calificada;
        }
        return false;
    });
}

export function sumarPuntaje(
    secciones: SeccionParaCalculo[],
    respuestasPorPregunta: Map<string, RespuestaParaCalculo>,
    tipo: TipoPreguntaExamen
): number {
    const preguntas = preguntasQueCuentan(secciones).filter((p) => p.tipo === tipo);
    return preguntas.reduce((acc, p) => {
        const r = respuestasPorPregunta.get(p.id);
        return acc + (r?.calificada ? Number(r.puntajeObtenido || 0) : 0);
    }, 0);
}
