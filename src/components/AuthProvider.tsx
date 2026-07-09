'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, token, setAuth, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                // Ya existe una sesión en memoria
                const savedToken = localStorage.getItem('wm_token');

                if (user && savedToken) {
                    setLoading(false);
                    return;
                }

                if (!savedToken) {
                    setLoading(false);
                    return;
                }

                // Buscar token guardado
                //const savedToken = localStorage.getItem('wm_token');

                //if (!savedToken) {
                //    setLoading(false);
                //    return;
                //}

                // Validar token y obtener usuario actualizado
                const currentUser = await authApi.me();

                setAuth(
                    {
                        id: currentUser.id,
                        nombre: currentUser.nombre,
                        correo: currentUser.correo,
                        role: currentUser.role.nombre,
                    },
                    savedToken
                );
            } catch (error) {
                console.error(error);

                logout();
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <img
                        src="/logo.png"
                        alt="WM"
                        className="h-14 mx-auto mb-4"
                    />
                    <p className="text-slate-500 text-sm">
                        Restaurando sesión...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}