import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, Input } from '../../components/ui';
import { useAppStore } from '../../store/useAppStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAppStore();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await register({ name, companyName, email, password });
    setLoading(false);
    if (result.success) {
      navigate('/app');
    } else {
      setError(result.error || 'Error al crear la cuenta.');
    }
  };

  return (
    <AuthLayout
      title="Crear tu estudio"
      subtitle="Configura tu cuenta de administrador en menos de un minuto."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-app-mint font-bold hover:underline">Iniciar sesión</Link>
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
          label="Tu nombre completo"
          placeholder="Ej. Maria Fernanda López"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Nombre de tu estudio"
          placeholder="Ej. Beauté Spa & Bienestar"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@estudio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <Button type="submit" loading={loading} fullWidth size="md">
          Crear mi cuenta gratis
        </Button>

        <p className="text-xs text-app-text-muted text-center">
          Al crear tu cuenta aceptas que solo el administrador puede registrar nuevos usuarios en el sistema.
        </p>
      </form>
    </AuthLayout>
  );
};
