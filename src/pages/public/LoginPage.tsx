import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, Input } from '../../components/ui';
import { useAppStore } from '../../store/useAppStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginDemo } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/app');
    } else {
      setError(result.error || 'Error al iniciar sesión.');
    }
  };

  const handleDemo = async () => {
    setError('');
    setLoading(true);
    await loginDemo();
    setLoading(false);
    navigate('/app');
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresa a tu cuenta para gestionar tu estudio."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-app-mint font-bold hover:underline">Crear cuenta gratis</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
            {error}
          </div>
        )}

        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@estudio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <Input
            label="Contraseña"
            type="password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" loading={loading} fullWidth size="md">
          Iniciar sesión
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-app-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-app-text-muted font-medium">o</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleDemo}
        >
          Explorar demo
        </Button>
      </form>
    </AuthLayout>
  );
};
