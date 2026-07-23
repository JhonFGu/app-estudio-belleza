import React, { useState } from 'react';
import { Modal } from '../ui';
import { Gift, Star, AlertCircle, ShoppingBag, Percent } from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: string;
  value?: string | number;
}

interface RedeemedEntry {
  id: string;
  points: number;
  description: string;
  createdAt: string;
}

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientBalance: number;
  rewards: Reward[];
  redeemedHistory: RedeemedEntry[];
  onRedeem: (rewardId: string) => Promise<void>;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  clientBalance,
  rewards,
  redeemedHistory,
  onRedeem,
}) => {
  const [tab, setTab] = useState<'catalog' | 'history'>('catalog');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);

  const handleRedeem = async (reward: Reward) => {
    setRedeeming(reward.id);
    try {
      await onRedeem(reward.id);
      setConfirmReward(null);
    } catch {
    } finally {
      setRedeeming(null);
    }
  };

  const getRewardLabel = (type: string, value?: string | number) => {
    switch (type) {
      case 'discount_pct':
        return `${value}% descuento`;
      case 'discount_fixed':
        return `S/${parseFloat(String(value)).toLocaleString('es-CO')} desc.`;
      case 'free_service':
        return 'Servicio gratis';
      default:
        return type;
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount_pct':
      case 'discount_fixed':
        return Percent;
      case 'free_service':
        return Gift;
      default:
        return Gift;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Catalogo de Recompensas" size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
          <div>
            <span className="text-xl font-black text-amber-700">{clientBalance}</span>
            <span className="text-xs text-amber-600 ml-1">puntos disponibles</span>
          </div>
        </div>

        <div className="flex gap-1 bg-app-gray-50 rounded-xl p-1">
          <button
            onClick={() => setTab('catalog')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === 'catalog'
                ? 'bg-white shadow-sm text-app-mint'
                : 'text-app-gray-500 hover:text-app-text-primary'
            }`}
          >
            Recompensas
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === 'history'
                ? 'bg-white shadow-sm text-app-mint'
                : 'text-app-gray-500 hover:text-app-text-primary'
            }`}
          >
            Historial de Canjes
          </button>
        </div>

        {tab === 'catalog' ? (
          <div className="space-y-3">
            {confirmReward ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h6 className="text-sm font-bold text-amber-800">Confirmar canje</h6>
                    <p className="text-sm text-amber-600 mt-1">
                      Vas a canjear <strong>{confirmReward.pointsCost} puntos</strong> por:
                    </p>
                    <p className="text-sm font-bold text-amber-800 mt-1">{confirmReward.name}</p>
                    <p className="text-xs text-amber-600">{getRewardLabel(confirmReward.type, confirmReward.value)}</p>
                    <p className="text-xs text-amber-500 mt-1">
                      Saldo despues: {clientBalance - confirmReward.pointsCost} puntos
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReward(null)}
                    className="flex-1 py-2 bg-white border border-app-gray-200 rounded-xl text-sm font-bold text-app-text-secondary hover:bg-app-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleRedeem(confirmReward)}
                    disabled={redeeming !== null}
                    className="flex-1 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {redeeming === confirmReward.id ? 'Canjeando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : rewards.length === 0 ? (
              <p className="text-sm text-app-gray-500 italic text-center py-6">
                No hay recompensas disponibles en este momento.
              </p>
            ) : (
              rewards.map((reward) => {
                const Icon = getRewardIcon(reward.type);
                const canAfford = clientBalance >= reward.pointsCost;

                return (
                  <div
                    key={reward.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      canAfford
                        ? 'bg-white border-app-gray-200 hover:border-app-mint hover:shadow-sm'
                        : 'bg-app-gray-50 border-app-gray-150 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        canAfford ? 'bg-app-mint-100' : 'bg-app-gray-200'
                      }`}>
                        <Icon className={`w-5 h-5 ${canAfford ? 'text-app-mint' : 'text-app-gray-400'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-bold text-app-text-primary">{reward.name}</h6>
                        {reward.description && (
                          <p className="text-xs text-app-gray-500 mt-0.5">{reward.description}</p>
                        )}
                        <span className="text-xs font-bold text-app-mint block mt-1">
                          {getRewardLabel(reward.type, reward.value)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-black text-amber-700">{reward.pointsCost}</span>
                        </div>
                        <button
                          onClick={() => setConfirmReward(reward)}
                          disabled={!canAfford}
                          className="mt-2 px-3 py-1.5 bg-app-mint hover:bg-app-mint-600 disabled:bg-app-gray-200 text-white disabled:text-app-gray-400 rounded-lg text-xs font-bold transition-all"
                        >
                          Canjear
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {redeemedHistory.length === 0 ? (
              <p className="text-sm text-app-gray-500 italic text-center py-8">
                No has realizado canjes todavia.
              </p>
            ) : (
              redeemedHistory.map((entry) => (
                <div key={entry.id} className="p-3 bg-app-gray-50 rounded-xl border border-app-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-app-pink-100 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-3.5 h-3.5 text-app-pink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-app-text-primary truncate">
                        {entry.description}
                      </p>
                      <span className="text-[10px] text-app-gray-500">
                        {new Date(entry.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-app-pink shrink-0">
                      {entry.points}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
