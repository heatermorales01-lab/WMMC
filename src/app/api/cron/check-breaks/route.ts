import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { getMinutosPermitidos, diffMinutes, BREAK_FIELDS } from '@/lib/timesheet-helpers';
import { sendPushToUser } from '@/lib/push';

// Esta ruta NO usa withAuth/withAdmin (no la llama un usuario logueado en
// el navegador) — la protege un secreto compartido (CRON_SECRET), que debe
// configurarse igual en el scheduler externo (Supabase pg_cron + pg_net,
// o Vercel Cron) y en las variables de entorno de este proyecto.
function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // si no está configurado, no se ejecuta nada (fail-safe)
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

const TIPO_LABEL: Record<string, string> = { DESAYUNO: 'Desayuno', ALMUERZO: 'Almuerzo', CAFE: 'Café' };

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const minutosPermitidos = await getMinutosPermitidos();

    // Solo jornadas abiertas (sin salida) pueden tener un descanso en curso.
    const entries = await (prisma as any).timesheetEntry.findMany({
      where: { horaSalida: null, archivado: false },
    });

    let alertsSent = 0;

    for (const entry of entries) {
      for (const [key, fields] of Object.entries(BREAK_FIELDS)) {
        const tipo = key.toUpperCase(); // desayuno -> DESAYUNO, etc.
        const start = entry[fields.start];
        const end = entry[fields.end];
        if (!start || end) continue; // no está en ese descanso ahora mismo

        const minutos = diffMinutes(new Date(start), new Date());
        const permitido = minutosPermitidos[tipo] ?? 0;
        if (minutos < permitido) continue;

        // Intenta registrar la alerta; si ya existe (unique constraint), no reenvía.
        try {
          await (prisma as any).pushAlertLog.create({
            data: { timesheetEntryId: entry.id, tipo },
          });
        } catch {
          continue; // ya se había notificado para este descanso
        }

        await sendPushToUser(entry.userId, {
          title: `🚨 ${TIPO_LABEL[tipo] || tipo} terminó`,
          body: 'Regresa a la app y marca "Finalizar descanso".',
          tag: `break-${tipo}`,
          url: '/horario',
        });
        alertsSent++;
      }
    }

    return NextResponse.json({ ok: true, checked: entries.length, alertsSent });
  } catch (e) { return handleError(e); }
}
