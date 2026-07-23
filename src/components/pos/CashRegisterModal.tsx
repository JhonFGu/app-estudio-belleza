import React, { useState } from 'react';
import { DollarSign, FileText, CheckCircle2, AlertCircle, Lock, Calculator } from 'lucide-react';
import { formatCOP } from '../../utils/format';
import { Modal, Button, Input } from '../../components/ui';

interface CashRegisterModalProps {
  isOpen: boolean;
  mode: 'open' | 'close';
  activeRegister?: any;
  currentTenantId: string;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: (registerData?: any) => Promise<void>;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  mode,
  activeRegister,
  currentTenantId,
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [initialBase, setInitialBase] = useState('100000');
  const [declaredCash, setDeclaredCash] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  if (!isOpen) return null;

  const expectedCash = activeRegister?.expectedCash || 0;
  const initialBaseNum = parseFloat(activeRegister?.initialBase || '0');
  const cashSales = activeRegister?.cashSales || 0;
  const cashExpenses = activeRegister?.cashExpenses || 0;

  const declaredNum = parseFloat(declaredCash) || 0;
  const difference = declaredNum - expectedCash;

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseVal = parseFloat(initialBase);
    if (isNaN(baseVal) || baseVal < 0) {
      setError('Por favor ingrese un monto base inicial válido.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenantId,
        },
        body: JSON.stringify({
          action: 'open',
          initialBase: baseVal.toFixed(2),
          userId: currentUserId,
        }),
      });

      if (res.ok) {
        const registerData = await res.json();
        await onSuccess(registerData);
        onClose();
      } else {
        const err = await res.json();
        const msg = err.error || 'Error al abrir la caja.';
        if (msg.toLowerCase().includes('ya existe una caja') || msg.toLowerCase().includes('caja abierta')) {
          await onSuccess();
          onClose();
          return;
        }
        setError(msg);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseClick = () => {
    if (!declaredCash || parseFloat(declaredCash) < 0) {
      setError('Por favor ingrese un valor válido de efectivo físico contado.');
      return;
    }
    if (difference !== 0 && !justification.trim()) {
      setError('Por favor ingrese una justificación obligatoria para la diferencia de dinero.');
      return;
    }
    setError('');
    setShowConfirmClose(true);
  };

  const handleConfirmClose = async () => {
    setSaving(true);
    setShowConfirmClose(false);
    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenantId,
        },
        body: JSON.stringify({
          action: 'close',
          declaredCash: declaredNum.toFixed(2),
          justification: justification.trim(),
          userId: currentUserId,
        }),
      });

      if (res.ok) {
        await onSuccess();
        onClose();
      } else {
        const err = await res.json();
        setError(err.error || 'Error al cerrar la caja.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el arqueo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'open' ? 'Apertura de Caja de Turno' : 'Arqueo Físico y Cierre de Caja'}
      subtitle={mode === 'open'
        ? 'Ingrese el fondo base inicial en efectivo para habilitar el cobro de ventas.'
        : 'Verifique los movimientos del día e ingrese el efectivo físico en gaveta.'}
      icon={mode === 'open' ? <CheckCircle2 /> : <Calculator />}
    >
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE: OPEN REGISTER */}
        {mode === 'open' && (
          <form onSubmit={handleOpenSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-app-text-primary uppercase tracking-wider mb-2">
                Base de Efectivo Inicial ($) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-gray-400 font-black text-sm z-10">$</span>
                <Input
                  type="number"
                  step="1000"
                  required
                  value={initialBase}
                  onChange={(e) => {
                    setInitialBase(e.target.value);
                    setError('');
                  }}
                  placeholder="100000"
                  className="pl-8 text-base font-black"
                />
              </div>
              <p className="text-[11px] text-app-gray-500 mt-1.5">
                Monto base entregado al cajero para dar cambio a los clientes durante el turno.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} fullWidth>
                Cancelar
              </Button>
              <Button type="submit" loading={saving} fullWidth>
                Confirmar y Abrir Caja
              </Button>
            </div>
          </form>
        )}

        {/* MODE: CLOSE REGISTER (ARQUEO) */}
        {mode === 'close' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* System Summary */}
              <div className="bg-app-gray-50/70 p-5 rounded-2xl border border-app-gray-200 space-y-3">
                <h4 className="text-xs font-extrabold text-app-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-gray-200 pb-2">
                  <FileText className="w-4 h-4 text-app-mint" />
                  Resumen del Sistema
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-app-text-secondary">
                    <span>Base Inicial (Apertura)</span>
                    <span className="font-bold text-app-text-primary font-mono">{formatCOP(initialBaseNum)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>(+) Ventas POS en Efectivo</span>
                    <span className="font-bold font-mono">+{formatCOP(cashSales)}</span>
                  </div>
                  <div className="flex justify-between text-app-pink font-medium">
                    <span>(-) Egresos de Caja en Efectivo</span>
                    <span className="font-bold font-mono">-{formatCOP(cashExpenses)}</span>
                  </div>

                  <div className="pt-2 border-t border-app-gray-200 flex justify-between items-center text-sm font-extrabold text-app-text-primary">
                    <span>Efectivo Esperado:</span>
                    <span className="text-app-mint text-base font-black font-mono">{formatCOP(expectedCash)}</span>
                  </div>
                </div>
              </div>

              {/* Physical Declaration */}
              <div className="bg-white p-5 rounded-2xl border border-app-gray-200 space-y-3">
                <h4 className="text-xs font-extrabold text-app-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-gray-200 pb-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Conteo Físico en Gaveta
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-app-gray-500 uppercase mb-1">
                    Efectivo Físico Contado ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray-400 font-bold z-10">$</span>
                    <Input
                      type="number"
                      value={declaredCash}
                      onChange={(e) => {
                        setDeclaredCash(e.target.value);
                        setError('');
                      }}
                      placeholder="0"
                      className="pl-7 text-sm font-black"
                    />
                  </div>
                </div>

                {declaredCash && !isNaN(declaredNum) && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      difference === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : difference > 0
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span>Diferencia de Arqueo:</span>
                      <span className="font-mono text-sm">
                        {difference > 0 ? '+' : ''}
                        {formatCOP(difference)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1 font-semibold">
                      {difference === 0
                        ? '✓ Cuadre perfecto sin observaciones.'
                        : difference > 0
                        ? '▲ Sobrante de dinero en caja.'
                        : '▼ Faltante de dinero en caja.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Justification if difference !== 0 */}
            {declaredCash && difference !== 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-app-text-primary">
                  Justificación de Descuadre *
                </label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => {
                    setJustification(e.target.value);
                    setError('');
                  }}
                  placeholder="Escriba aquí la razón del faltante o sobrante de dinero en caja..."
                  className="w-full p-3 border border-app-gray-200 rounded-xl text-xs outline-none focus:border-app-mint resize-none font-semibold"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} fullWidth>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="warning"
                onClick={handleCloseClick}
                fullWidth
              >
                Confirmar y Cerrar Caja
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Final Confirmation Dialog */}
      <Modal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        title="¿Cerrar Definitivamente la Caja?"
        subtitle="Se guardará el arqueo en el historial y se bloqueará el registro de nuevas ventas de este turno."
        icon={<Lock />}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirmClose(false)} fullWidth>
              Cancelar
            </Button>
            <Button variant="warning" loading={saving} onClick={handleConfirmClose} fullWidth>
              Sí, Cerrar Caja
            </Button>
          </>
        }
      >
        <div className="bg-app-gray-50 p-3 rounded-xl border border-app-gray-150 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-app-text-secondary">Efectivo Esperado:</span>
            <span className="font-bold font-mono">{formatCOP(expectedCash)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-app-text-secondary">Efectivo Declarado:</span>
            <span className="font-bold font-mono">{formatCOP(declaredNum)}</span>
          </div>
          <div className="flex justify-between border-t border-app-gray-200 pt-1 font-black">
            <span>Diferencia:</span>
            <span className={difference === 0 ? 'text-emerald-600' : 'text-red-600'}>
              {difference > 0 ? '+' : ''}
              {formatCOP(difference)}
            </span>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};
