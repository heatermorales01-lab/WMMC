import { prisma } from '@/lib/prisma';

const DEFAULT_MINUTOS: Record<string, number> = { DESAYUNO: 20, ALMUERZO: 40, CAFE: 10 };

export function diffMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60000;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0); return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date); d.setHours(23, 59, 59, 999); return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

export async function getMinutosPermitidos(): Promise<Record<string, number>> {
  const policies = await (prisma as any).breakPolicy.findMany();
  const map: Record<string, number> = { ...DEFAULT_MINUTOS };
  for (const p of policies) map[p.tipo] = p.minutosPermitidos;
  return map;
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
