import React from 'react';
import { AlertCircle, Phone, MessageCircle } from 'lucide-react';

interface ReactivateAlertProps {
  daysSinceLastVisit: number;
  threshold: number;
  clientName: string;
  clientPhone: string;
  onRegisterContact: () => void;
}

export const ReactivateAlert: React.FC<ReactivateAlertProps> = ({
  daysSinceLastVisit,
  threshold,
  clientName,
  clientPhone,
  onRegisterContact,
}) => {
  const severity = daysSinceLastVisit >= threshold * 2 ? 'high' : 'medium';

  const bgClass = severity === 'high'
    ? 'bg-red-50 border-red-200'
    : 'bg-amber-50 border-amber-200';

  const textClass = severity === 'high'
    ? 'text-red-700'
    : 'text-amber-700';

  const iconClass = severity === 'high'
    ? 'text-red-500'
    : 'text-amber-500';

  return (
    <div className={`p-3 rounded-2xl border ${bgClass} space-y-2.5`}>
      <div className="flex items-start gap-2">
        <AlertCircle className={`w-4 h-4 ${iconClass} shrink-0 mt-0.5`} />
        <div>
          <h6 className={`text-xs font-extrabold ${textClass} uppercase`}>
            Cliente Inactivo
          </h6>
          <p className="text-xs text-app-text-secondary mt-0.5 leading-tight">
            {clientName || 'Cliente'} lleva <strong>{daysSinceLastVisit} dias</strong> sin visitar.
            Umbral de reactivacion: {threshold} dias.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRegisterContact}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 rounded-lg text-xs font-bold transition-all"
        >
          <Phone className="w-3 h-3" />
          Registrar Contacto
        </button>
        {clientPhone && (
          <a
            href={`https://wa.me/${clientPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
};
