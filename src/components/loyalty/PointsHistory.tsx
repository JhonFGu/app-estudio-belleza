import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PointsHistoryEntry {
  id: string;
  points: number;
  type: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

interface PointsHistoryProps {
  history: PointsHistoryEntry[];
}

export const PointsHistory: React.FC<PointsHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <p className="text-sm text-app-gray-500 italic text-center py-4">
        Sin movimientos de puntos.
      </p>
    );
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'earned':
        return {
          icon: TrendingUp,
          color: 'text-emerald-500',
          bg: 'bg-emerald-100',
          prefix: '+',
        };
      case 'redeemed':
        return {
          icon: TrendingDown,
          color: 'text-app-pink',
          bg: 'bg-app-pink-100',
          prefix: '',
        };
      default:
        return {
          icon: Minus,
          color: 'text-app-gray-500',
          bg: 'bg-app-gray-100',
          prefix: '',
        };
    }
  };

  const recentHistory = history.slice(0, 10);

  return (
    <div className="space-y-2">
      <span className="text-xs text-app-gray-500 font-bold uppercase tracking-wider block">
        Historial de Puntos
      </span>

      <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
        {recentHistory.map((entry) => {
          const config = getTypeConfig(entry.type);
          const Icon = config.icon;

          return (
            <div
              key={entry.id}
              className="flex items-center gap-2.5 p-2 bg-app-gray-50 rounded-xl border border-app-gray-100"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-app-text-primary truncate">
                  {entry.description || 'Movimiento de puntos'}
                </p>
                <span className="text-[10px] text-app-gray-500">
                  {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: es })} &middot; Saldo: {entry.balanceAfter}
                </span>
              </div>

              <span className={`text-xs font-extrabold shrink-0 ${entry.points > 0 ? 'text-emerald-500' : 'text-app-pink'}`}>
                {config.prefix}{entry.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
