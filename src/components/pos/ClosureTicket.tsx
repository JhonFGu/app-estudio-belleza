import React, { forwardRef } from 'react';
import { formatCOP } from '../../utils/format';

interface ClosureTicketProps {
  closure: any;
  tenantName?: string;
}

export const ClosureTicket = forwardRef<HTMLDivElement, ClosureTicketProps>(
  ({ closure, tenantName = 'CLÍNICA ESTÉTICA & SPA' }, ref) => {
    if (!closure) return null;

    const {
      id,
      openedAt,
      closedAt,
      initialBase,
      expectedCash,
      declaredCash,
      difference,
      justification,
      openedByUser,
      closedByUser,
    } = closure;

    const openDate = openedAt ? new Date(openedAt) : new Date();
    const closeDate = closedAt ? new Date(closedAt) : new Date();
    const diffNum = parseFloat(difference || '0');
    const initBaseNum = parseFloat(initialBase || '0');
    const expCashNum = parseFloat(expectedCash || '0');
    const declCashNum = parseFloat(declaredCash || '0');

    return (
      <div
        ref={ref}
        className="printable-ticket hidden print:block print:w-[80mm] print:mx-auto bg-white text-black p-4 font-mono text-xs leading-tight print:p-0 select-none"
        style={{ fontFamily: 'Courier New, Courier, monospace' }}
      >
        {/* Header */}
        <div className="text-center space-y-1 mb-3">
          <h1 className="font-bold text-sm uppercase tracking-wider">{tenantName}</h1>
          <p className="text-[10px]">COMPROBANTE DE ARQUEO DE CAJA</p>
          <p className="text-[10px] font-bold">ID TURNO: #{id ? id.substring(0, 8).toUpperCase() : 'N/A'}</p>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Dates & Users */}
        <div className="space-y-0.5 text-[10px] mb-2">
          <div className="flex justify-between">
            <span>APERTURA:</span>
            <span>{openDate.toLocaleDateString('es-CO')} {openDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span>CIERRE:</span>
            <span>{closeDate.toLocaleDateString('es-CO')} {closeDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span>CAJERO:</span>
            <span>{closedByUser?.name || openedByUser?.name || 'Sistema'}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ESTADO:</span>
            <span>CERRADO</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Cash Arqueo breakdown */}
        <div className="space-y-1 text-[10px] mb-3">
          <div className="font-bold text-center mb-1">=== ARQUEO DE EFECTIVO ===</div>
          <div className="flex justify-between">
            <span>BASE APERTURA:</span>
            <span>{formatCOP(initBaseNum)}</span>
          </div>
          <div className="border-t border-dotted border-black my-0.5"></div>
          <div className="flex justify-between font-bold">
            <span>(=) EFECTIVO ESPERADO:</span>
            <span>{formatCOP(expCashNum)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>(=) EFECTIVO DECLARADO:</span>
            <span>{formatCOP(declCashNum)}</span>
          </div>
          <div className="border-t border-dotted border-black my-0.5"></div>
          <div className="flex justify-between font-bold text-sm">
            <span>DIFERENCIA:</span>
            <span>{diffNum > 0 ? '+' : ''}{formatCOP(diffNum)}</span>
          </div>
        </div>

        {diffNum !== 0 && (
          <>
            <div className="border-t border-dashed border-black my-2"></div>
            <div className="space-y-1 text-[10px] mb-3">
              <div className="font-bold uppercase">OBSERVACIONES / JUSTIFICACIÓN:</div>
              <p className="whitespace-pre-wrap leading-tight text-black italic">
                {justification || 'Sin justificación registrada.'}
              </p>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-4"></div>

        {/* Signatures */}
        <div className="pt-4 space-y-6 text-[10px]">
          <div className="flex justify-between gap-4">
            <div className="w-1/2 text-center">
              <div className="border-t border-black pt-1">Firma Cajero</div>
            </div>
            <div className="w-1/2 text-center">
              <div className="border-t border-black pt-1">Firma Supervisor</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 mt-6 text-[9px]">
          <p className="font-bold">----- ARQUEO FINALIZADO -----</p>
          <p>Clínica Estética POS</p>
        </div>
      </div>
    );
  }
);

ClosureTicket.displayName = 'ClosureTicket';
