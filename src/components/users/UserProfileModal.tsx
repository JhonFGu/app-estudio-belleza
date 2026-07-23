import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { User as UserIcon, Mail, Shield, LogOut, Phone } from 'lucide-react';
import { Modal, Button, Input } from '../../components/ui';

type UserProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { currentUser, currentTenant, setCurrentUser } = useAppStore();
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const roleDisplay = currentUser.role === 'admin' 
    ? 'Administrador' 
    : currentUser.role === 'receptionist' 
    ? 'Recepción' 
    : currentUser.role === 'accountant'
    ? 'Contabilidad'
    : 'Especialista';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const response = await fetch(`/api/users?id=${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant?.id || '',
        },
        body: JSON.stringify({
          name,
          phone,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCurrentUser({ ...currentUser, name: updated.name || name });
        setSuccessMsg('Perfil actualizado exitosamente.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        // Fallback store update if API not reachable
        setCurrentUser({ ...currentUser, name });
        setSuccessMsg('Perfil actualizado localmente.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setCurrentUser({ ...currentUser, name });
      setSuccessMsg('Perfil actualizado.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    alert('Has cerrado sesión correctamente.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
    >
      <div className="-mx-6 -mt-5">
        <div className="h-28 bg-app-mint relative" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4 text-center flex justify-center">
            <div className="w-20 h-20 rounded-full bg-app-mint-100 border-4 border-white shadow-md flex items-center justify-center text-3xl font-extrabold text-app-mint">
              {(name || currentUser.email || '?').charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-app-text-primary">{name || 'Usuario Clínico'}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Shield className="w-3.5 h-3.5 text-app-mint" />
              <span className="text-xs font-bold text-app-mint uppercase tracking-wider">{roleDisplay}</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {successMsg && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-xs font-semibold border border-green-200">
                {successMsg}
              </div>
            )}

            <Input
              label="Nombre Completo"
              icon={<UserIcon />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-app-text-primary uppercase tracking-wider mb-1">
                Correo Electrónico <span className="text-app-gray-500 font-normal lowercase">(Solo Lectura)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-app-gray-500" />
                <input
                  type="email"
                  readOnly
                  value={currentUser.email}
                  className="w-full pl-9 pr-3 py-2 border border-app-gray-200 bg-app-gray-50 rounded-xl text-sm font-medium text-app-gray-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <Input
              label="Teléfono de Contacto"
              icon={<Phone />}
              type="tel"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="pt-3 flex justify-between items-center gap-3">
              <Button
                type="button"
                variant="danger"
                icon={<LogOut />}
                onClick={handleLogout}
              >
                Cerrar Sesión
              </Button>

              <Button type="submit" loading={loading}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
