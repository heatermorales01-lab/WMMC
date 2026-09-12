import { prisma } from '@/lib/prisma';

const TIME_ZONE = "America/Costa_Rica";

/**
 * Devuelve la fecha actual del servidor (UTC).
 * Siempre es la que se debe guardar en la base de datos.
 */
export function now(): Date {
    return new Date();
}

/**
 * Obtiene únicamente el año, mes y día en horario de Costa Rica.
 */
function getCRParts(date: Date) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date);

    return {
        year: Number(parts.find(p => p.type === "year")!.value),
        month: Number(parts.find(p => p.type === "month")!.value),
        day: Number(parts.find(p => p.type === "day")!.value),
    };
}


const DEFAULT_MINUTOS: Record<string, number> = { DESAYUNO: 20, ALMUERZO: 40, CAFE: 10 };

export function diffMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60000;
}

export function startOfDay(date: Date): Date {

    const { year, month, day } = getCRParts(date);

    return new Date(Date.UTC(year, month - 1, day, 6, 0, 0, 0));

}

export function endOfDay(date: Date): Date {

    const { year, month, day } = getCRParts(date);

    return new Date(Date.UTC(year, month - 1, day + 1, 5, 59, 59, 999));

}
export function startOfWeek(date: Date): Date {

    const d = new Date(date);

    const day = d.getDay();

    d.setDate(
        d.getDate() + (day === 0 ? -6 : 1 - day)
    );

    d.setHours(0, 0, 0, 0);

    return d;
}

export function endOfWeek(date: Date): Date {

    const end = startOfWeek(date);

    end.setDate(end.getDate() + 6);

    end.setHours(23, 59, 59, 999);

    return end;
}

export async function getMinutosPermitidos(): Promise<Record<string, number>> {
  const policies = await (prisma as any).breakPolicy.findMany();
  const map: Record<string, number> = { ...DEFAULT_MINUTOS };
  for (const p of policies) map[p.tipo] = p.minutosPermitidos;
  return map;
}

const DEFAULT_UMBRAL_HORAS = 50;

// Umbral semanal (en horas) a partir del cual se aplica la tarifa de exceso.
// Configuración global de una sola fila, igual patrón que BreakPolicy.
export async function getUmbralHoras(): Promise<number> {
  const config = await (prisma as any).wageThreshold.findFirst();
  return config?.umbralHoras ?? DEFAULT_UMBRAL_HORAS;
}

// Calcula el salario semanal aplicando dos tarifas: `tarifaHora` para las
// primeras `umbralHoras` horas, y `tarifaHoraExceso` para las horas que
// superen ese umbral. Si no hay tarifaHoraExceso configurada, se usa
// tarifaHora para todo (comportamiento anterior, sin romper configs existentes).
export function calcularSalario(
  totalHoras: number,
  tarifaHora: number,
  tarifaHoraExceso: number | null | undefined,
  umbralHoras: number
): number {
  const horasNormales = Math.min(totalHoras, umbralHoras);
  const horasExceso = Math.max(0, totalHoras - umbralHoras);
  const tarifaExceso = tarifaHoraExceso ?? tarifaHora;
  return Number((horasNormales * tarifaHora + horasExceso * tarifaExceso).toFixed(2));
}

export function getFase(entry: any): string {
  if (!entry) return 'SIN_INICIAR';
  if (entry.horaSalida) return 'FINALIZADO';
  if (entry.cafeInicio && !entry.cafeFin) return 'EN_CAFE';
  if (entry.almuerzoInicio && !entry.almuerzoFin) return 'EN_ALMUERZO';
  if (entry.desayunoInicio && !entry.desayunoFin) return 'EN_DESAYUNO';
  return 'TRABAJANDO';
}

export function calcularHorasPagas(entry: any, minutos: Record<string, number>): { horas: number; minutosExcedentes: number } {
  if (!entry.horaSalida) return { horas: 0, minutosExcedentes: 0 };
  const total = diffMinutes(new Date(entry.horaEntrada), new Date(entry.horaSalida));
  let excedente = 0;
  const breaks: [string, any, any][] = [
    ['DESAYUNO', entry.desayunoInicio, entry.desayunoFin],
    ['ALMUERZO', entry.almuerzoInicio, entry.almuerzoFin],
    ['CAFE', entry.cafeInicio, entry.cafeFin],
  ];
  for (const [tipo, inicio, fin] of breaks) {
    if (inicio && fin) {
      const dur = diffMinutes(new Date(inicio), new Date(fin));
      const perm = minutos[tipo] ?? 0;
      if (dur > perm) excedente += dur - perm;
    }
  }
  return { horas: Number((Math.max(0, total - excedente) / 60).toFixed(2)), minutosExcedentes: Math.round(excedente) };
}

export const BREAK_FIELDS: Record<string, { start: string; end: string; label: string }> = {
  desayuno: { start: 'desayunoInicio', end: 'desayunoFin', label: 'Desayuno' },
  almuerzo: { start: 'almuerzoInicio', end: 'almuerzoFin', label: 'Almuerzo' },
  cafe: { start: 'cafeInicio', end: 'cafeFin', label: 'Café' },
};
