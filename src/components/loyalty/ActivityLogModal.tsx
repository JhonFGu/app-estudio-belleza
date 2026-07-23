import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { Phone, MessageCircle, User, MessageSquare, Star, Edit, CheckCircle, XCircle, UserX } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityEntry[];
  onRegister: (action: string, description: string, metadata?: any) => Promise<void>;
}

const ACTION_LABELS: Record<string, string> = {
  reactivation_attempt: 'Intento de reactivacion',
  note: 'Nota',
  manual_points: 'Ajuste de puntos',
  redemption: 'Canje',
  appointment_completed: 'Servicio completado',
  appointment_cancelled: 'Cita cancelada',
  appointment_no_show: 'No asistio',
};

const ACTION_ICONS: Record<string, React.FC<{ className?: string }>> = {
  reactivation_attempt: Phone,
  note: Edit,
  manual_points: Star,
  redemption: MessageSquare,
  appointment_completed: CheckCircle,
  appointment_cancelled: XCircle,
  appointment_no_show: UserX,
};

const ACTION_BG: Record<string, string> = {
  reactivation_attempt: 'bg-amber-100 text-amber-700',
  note: 'bg-blue-100 text-blue-700',
  manual_points: 'bg-emerald-100 text-emerald-700',
  redemption: 'bg-app-mint-100 text-app-mint',
  appointment_completed: 'bg-purple-100 text-purple-700',
  appointment_cancelled: 'bg-red-100 text-red-700',
  appointment_no_show: 'bg-orange-100 text-orange-700',
};

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  activities,
  onRegister,
}) => {
  const [action, setAction] = useState('note');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAction('note');
      setDescription('');
      setChannel('whatsapp');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const metadata = action === 'reactivation_attempt' ? { channel } : undefined;
      await onRegister(action, description.trim(), metadata);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Actividad del Cliente" size="lg">
      <div className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-3 bg-app-gray-50 rounded-2xl p-4 border border-app-gray-150">
          <h6 className="text-xs font-extrabold text-app-text-primary uppercase tracking-wider">
            Nueva Actividad
          </h6>

          <div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-app-gray-200 rounded-xl text-sm font-medium outline-none focus:border-app-mint"
            >
              <option value="note">Nota</option>
              <option value="reactivation_attempt">Intento de reactivacion</option>
              <option value="manual_points">Ajuste de puntos</option>
              <option value="redemption">Canje</option>
            </select>
          </div>

          {action === 'reactivation_attempt' && (
            <div>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-app-gray-200 rounded-xl text-sm font-medium outline-none focus:border-app-mint"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="llamada">Llamada</option>
                <option value="presencial">Presencial</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          )}

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la actividad..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-app-gray-200 rounded-xl text-sm font-medium outline-none focus:border-app-mint resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="w-full py-2.5 bg-app-mint hover:bg-app-mint-600 disabled:bg-app-gray-200 text-white disabled:text-app-gray-400 rounded-xl text-sm font-bold transition-all"
          >
            {submitting ? 'Registrando...' : 'Registrar Actividad'}
          </button>
        </form>

        <div className="space-y-2">
          <span className="text-xs text-app-gray-500 font-bold uppercase tracking-wider block">
            Historial de Actividades
          </span>

          <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-sm text-app-gray-500 italic text-center py-6">
                Sin actividades registradas.
              </p>
            ) : (
              activities.map((entry) => {
                const IconComponent = ACTION_ICONS[entry.action] || User;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-app-gray-100"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ACTION_BG[entry.action] || 'bg-app-gray-100 text-app-gray-500'}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-app-text-primary">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                        {entry.metadata?.channel && (
                          <span className="text-[10px] text-app-gray-500 flex items-center gap-0.5">
                            <MessageCircle className="w-2.5 h-2.5" />
                            {entry.metadata.channel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-app-text-secondary mt-0.5 leading-relaxed">
                        {entry.description}
                      </p>
                      <span className="text-[10px] text-app-gray-400 block mt-0.5">
                        {new Date(entry.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
