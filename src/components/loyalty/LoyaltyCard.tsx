import React from 'react';
import { Star, Clock, Gift } from 'lucide-react';

interface LoyaltyCardProps {
  balance: number;
  daysSinceLastVisit: number;
  inactivityThreshold: number;
  onRedeemClick: () => void;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  balance,
  daysSinceLastVisit,
  inactivityThreshold,
  onRedeemClick,
}) => {
  const getStatusColor = () => {
    if (daysSinceLastVisit >= inactivityThreshold) return 'text-app-pink';
    if (daysSinceLastVisit >= inactivityThreshold * 0.7) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getStatusBg = () => {
    if (daysSinceLastVisit >= inactivityThreshold) return 'bg-app-pink-100';
    if (daysSinceLastVisit >= inactivityThreshold * 0.7) return 'bg-amber-100';
    return 'bg-emerald-100';
  };

  const getStatusLabel = () => {
    if (daysSinceLastVisit >= inactivityThreshold) return 'Inactivo';
    if (daysSinceLastVisit >= inactivityThreshold * 0.7) return 'En Riesgo';
    return 'Activo';
  };

  const statusColor = getStatusColor();
  const statusBg = getStatusBg();
  const statusLabel = getStatusLabel();

  const progressMax = 200;
  const progressValue = Math.min(balance, progressMax);
  const progressPct = (progressValue / progressMax) * 100;

  const nextLevelPoints = balance >= progressMax ? 'Maximo nivel' : `${progressMax - balance} pts para max.`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${statusBg} ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-xs text-app-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysSinceLastVisit === 0 ? 'Hoy' : `${daysSinceLastVisit} dias`}
        </span>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="text-2xl font-black text-amber-700">{balance}</span>
        </div>
        <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">Puntos Acumulados</span>

        <div className="mt-3 space-y-1">
          <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-amber-500 font-medium">{nextLevelPoints}</span>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRedeemClick}
          disabled={balance <= 0}
          className="px-6 flex items-center justify-center gap-1.5 py-2 bg-app-mint hover:bg-app-mint-600 disabled:bg-app-gray-200 text-white disabled:text-app-gray-400 rounded-xl text-xs font-bold transition-all"
        >
          <Gift className="w-3.5 h-3.5" />
          Canjear
        </button>
      </div>
    </div>
  );
};
