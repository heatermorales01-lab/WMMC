import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const POST = withAuth(async (req, _ctx, user) => {
  try {
    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new AppError('Suscripción push inválida', 400);
    }

    const subscription = await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: user.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ ok: true, data: subscription });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAuth(async (req) => {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) throw new AppError('endpoint requerido', 400);

    await (prisma as any).pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true, message: 'Suscripción eliminada' });
  } catch (e) { return handleError(e); }
});
