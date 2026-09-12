'use client';
import { useEffect, useState } from 'react';
import { pushApi } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'unsubscribed' | 'subscribed' | 'denied' | 'loading';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');

  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? 'subscribed' : 'unsubscribed');
    };
    check().catch(() => setStatus('unsupported'));
  }, []);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus('denied');
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY');
      return;
    }

    const reg = await navigator.serviceWorker.register('/service-worker.js');
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await pushApi.subscribe(subscription.toJSON());
    setStatus('subscribed');
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await pushApi.unsubscribe(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus('unsubscribed');
  };

  return { status, subscribe, unsubscribe };
}
