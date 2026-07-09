'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const { user, token } = useAuthStore();

    useEffect(() => {
        if (!user || !token) {
            router.replace('/login');
        }
    }, [user, token, router]);

    if (!user || !token) {
        return null;
    }

    return <>{children}</>;
}