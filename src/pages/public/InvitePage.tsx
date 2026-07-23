import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, Input } from '../../components/ui';
import { useAppStore } from '../../store/useAppStore';

export const InvitePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { acceptInvite } = useAppStore();

  const tenantId = searchParams.get('t') || '';
  const role = searchParams.get('role') || 'specialist';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!tenantId || !role) {
    return (
      <AuthLayout title="Enlace inválido" subtitle="Este enlace de invitación no es válido o ha expirado.">
        <div className="text-center">
          <p className="text-xs text-app-text-secondary mb-4">Solicita un nuevo enlace al administrador de tu estudio.</p>
          <Link to="/" className="text-app-mint font-bold text-sm hover:underline">Volver al inicio</Link>
        </div>
      </AuthLayout>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    receptionist: 'Recepción',
    specialist: 'Especialista',
    accountant: 'Contabilidad',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await acceptInvite({ tenantId, role, name, email, password });
    setLoading(false);
    if (result.success) {
      navigate('/app');
    } else {
      setError(result.error || 'Error al aceptar la invitación.');
    }
  };

  return (
    <AuthLayout
      title="Completar registro"
      subtitle={`Has sido invitado como ${roleLabels[role] || role}. Crea tu contraseña para empezar.`}
      footer={
        <Link to="/" className="text-app-mint font-bold hover:underline">Volver al inicio</Link>
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
          placeholder="Ej. Camila Díaz"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          Crear mi cuenta
        </Button>
      </form>
    </AuthLayout>
  );
};
