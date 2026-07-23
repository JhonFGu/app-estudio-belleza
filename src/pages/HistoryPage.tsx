import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import { ReceiptTicket } from '../components/pos/ReceiptTicket';
import {
  Receipt,
  Search,
  User,
  Printer,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Badge, Modal, Input, EmptyState } from '../components/ui';

export const HistoryPage: React.FC = () => {
  const { currentTenant, refreshTrigger, appointmentTxFilter, setAppointmentTxFilter } = useAppStore();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Ticket Preview Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const receiptTicketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const response = await fetch('/api/transactions', {
          headers: { 'x-tenant-id': currentTenant.id }
        });
        if (response.ok) {
          const list = await response.json();
          // Filter only POS sales
          const sales = list.filter((t: any) => t.type === 'sale');
          setTransactions(sales);
          if (sales.length > 0) {
            setSelectedTx(sales[0]);
          }
        }
      } catch (err) {
        console.error('Error al cargar historial:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentTenant, refreshTrigger]);

  // Auto-select transaction from appointment filter (e.g. from Calendar "Ver Factura / Ticket")
  useEffect(() => {
    if (appointmentTxFilter && transactions.length > 0) {
      const matched = transactions.find((t: any) => t.appointmentId === appointmentTxFilter);
      if (matched) {
        setSelectedTx(matched);
      }
      setAppointmentTxFilter(null);
    }
  }, [appointmentTxFilter, transactions]);

  const filteredTx = transactions.filter(t =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.includes(searchTerm)
  );

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  // Prepara datos formateados para la tirilla
  const formattedTicketItems = selectedTx?.items?.map((it: any) => ({
    id: it.id,
    itemType: (it.product ? 'product' : 'service') as 'product' | 'service',
    name: it.service?.name || it.product?.name || 'Ítem Facturado',
    price: parseFloat(it.unitPrice || '0'),
    quantity: it.quantity || 1,
    collaboratorId: it.collaboratorId || '',
  })) || [];

  let selectedClientDocNumber = (selectedTx?.client as any)?.docNumber || '';
  if (!selectedClientDocNumber && selectedTx?.client?.notes) {
    try {
      if (selectedTx.client.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(selectedTx.client.notes);
        if (parsed.docNumber) selectedClientDocNumber = parsed.docNumber;
      }
    } catch (e) {}
  }
  const txCollaborators = selectedTx?.items
    ?.map((it: any) => it.collaborator)
    .filter(Boolean) || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-180px)] overflow-hidden">
      {/* Printable Receipt Component Hidden in DOM */}
      {selectedTx && (
        <ReceiptTicket
          ref={receiptTicketRef}
          items={formattedTicketItems}
          subtotal={parseFloat(selectedTx.amount || '0')}
          discount={0}
          tip={0}
          total={parseFloat(selectedTx.amount || '0')}
          paymentMethod={selectedTx.paymentMethod || 'cash'}
          clientName={selectedTx.client?.name}
          clientDocNumber={selectedClientDocNumber}
          tenantName={currentTenant?.name}
          collaborators={txCollaborators}
        />
      )}

      {/* 1. LEFT PANEL: INVOICES TABLE */}
      <div className="xl:col-span-2 bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
            <Receipt className="w-5 h-5 text-app-mint" />
            Historial de Facturas / Tickets
          </h3>
          <div className="w-64">
            <Input
              icon={<Search />}
              placeholder="Buscar por cliente o ID de factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                <th className="p-3.5 w-8 rounded-l-xl">
                  <input type="checkbox" className="rounded border-app-gray-300" />
                </th>
                <th className="p-3.5">ID Factura</th>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Nombre del Cliente</th>
                <th className="p-3.5">Método de Pago</th>
                <th className="p-3.5 text-right rounded-r-xl">Monto Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((tx) => {
                const isSelected = selectedTx?.id === tx.id;
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className={`border-b border-app-gray-50 hover:bg-app-gray-50/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-app-mint-50/30' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input type="checkbox" className="rounded border-app-gray-300" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="p-3.5 text-app-gray-500 font-mono text-[10px]">
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="p-3.5 text-app-text-secondary">
                      {format(new Date(tx.createdAt), "d LLL, yyyy - HH:mm", { locale: es })}
                    </td>
                    <td className="p-3.5 font-bold text-app-text-primary flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-app-mint-100 text-app-mint font-bold text-[9px] flex items-center justify-center">
                        {tx.client?.name?.charAt(0) || 'C'}
                      </div>
                      <span>{tx.client?.name || 'Cliente Walk-in'}</span>
                    </td>
                    <td className="p-3.5 text-app-text-secondary font-semibold">
                      {tx.paymentMethod === 'card' || tx.paymentMethod === 'tarjeta' ? '💳 Tarjeta' :
                       tx.paymentMethod === 'cash' || tx.paymentMethod === 'efectivo' ? '💵 Efectivo' :
                       tx.paymentMethod === 'split' || tx.paymentMethod === 'mixto' ? '🔀 Pago Mixto' :
                       '📱 Transferencia'}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-app-text-primary">
                      {formatCOP(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. RIGHT PANEL: INVOICE DETAIL CARD */}
      <div className="xl:col-span-1 bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col h-full overflow-y-auto space-y-4">
        {selectedTx ? (
          <>
            <div className="pb-4 border-b border-app-gray-100 text-left">
              <Badge variant="success">Pagado / Facturado</Badge>
              <h4 className="text-sm font-extrabold text-app-text-primary font-sans mt-2.5">
                Ticket #{selectedTx.id.slice(0, 8).toUpperCase()}
              </h4>
              <p className="text-[10px] text-app-gray-500 mt-0.5">
                {format(new Date(selectedTx.createdAt), "eeee, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            <div className="space-y-4 text-xs text-app-text-secondary flex-1">
              {/* Client linked */}
              <div className="flex items-center gap-3 bg-app-gray-50 p-3 rounded-2xl border border-app-gray-150">
                <User className="w-4.5 h-4.5 text-app-gray-550" />
                <div>
                  <p className="text-[9px] text-app-gray-500 font-bold uppercase">Cliente Vinculado</p>
                  <p className="font-bold text-app-text-primary">{selectedTx.client?.name || 'Cliente Walk-in'}</p>
                </div>
              </div>

              {/* Items Purchased list */}
              <div>
                <h5 className="text-[9px] font-bold text-app-gray-500 uppercase tracking-wider mb-2">Desglose de Tratamientos y Productos</h5>
                <div className="space-y-2">
                  {selectedTx.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-app-gray-200 rounded-xl shadow-sm space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-app-text-primary">
                          {item.service?.name || item.product?.name || 'Ítem'} (x{item.quantity || 1})
                        </span>
                        <span className="font-extrabold text-app-text-primary">{formatCOP(item.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-app-gray-500 font-semibold border-t border-app-gray-50 pt-1">
                        <span>Por: {item.collaborator?.name || 'Sin especialista'}</span>
                        <span className="text-app-mint font-bold">Comisión: {formatCOP(item.commissionPaid)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary calculations */}
              <div className="pt-3 border-t border-app-gray-100 space-y-2 text-xs font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-app-text-primary">{formatCOP(parseFloat(selectedTx.amount) * 0.81)}</span>
                </div>
                <div className="flex justify-between text-app-gray-500">
                  <span>IVA (19%):</span>
                  <span>{formatCOP(parseFloat(selectedTx.amount) * 0.19)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t border-app-gray-100 pt-2 text-app-text-primary">
                  <span>Total Facturado:</span>
                  <span>{formatCOP(selectedTx.amount)}</span>
                </div>
              </div>
            </div>

            {/* BOTÓN VER / IMPRIMIR TIRILLA */}
            <div className="pt-3 border-t border-app-gray-200 mt-auto">
              <Button
                icon={<Eye />}
                fullWidth
                onClick={() => setIsTicketModalOpen(true)}
              >
                Ver Factura en Tirilla (80mm)
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Receipt />}
            title="Sin factura seleccionada"
            message="Seleccione una factura de la lista."
          />
        )}
      </div>

      {/* MODAL VER / PREVISUALIZAR TIRILLA TÉRMICA */}
      <Modal
        isOpen={isTicketModalOpen && !!selectedTx}
        onClose={() => setIsTicketModalOpen(false)}
        title={`Tirilla de Venta #${selectedTx?.id.slice(0, 8).toUpperCase()}`}
        icon={<Receipt />}
        size="sm"
        footer={
          <>
            <Button
              icon={<Printer />}
              onClick={handlePrint}
            >
              Imprimir Tirilla (80mm)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsTicketModalOpen(false)}
            >
              Cerrar
            </Button>
          </>
        }
      >
        {selectedTx && (
          <div className="bg-slate-50 flex justify-center">
            <ReceiptTicket
              items={formattedTicketItems}
              subtotal={parseFloat(selectedTx.amount || '0')}
              discount={0}
              tip={0}
              total={parseFloat(selectedTx.amount || '0')}
              paymentMethod={selectedTx.paymentMethod || 'cash'}
              clientName={selectedTx.client?.name}
              clientDocNumber={selectedClientDocNumber}
              tenantName={currentTenant?.name}
              collaborators={txCollaborators}
              isPreview={true}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
