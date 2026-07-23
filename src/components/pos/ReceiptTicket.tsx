import React, { forwardRef } from 'react';
import { formatCOP } from '../../utils/format';
import type { CartItem, SplitPaymentItem } from '../../store/usePOSStore';

interface ReceiptTicketProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  loyaltyDiscount?: number;
  tip: number;
  total: number;
  paymentMethod: string;
  splitPayments?: SplitPaymentItem[];
  paidAmount?: number;
  pendingBalance?: number;
  clientName?: string;
  clientDocNumber?: string;
  notes?: string;
  tenantName?: string;
  collaborators?: any[];
  isPreview?: boolean;
}

export const ReceiptTicket = forwardRef<HTMLDivElement, ReceiptTicketProps>(
  (
    {
      items,
      subtotal,
      discount,
      loyaltyDiscount = 0,
      tip,
      total,
      paymentMethod,
      splitPayments,
      paidAmount,
      pendingBalance,
      clientName,
      clientDocNumber,
      notes,
      tenantName = 'CLÍNICA ESTÉTICA & SPA',
      collaborators = [],
      isPreview = false,
    },
    ref
  ) => {
    const now = new Date();

    return (
      <div
        ref={ref}
        className={
          isPreview
            ? 'printable-ticket bg-white text-black p-4 font-mono text-xs leading-tight select-none w-[80mm] mx-auto border border-app-gray-200 rounded-xl shadow-md'
            : 'printable-ticket hidden print:block print:w-[80mm] print:mx-auto bg-white text-black p-4 font-mono text-xs leading-tight print:p-0 select-none'
        }
        style={{ fontFamily: 'Courier New, Courier, monospace' }}
      >
        {/* Header */}
        <div className="text-center space-y-1 mb-3">
          <h1 className="font-bold text-sm uppercase tracking-wider">{tenantName}</h1>
          <p className="text-[10px]">TICKET DE COMPRA Y SERVICIOS</p>
          <p className="text-[10px] font-bold">FECHA: {now.toLocaleDateString('es-CO')}</p>
          <p className="text-[10px]">HORA: {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Client info */}
        <div className="space-y-0.5 text-[10px] mb-2">
          <div>CLIENTE: {clientName || 'CLIENTE CASUAL'}{clientDocNumber ? ` - ${clientDocNumber}` : ''}</div>
          {notes && <div>NOTAS: {notes}</div>}
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Items Header */}
        <div className="font-bold text-[10px] flex justify-between mb-1">
          <span className="w-1/2">TRATAMIENTO</span>
          <span className="w-1/4 text-center">CANT</span>
          <span className="w-1/4 text-right">TOTAL</span>
        </div>
        <div className="border-t border-black mb-2"></div>

        {/* Items List */}
        <div className="space-y-2 mb-3">
          {items.map((item, idx) => {
            const colabName = collaborators.find((c) => c.id === item.collaboratorId)?.name;
            return (
              <div key={idx} className="text-[10px]">
                <div className="font-bold uppercase">{item.name}</div>
                {colabName && <div className="text-[9px] italic text-slate-700">Esp: {colabName}</div>}
                <div className="flex justify-between text-slate-800 mt-0.5">
                  <span className="w-1/2">{formatCOP(item.price)} c/u</span>
                  <span className="w-1/4 text-center">x{item.quantity}</span>
                  <span className="w-1/4 text-right font-bold">{formatCOP(item.price * item.quantity)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Totals */}
        <div className="space-y-1 text-[10px] mb-3">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatCOP(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between font-bold">
              <span>(-) DESCUENTO:</span>
              <span>-{formatCOP(discount)}</span>
            </div>
          )}

          {loyaltyDiscount > 0 && (
            <div className="flex justify-between font-bold">
              <span>(-) FIDELIZACION:</span>
              <span>-{formatCOP(loyaltyDiscount)}</span>
            </div>
          )}

          {tip > 0 && (
            <div className="flex justify-between font-bold">
              <span>(+) PROPINA STAFF:</span>
              <span>+{formatCOP(tip)}</span>
            </div>
          )}

          <div className="border-t border-dotted border-black my-1"></div>
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL FACTURADO:</span>
            <span>{formatCOP(total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Payment Methods */}
        <div className="space-y-0.5 text-[10px] mb-4">
          <div className="font-bold uppercase mb-1">MÉTODO DE PAGO:</div>
          {paymentMethod === 'credit' || (pendingBalance !== undefined && pendingBalance > 0) ? (
            <>
              <div className="flex justify-between">
                <span className="uppercase">MODALIDAD:</span>
                <span className="font-bold">CRÉDITO / ABONO</span>
              </div>
              {paidAmount !== undefined && paidAmount > 0 && (
                <div className="flex justify-between">
                  <span className="uppercase">(-) ABONO / RECIBIDO:</span>
                  <span className="font-bold">{formatCOP(paidAmount)}</span>
                </div>
              )}
              {pendingBalance !== undefined && (
                <div className="flex justify-between font-bold text-xs border-t border-dotted border-black pt-1 mt-1">
                  <span className="uppercase">SALDO PENDIENTE:</span>
                  <span>{formatCOP(pendingBalance)}</span>
                </div>
              )}
            </>
          ) : paymentMethod === 'split' && splitPayments && splitPayments.length > 0 ? (
            splitPayments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span className="uppercase">
                  (-) {p.method === 'cash' ? 'EFECTIVO' : p.method === 'card' ? 'TARJETA' : 'TRANSFERENCIA'}:
                </span>
                <span className="font-bold">{formatCOP(p.amount)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between">
              <span className="uppercase">
                {paymentMethod === 'cash' || paymentMethod === 'efectivo' ? 'EFECTIVO' : paymentMethod === 'card' || paymentMethod === 'tarjeta' ? 'TARJETA' : paymentMethod === 'transfer' || paymentMethod === 'transferencia' ? 'TRANSFERENCIA' : paymentMethod === 'split' ? 'PAGO MIXTO' : paymentMethod}
              </span>
              <span className="font-bold">{formatCOP(total)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-black my-4"></div>

        {/* Footer */}
        <div className="text-center space-y-1 text-[9px]">
          <p className="font-bold">¡GRACIAS POR SU VISITA!</p>
          <p>Conserve este ticket para su control personal.</p>
        </div>
      </div>
    );
  }
);

ReceiptTicket.displayName = 'ReceiptTicket';
