import { useState, useEffect } from 'react';
import { Copy, Check, Link as LinkIcon, ShieldAlert, User as UserIcon, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Modal, Button, Input } from '../../components/ui';

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { currentTenant } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'receptionist' | 'specialist'>('specialist');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPhone('');
      setRole('specialist');
      setCopied(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/invite?t=${currentTenant?.id || 'demo'}&role=${role}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg('Por favor completa el nombre y correo electrónico.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant?.id || '',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
          active: true,
        }),
      });

      if (response.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Error al agregar el usuario');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitar Miembro a la Clínica"
      subtitle={currentTenant?.name || 'Centro de Belleza'}
      icon={<Sparkles />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nombre Completo *"
          placeholder="Ej. Dra. Maria Fernanda Lopez"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Correo Electrónico *"
            type="email"
            placeholder="maria@clinicabeaute.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Teléfono / Celular"
            type="tel"
            placeholder="+57 300 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-app-text-primary uppercase tracking-wider mb-2">
            Rol en la Plataforma
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div 
              onClick={() => setRole('specialist')}
              className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                role === 'specialist' 
                  ? 'border-app-mint bg-app-mint-50/60' 
                  : 'border-app-gray-200 hover:border-app-gray-300'
              }`}
            >
              <UserIcon className={`w-5 h-5 mb-1 ${role === 'specialist' ? 'text-app-mint' : 'text-app-gray-500'}`} />
              <h4 className={`font-bold text-xs ${role === 'specialist' ? 'text-app-mint' : 'text-app-text-primary'}`}>Especialista</h4>
              <p className="text-[10px] text-app-gray-500 mt-0.5">Opera citas y tratamientos asignados.</p>
            </div>

            <div 
              onClick={() => setRole('receptionist')}
              className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                role === 'receptionist' 
                  ? 'border-blue-500 bg-blue-50/60' 
                  : 'border-app-gray-200 hover:border-app-gray-300'
              }`}
            >
              <UserIcon className={`w-5 h-5 mb-1 ${role === 'receptionist' ? 'text-blue-600' : 'text-app-gray-500'}`} />
              <h4 className={`font-bold text-xs ${role === 'receptionist' ? 'text-blue-700' : 'text-app-text-primary'}`}>Recepción</h4>
              <p className="text-[10px] text-app-gray-500 mt-0.5">Gestión de agenda, clientes y caja POS.</p>
            </div>
            
            <div 
              onClick={() => setRole('admin')}
              className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                role === 'admin' 
                  ? 'border-purple-500 bg-purple-50/60' 
                  : 'border-app-gray-200 hover:border-app-gray-300'
              }`}
            >
              <ShieldAlert className={`w-5 h-5 mb-1 ${role === 'admin' ? 'text-purple-600' : 'text-app-gray-500'}`} />
              <h4 className={`font-bold text-xs ${role === 'admin' ? 'text-purple-700' : 'text-app-text-primary'}`}>Administrador</h4>
              <p className="text-[10px] text-app-gray-500 mt-0.5">Acceso total a finanzas, usuarios y ajustes.</p>
            </div>
          </div>
        </div>

        {/* Enlace de Registro Dinámico */}
        <div>
          <label className="block text-xs font-bold text-app-text-primary uppercase tracking-wider mb-1.5">
            Enlace de Registro Directo
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-app-gray-50 border border-app-gray-200 rounded-xl px-3 py-2.5 overflow-hidden">
              <LinkIcon className="w-4 h-4 text-app-gray-500 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium text-app-text-primary truncate select-all">{inviteLink}</span>
            </div>
            <button 
              type="button"
              onClick={handleCopy}
              className="bg-app-text-primary hover:bg-black text-white p-2.5 rounded-xl transition-colors flex-shrink-0"
              title="Copiar Enlace"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-app-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear Colaborador
          </Button>
        </div>
      </form>
    </Modal>
  );
}
