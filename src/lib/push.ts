import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en las variables de entorno');
  }
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || 'mailto:soporte@example.com',
    publicKey,
    privateKey
  );
  vapidConfigured = true;
}

export async function sendPushToUser(userId: string, payload: Record<string, any>) {
  ensureVapid();
  const subs = await (prisma as any).pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404/410 = la suscripción ya no es válida (el usuario desinstaló la PWA, etc.)
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await (prisma as any).pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Error enviando push:', err?.message || err);
        }
      }
    })
  );
}
