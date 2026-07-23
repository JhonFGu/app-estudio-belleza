import React, { useState, useEffect } from 'react';
import { Split, AlertCircle } from 'lucide-react';
import { formatCOP } from '../../utils/format';
import type { SplitPaymentItem } from '../../store/usePOSStore';
import { Modal, Button, Input } from '../../components/ui';

interface SplitPaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (payments: SplitPaymentItem[]) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  totalAmount,
  onClose,
  onConfirm,
}) => {
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCashAmount('');
      setCardAmount('');
      setTransferAmount('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cashNum = parseFloat(cashAmount) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const transferNum = parseFloat(transferAmount) || 0;

  const currentSum = cashNum + cardNum + transferNum;
  const remaining = totalAmount - currentSum;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (Math.abs(remaining) > 0.01) {
      setError(`El total asignado (${formatCOP(currentSum)}) debe coincidir exactamente con el total del ticket (${formatCOP(totalAmount)}).`);
      return;
    }

    const payments: SplitPaymentItem[] = [];
    if (cashNum > 0) payments.push({ method: 'cash', amount: cashNum });
    if (cardNum > 0) payments.push({ method: 'card', amount: cardNum });
    if (transferNum > 0) payments.push({ method: 'transfer', amount: transferNum });

    if (payments.length < 2) {
      setError('Para un pago mixto, seleccione al menos dos métodos de pago con montos mayores a cero.');
      return;
    }

    setError('');
    onConfirm(payments);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Distribución de Pago Mixto"
      subtitle="Divida el total facturado entre diferentes medios de pago."
      icon={<Split />}
    >
      <form onSubmit={handleConfirm} className="space-y-5">
        {/* Target Total Header */}
        <div className="p-4 bg-app-mint-100/40 rounded-2xl border border-app-mint-250/30 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-app-mint-700 tracking-wider">
              Total Facturado
            </span>
            <span className="block text-xl font-black text-app-text-primary font-sans">
              {formatCOP(totalAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase text-app-gray-500 tracking-wider">
              Saldo Pendiente
            </span>
            <span className={`block text-base font-black font-mono ${
              Math.abs(remaining) < 0.01
                ? 'text-emerald-600'
                : remaining > 0
                ? 'text-amber-600'
                : 'text-red-600'
            }`}>
              {formatCOP(remaining)}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Method Inputs */}
        <div className="space-y-3.5">
          {/* Cash */}
          <div className="flex items-center justify-between gap-3 p-3 bg-app-gray-50 rounded-2xl border border-app-gray-200">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">💵</span>
              <span className="text-xs font-bold text-app-text-primary">Efectivo</span>
            </div>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray-400 font-bold text-xs z-10">$</span>
              <Input
                type="number"
                placeholder="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="pl-6 text-xs font-black text-right"
              />
            </div>
          </div>

          {/* Card */}
          <div className="flex items-center justify-between gap-3 p-3 bg-app-gray-50 rounded-2xl border border-app-gray-200">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">💳</span>
              <span className="text-xs font-bold text-app-text-primary">Tarjeta</span>
            </div>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray-400 font-bold text-xs z-10">$</span>
              <Input
                type="number"
                placeholder="0"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                className="pl-6 text-xs font-black text-right"
              />
            </div>
          </div>

          {/* Transfer */}
          <div className="flex items-center justify-between gap-3 p-3 bg-app-gray-50 rounded-2xl border border-app-gray-200">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📱</span>
              <span className="text-xs font-bold text-app-text-primary">Transferencia</span>
            </div>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray-400 font-bold text-xs z-10">$</span>
              <Input
                type="number"
                placeholder="0"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="pl-6 text-xs font-black text-right"
              />
            </div>
          </div>
        </div>

        {/* Quick Action: Auto fill remainder to Cash */}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => {
              setCashAmount((cashNum + remaining).toString());
            }}
            className="text-[11px] font-bold text-app-mint hover:underline block text-right w-full"
          >
            + Completar saldo de {formatCOP(remaining)} en Efectivo
          </button>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" disabled={Math.abs(remaining) > 0.01} fullWidth>
            Aplicar Pago Mixto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
