'use client';
import { Toaster } from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);
  if (!token) return null;
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: '14px' }, success: { iconTheme: { primary: '#d99c0b', secondary: '#fff' } } }} />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
