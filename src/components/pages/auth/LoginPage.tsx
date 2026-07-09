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
          className="
    relative
    min-h-screen
    flex
    items-center pt-10
    justify-center
    lg:justify-end lg:pr-24 xl:pr-32
    px-5
    md:px-10
    lg:px-20
    overflow-hidden
    bg-cover
    lg:bg-center
    bg-left
    bg-no-repeat
  "
          style={{
              backgroundImage: 'url(/fondo.jpeg)',
          }}
      >
      {/* Overlay para legibilidad en móvil, donde el form queda centrado sobre la imagen */}
          <div
              className="
        absolute
        inset-0
        bg-gradient-to-br
        from-black/45
        via-black/20
        to-transparent
    "
          />
          <div
              className="
        relative
        w-full
        max-w-lg
        backdrop-blur-xl
        bg-white/88
        border
        border-white/40
        rounded-3xl
        shadow-2xl
        p-10
        md:p-10
    "
          >

              {/* Logo solo en tablet y celular */}
              <div className="flex justify-center mb-0 lg:hidden">
                  <img
                      src="/logoLogin.png"
                      alt="WM Muebles"
                      className="h-50 md:h-56 w-auto drop-shadow-xl"
                  />
              </div>

              <h2 className="text-2xl font-display font-bold text-wood-500">
                  Iniciar sesión
              </h2>

              <p className="text-sm text-slate-500 mt-1 mb-8">
                  WM Muebles Contemporáneos — Sistema ERP
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                  <div>
                      <label className="label text-white">Correo electrónico</label>
                      <input
                          type="email"
                          className={`input ${errors.correo ? 'input-error' : ''}`}
                          placeholder="admin@wmmuebles.com"
                          {...register('correo')}
                      />
                      {errors.correo && <p className="field-error">{errors.correo.message}</p>}
                  </div>

                  <div>
                      <label className="label text-white">Contraseña</label>
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

              <p className="text-center text-xs text-slate-500 mt-8">
                  © {new Date().getFullYear()} WM Muebles Contemporáneos
              </p>

          </div>
      
    </div>
  );
}
