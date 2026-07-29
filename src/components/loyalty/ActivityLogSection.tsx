import React, { useState } from 'react';
import { Phone, MessageCircle, User, MessageSquare, Star, Edit, Filter, Plus, CheckCircle, XCircle, UserX } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

interface ActivityLogSectionProps {
  activities: ActivityEntry[];
  onRegisterClick: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  reactivation_attempt: 'Reactivacion',
  note: 'Nota',
  manual_points: 'Ajuste puntos',
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

const FILTER_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'reactivation_attempt', label: 'Reactivacion' },
  { value: 'note', label: 'Notas' },
  { value: 'manual_points', label: 'Ajuste de puntos' },
  { value: 'redemption', label: 'Canjes' },
  { value: 'appointment_completed', label: 'Servicios completados' },
  { value: 'appointment_cancelled', label: 'Citas canceladas' },
  { value: 'appointment_no_show', label: 'No asistio' },
];

export const ActivityLogSection: React.FC<ActivityLogSectionProps> = ({
  activities,
  onRegisterClick,
}) => {
  const [filter, setFilter] = useState('');

  const filteredActivities = filter
    ? activities.filter((a) => a.action === filter)
    : activities;

  return (
    <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-app-gray-100 pb-2">
        <h5 className="text-sm font-black text-app-text-primary uppercase tracking-wider">
          Historial de Actividades
        </h5>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-app-gray-50 rounded-lg px-2.5 py-1.5 border border-app-gray-150">
            <Filter className="w-3.5 h-3.5 text-app-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-app-text-secondary outline-none cursor-pointer"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onRegisterClick}
            className="flex items-center gap-1.5 px-3 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
        {filteredActivities.length === 0 ? (
          <p className="text-sm text-app-gray-500 italic text-center py-8">
            {activities.length === 0
              ? 'Sin actividades registradas para este cliente.'
              : 'No hay actividades con el filtro seleccionado.'}
          </p>
        ) : (
          filteredActivities.map((entry) => {
            const IconComponent = ACTION_ICONS[entry.action] || User;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-2.5 p-2.5 bg-app-gray-50 rounded-xl border border-app-gray-100 hover:border-app-gray-200 transition-all"
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
  );
};
