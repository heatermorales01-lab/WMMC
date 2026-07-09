'use client';
import { useEffect, useState } from 'react'; import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
// fondo image - place at public/fondo.jpeg
import { useAuthStore } from '@/store/auth.store';
import { Spinner } from '@/components/ui';

const schema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    try {
      const result = await authApi.login(data.correo, data.password);
        setAuth(result.user, result.token);

        await new Promise(resolve => setTimeout(resolve, 100));

      toast.success(`Bienvenido, ${result.user.nombre}`);
        router.replace('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Credenciales incorrectas');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center lg:justify-end p-4 sm:p-6 lg:pr-20 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/fondo.jpeg)' }}
    >
      {/* Overlay para legibilidad en móvil, donde el form queda centrado sobre la imagen */}
      <div className="absolute inset-0 bg-black/30 lg:bg-transparent lg:bg-gradient-to-l lg:from-black/10 lg:via-transparent lg:to-transparent" />

      <div className="relative w-full max-w-sm sm:max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 sm:mb-6">WM Muebles Contemporáneos — Sistema ERP</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className={`input ${errors.correo ? 'input-error' : ''}`}
                placeholder="admin@wmmuebles.com"
                {...register('correo')}
              />
              {errors.correo && <p className="field-error">{errors.correo.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" /> : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="relative text-center text-white/80 lg:text-wood-200 text-xs mt-5 drop-shadow">
          © {new Date().getFullYear()} WM Muebles Contemporáneos
        </p>
      </div>
    </div>
  );
}
