import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePOSStore } from '../store/usePOSStore';
import { formatCOP } from '../utils/format';
import { CashRegisterModal } from '../components/pos/CashRegisterModal';
import { SplitPaymentModal } from '../components/pos/SplitPaymentModal';
import { ReceiptTicket } from '../components/pos/ReceiptTicket';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Search,
  Lock,
  Unlock,
  Tag,
  HeartHandshake,
  Printer,
  Package,
  Layers,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { Button, Badge, EmptyState, Input, Modal } from '../components/ui';

export const POSPage: React.FC = () => {
  const { currentTenant, currentUser, refreshTrigger, triggerRefresh, pendingPOSItem, setPendingPOSItem } = useAppStore();

  const {
    cart,
    selectedClientId,
    paymentMethod,
    splitPayments,
    tipAmount,
    depositAmount,
    depositPaymentMethod,
    notes,
    linkedAppointmentId,
    addToCart,
    updateQuantity,
    updateItemCollaborator,
    removeFromCart,
    clearCart,
    setSelectedClientId,
    setPaymentMethod,
    setSplitPayments,
    setDiscount,
    setTipAmount,
    setDepositAmount,
    setDepositPaymentMethod,
    setNotes,
    getCartSubtotal,
    getCalculatedDiscount,
    getFinalTotal,
    populateFromPending,
    loyaltyBalance,
    availableRewards,
    appliedReward,
    setLoyaltyData,
    applyLoyaltyReward,
    getLoyaltyDiscount,
  } = usePOSStore();

  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Catalog Filter Tab
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'services' | 'products'>('all');

  // Cash register state
  const [activeRegisterData, setActiveRegisterData] = useState<{ isOpen: boolean; register: any } | null>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashModalMode, setCashModalMode] = useState<'open' | 'close'>('open');

  // Split payment & Success modal state
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Discount UI state
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountInputValue, setDiscountInputValue] = useState('');
  const [tipInputValue, setTipInputValue] = useState('');

  // POS Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Printable ticket ref
  const receiptTicketRef = useRef<HTMLDivElement>(null);
  const [lastSaleReceiptData, setLastSaleReceiptData] = useState<any>(null);

  const fetchActiveRegister = async () => {
    if (!currentTenant) return;
    try {
      const res = await fetch('/api/cash-register', {
        headers: { 'x-tenant-id': currentTenant.id },
      });
      console.log('[POS] fetchActiveRegister status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[POS] fetchActiveRegister data:', JSON.stringify(data));
        setActiveRegisterData(data);
      } else {
        const errText = await res.text();
        console.error('[POS] fetchActiveRegister error:', errText);
      }
    } catch (e) {
      console.error('[POS] Error al verificar estado de caja:', e);
    }
  };

  useEffect(() => {
    const fetchPOSData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        const [servicesRes, productsRes, colabsRes, clientsRes] = await Promise.all([
          fetch('/api/services', { headers }),
          fetch('/api/products', { headers }),
          fetch('/api/collaborators', { headers }),
          fetch('/api/clients', { headers }),
        ]);

        const loadedServices = servicesRes.ok ? await servicesRes.json() : [];
        const loadedProducts = productsRes.ok ? await productsRes.json() : [];
        if (servicesRes.ok) setServices(loadedServices);
        if (productsRes.ok) setProducts(loadedProducts.filter((p: any) => p.active !== false));
        if (colabsRes.ok) setCollaborators(await colabsRes.json());
        if (clientsRes.ok) setClients(await clientsRes.json());

        await fetchActiveRegister();

        // Pre-populate ticket if coming from an appointment
        if (pendingPOSItem) {
          populateFromPending(pendingPOSItem, loadedServices);
          setPendingPOSItem(null);
        }
      } catch (err) {
        console.error('Error al cargar datos POS:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPOSData();
  }, [currentTenant, refreshTrigger]);

  useEffect(() => {
    if (!currentTenant || !selectedClientId) {
      setLoyaltyData(0, []);
      applyLoyaltyReward(null);
      return;
    }

    const fetchLoyaltyData = async () => {
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        const [loyaltyRes, rewardsRes] = await Promise.all([
          fetch(`/api/loyalty?clientId=${selectedClientId}`, { headers }),
          fetch('/api/loyalty?rewards=true', { headers }),
        ]);

        if (loyaltyRes.ok && rewardsRes.ok) {
          const loyaltyData = await loyaltyRes.json();
          const rewardsList = await rewardsRes.json();
          setLoyaltyData(loyaltyData.balance || 0, rewardsList || []);
        }
      } catch (err) {
        console.error('Error al cargar fidelizacion:', err);
      }
    };

    fetchLoyaltyData();
  }, [selectedClientId, currentTenant]);

  const subtotal = getCartSubtotal();
  const calculatedDiscount = getCalculatedDiscount();
  const loyaltyDiscount = getLoyaltyDiscount();
  const finalTotal = getFinalTotal();

  // Combine items for catalog view
  const catalogItems = [
    ...(catalogFilter === 'all' || catalogFilter === 'services'
      ? services.map((s) => ({ ...s, itemType: 'service' }))
      : []),
    ...(catalogFilter === 'all' || catalogFilter === 'products'
      ? products.map((p) => ({ ...p, itemType: 'product' }))
      : []),
  ];

  const filteredCatalogItems = catalogItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDiscountChange = (val: string, type: 'percent' | 'fixed') => {
    setDiscountInputValue(val);
    const num = parseFloat(val) || 0;
    if (type === 'percent') {
      setDiscount(0, Math.min(100, Math.max(0, num)));
    } else {
      setDiscount(Math.max(0, num), 0);
    }
  };

  const handleTipChange = (val: string) => {
    setTipInputValue(val);
    const num = parseFloat(val) || 0;
    setTipAmount(Math.max(0, num));
  };

  const handleOpenCashRegister = () => {
    setCashModalMode('open');
    setIsCashModalOpen(true);
  };

  const handleCloseCashRegister = () => {
    setCashModalMode('close');
    setIsCashModalOpen(true);
  };

  const handleCheckout = async () => {
    if (!activeRegisterData?.isOpen) {
      alert('La caja se encuentra CERRADA. Debe realizar la apertura de caja con la base inicial antes de facturar.');
      handleOpenCashRegister();
      return;
    }

    if (cart.length === 0) {
      alert('Agregue al menos un servicio o producto al ticket.');
      return;
    }

    if (paymentMethod === 'split' && splitPayments.length === 0) {
      alert('Por favor configure la distribución del pago mixto.');
      setIsSplitModalOpen(true);
      return;
    }

    if (paymentMethod === 'credit' && !selectedClientId) {
      alert('Para realizar una venta a crédito o con saldo pendiente, debe seleccionar un cliente registrado.');
      return;
    }

    setSaving(true);
    try {
      const selectedClientObj = clients.find((c) => c.id === selectedClientId);
      let clientDocNumber = (selectedClientObj as any)?.docNumber || '';
      if (!clientDocNumber && selectedClientObj?.notes) {
        try {
          if (selectedClientObj.notes.trim().startsWith('{')) {
            const parsed = JSON.parse(selectedClientObj.notes);
            if (parsed.docNumber) clientDocNumber = parsed.docNumber;
          }
        } catch (e) {}
      }

      const paid = paymentMethod === 'credit' ? Math.min(finalTotal, depositAmount) : finalTotal;
      const pending = paymentMethod === 'credit' ? Math.max(0, finalTotal - paid) : 0;
      const saleStatus = pending > 0 ? (paid > 0 ? 'partial' : 'pending') : 'completed';

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({
          type: 'sale',
          cashRegisterId: activeRegisterData.register?.id || null,
          clientId: selectedClientId || null,
          appointmentId: linkedAppointmentId,
          amount: finalTotal.toFixed(2),
          paidAmount: paid.toFixed(2),
          pendingBalance: pending.toFixed(2),
          status: saleStatus,
          paymentMethod: paymentMethod === 'credit' ? (paid > 0 ? depositPaymentMethod : 'credit') : paymentMethod,
          payments: paymentMethod === 'split' ? splitPayments : undefined,
          description: `${notes ? notes + ' | ' : ''}Subtotal: ${formatCOP(subtotal)}${
            calculatedDiscount > 0 ? `, Desc: -${formatCOP(calculatedDiscount)}` : ''
          }${tipAmount > 0 ? `, Propina: +${formatCOP(tipAmount)}` : ''}${
            paymentMethod === 'credit' ? `, Venta Crédito (Abono: ${formatCOP(paid)}, Pendiente: ${formatCOP(pending)})` : ''
          }`,
          items: cart.map((item) => ({
            serviceId: item.serviceId || null,
            productId: item.productId || null,
            quantity: item.quantity,
            unitPrice: item.price.toFixed(2),
            collaboratorId: item.collaboratorId || null,
          })),
        }),
      });

      if (response.ok) {
        const createdTx = await response.json();
        
        // Auto-register pending balance under Cuentas por Cobrar
        if (pending > 0) {
          try {
            const hasServices = cart.some(item => item.serviceId);
            const hasProducts = cart.some(item => item.productId);
            const categoryName = hasServices ? 'Tratamientos' : (hasProducts ? 'Productos' : 'Tratamientos');

            await fetch('/api/accounts-receivable', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': currentTenant!.id,
              },
              body: JSON.stringify({
                invoiceNumber: createdTx.id ? createdTx.id.slice(0, 8).toUpperCase() : `POS-${Date.now().toString().slice(-4)}`,
                description: `${selectedClientObj?.name || 'Cliente'}: ${cart.map(c => c.name).join(', ')}`,
                category: categoryName,
                totalValue: pending,
                status: 'pending',
                createdAt: new Date().toISOString()
              })
            });
          } catch (e) {
            console.error('Error auto-creating receivable from POS:', e);
          }
        }

        if (appliedReward && loyaltyDiscount > 0) {
          try {
            await fetch('/api/loyalty', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': currentTenant!.id,
              },
              body: JSON.stringify({
                clientId: selectedClientId,
                rewardId: appliedReward.id,
              }),
            });

            await fetch('/api/client-activity', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': currentTenant!.id,
              },
              body: JSON.stringify({
                clientId: selectedClientId,
                action: 'redemption',
                description: `Canje en POS: ${appliedReward.name} (${appliedReward.pointsCost} pts)`,
                metadata: { transactionId: createdTx.id, channel: 'pos' },
              }),
            });
          } catch (e) {
            console.error('Error al deducir puntos de fidelizacion:', e);
          }
        }

        const receiptInfo = {
          items: [...cart],
          subtotal,
          discount: calculatedDiscount,
          loyaltyDiscount,
          tip: tipAmount,
          total: finalTotal,
          paymentMethod,
          paidAmount: paid,
          pendingBalance: pending,
          splitPayments: [...splitPayments],
          clientName: selectedClientObj?.name,
          clientDocNumber,
          notes,
        };
        setLastSaleReceiptData(receiptInfo);

        clearCart();
        setDiscountInputValue('');
        setTipInputValue('');
        await fetchActiveRegister();
        triggerRefresh();

        // Abrir Modal de Confirmación e Impresión
        setIsSuccessModalOpen(true);
      } else {
        const err = await response.json();
        alert(`Error al facturar: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLastReceipt = () => {
    if (!lastSaleReceiptData) return;
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  const isRegisterOpen = !!activeRegisterData?.isOpen;

  return (
    <div className="space-y-4 lg:h-[calc(100vh-140px)] flex flex-col lg:overflow-hidden">
      {/* Componente de Tirilla Térmica Imprimible */}
      {lastSaleReceiptData && (
        <ReceiptTicket
          ref={receiptTicketRef}
          items={lastSaleReceiptData.items}
          subtotal={lastSaleReceiptData.subtotal}
          discount={lastSaleReceiptData.discount}
          loyaltyDiscount={lastSaleReceiptData.loyaltyDiscount || 0}
          tip={lastSaleReceiptData.tip}
          total={lastSaleReceiptData.total}
          paymentMethod={lastSaleReceiptData.paymentMethod}
          splitPayments={lastSaleReceiptData.splitPayments}
          clientName={lastSaleReceiptData.clientName}
          clientDocNumber={lastSaleReceiptData.clientDocNumber}
          notes={lastSaleReceiptData.notes}
          tenantName={currentTenant?.name}
          collaborators={collaborators}
        />
      )}

      {/* Top Banner: Cash Register Control (Ultra-compact) */}
      <div
        className={`py-1.5 px-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs transition-all ${
          isRegisterOpen
            ? 'bg-app-mint-50/70 border-app-mint-100 text-app-mint'
            : 'bg-app-peach-50/70 border-app-peach-100 text-app-peach'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
              isRegisterOpen ? 'bg-app-mint-100 text-app-mint' : 'bg-app-peach-100 text-app-peach'
            }`}
          >
            {isRegisterOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight">
            <span className="font-extrabold uppercase tracking-wider">
              {isRegisterOpen ? 'Caja Abierta' : 'Caja Cerrada (Turno Inactivo)'}
            </span>
            {isRegisterOpen && (
              <span className="bg-app-mint-100 text-app-mint font-bold px-2 py-0.5 rounded-md text-[10px]">
                Base: {formatCOP(parseFloat(activeRegisterData?.register?.initialBase || '0'))}
              </span>
            )}
            <span className="opacity-80 font-semibold text-[10px] hidden md:inline">
              • {isRegisterOpen
                ? `Operada por ${
                    activeRegisterData?.register?.openedByUser?.name || 'Cajero'
                  } | Efectivo esperado: ${formatCOP(activeRegisterData?.register?.expectedCash || 0)}`
                : 'Abre caja con fondo inicial antes de cobrar.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-center sm:justify-end">
          {isRegisterOpen ? (
            <button
              onClick={handleCloseCashRegister}
              className="px-3 py-1 bg-[#8c3b19] hover:bg-[#733014] text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3 h-3" />
              Cerrar Caja / Arqueo
            </button>
          ) : (
            <button
              onClick={handleOpenCashRegister}
              className="px-3 py-1 bg-app-mint hover:bg-app-mint-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Unlock className="w-3 h-3" />
              Abrir Caja con Base Inicial
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:overflow-hidden">
        {/* 1. LEFT PANEL: CATALOG WITH FILTER TABS (SERVICES + PRODUCTS) */}
        <div className="lg:col-span-2 bg-white border border-app-gray-200 rounded-[28px] p-3 lg:p-5 shadow-sm flex flex-col lg:h-full h-[60vh] lg:h-auto overflow-hidden">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-app-mint" />
                Catálogo POS (Tratamientos y Productos)
              </h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                Seleccione un servicio o producto físico para agregarlo al ticket.
              </p>
            </div>

            {/* Catalog Filter Tabs - Mobile: select dropdown */}
            <select
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value as 'all' | 'services' | 'products')}
              className="sm:hidden w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs font-bold outline-none bg-white text-app-text-primary cursor-pointer"
            >
              <option value="all">Todos ({services.length + products.length})</option>
              <option value="services">Tratamientos ({services.length})</option>
              <option value="products">Productos ({products.length})</option>
            </select>

            {/* Desktop: segmented buttons */}
            <div className="hidden sm:flex items-center gap-1 bg-app-gray-100 p-1 rounded-2xl border border-app-gray-200">
              <button
                onClick={() => setCatalogFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all ${
                  catalogFilter === 'all'
                    ? 'bg-white text-app-text-primary shadow-xs'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Todos ({services.length + products.length})
              </button>
              <button
                onClick={() => setCatalogFilter('services')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1 ${
                  catalogFilter === 'services'
                    ? 'bg-app-mint text-white shadow-xs'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tratamientos ({services.length})
              </button>
              <button
                onClick={() => setCatalogFilter('products')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1 ${
                  catalogFilter === 'products'
                    ? 'bg-app-sky text-white shadow-xs'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Productos ({products.length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-3">
            <Input
              icon={<Search />}
              type="text"
              placeholder="Buscar servicio por nombre o producto por SKU / nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Catalog Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 pr-1 min-h-0">
            {filteredCatalogItems.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Search />}
                  title="Sin resultados"
                  message="No se encontraron tratamientos o productos que coincidan con la búsqueda."
                />
              </div>
            ) : (
              filteredCatalogItems.map((item) => {
                const isProduct = item.itemType === 'product';
                const stockVal = isProduct ? parseInt(item.stock, 10) || 0 : 999;
                const isOutOfStock = isProduct && stockVal <= 0;

                return (
                  <button
                    key={`${item.itemType}-${item.id}`}
                    onClick={() => {
                      if (isOutOfStock) {
                        alert('Este producto no tiene stock disponible en inventario.');
                        return;
                      }
                      addToCart(item, item.itemType);
                    }}
                    disabled={isOutOfStock}
                    className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between group relative ${
                      isOutOfStock
                        ? 'bg-app-gray-50 border-app-gray-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-app-gray-200 hover:border-app-mint hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge variant={isProduct ? 'info' : 'success'}>
                          {isProduct ? 'Producto' : 'Tratamiento'}
                        </Badge>

                        {isProduct && (
                          <Badge
                            variant={isOutOfStock ? 'danger' : stockVal <= 3 ? 'warning' : 'neutral'}
                          >
                            Stock: {stockVal}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-app-text-primary group-hover:text-app-mint transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-app-text-secondary mt-1 line-clamp-2 leading-relaxed">
                        {item.description || (isProduct && item.sku ? `SKU: ${item.sku}` : 'Sin descripción.')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 w-full border-t border-app-gray-100 pt-2.5">
                      <span className="text-2xs text-app-text-secondary font-bold uppercase tracking-wide">
                        {isProduct ? item.category || 'General' : `${item.duration} min`}
                      </span>
                      <span className="text-base font-black text-app-text-primary font-sans">
                        {formatCOP(parseFloat(item.price))}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. RIGHT PANEL: CURRENT TICKET CART */}
        <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col lg:h-full h-[45vh] lg:h-auto overflow-y-auto space-y-2 scrollbar-thin">
          <div className="mb-2 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-app-mint" />
              Ticket de Venta
            </h3>
            <Badge variant="success">{cart.length} ítems</Badge>
          </div>

          {/* Client Picker */}
          <div className="mb-2 flex-shrink-0">
            <label className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1.5">
              Asignar Cliente (CRM)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-medium text-app-text-primary cursor-pointer"
            >
              <option value="">-- Cliente Casual (Walk-in) --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClientId && loyaltyBalance > 0 && (
            <div className="mb-2 flex-shrink-0 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                    Fidelizacion
                  </span>
                </div>
                <span className="text-xs font-black text-amber-700">
                  {loyaltyBalance} pts
                </span>
              </div>
              <select
                value={appliedReward?.id || ''}
                onChange={(e) => {
                  const reward = availableRewards.find(r => r.id === e.target.value);
                  if (reward) {
                    if (loyaltyBalance < reward.pointsCost) {
                      alert(`Puntos insuficientes. Necesitas ${reward.pointsCost} pts, tienes ${loyaltyBalance} pts.`);
                      return;
                    }
                    applyLoyaltyReward(reward);
                  } else {
                    applyLoyaltyReward(null);
                  }
                }}
                className="w-full px-3 py-2 border border-amber-200 rounded-xl text-[10px] bg-white outline-none focus:border-amber-400 font-semibold text-app-text-primary cursor-pointer"
              >
                <option value="">Sin canje de fidelizacion</option>
                {availableRewards.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={loyaltyBalance < r.pointsCost}
                  >
                    {r.name} ({r.pointsCost} pts) {loyaltyBalance < r.pointsCost ? '- insuficiente' : ''}
                  </option>
                ))}
              </select>
              {appliedReward && (
                <p className="text-[9px] text-amber-600 font-medium">
                  Canje aplicado: {appliedReward.name} - {appliedReward.type === 'discount_pct'
                    ? `${appliedReward.value}% desc.`
                    : appliedReward.type === 'discount_fixed'
                    ? `${formatCOP(parseFloat(appliedReward.value))} desc.`
                    : 'Servicio gratis'}
                </p>
              )}
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 min-h-[160px] max-h-[360px] overflow-y-auto space-y-2 pr-1 py-1 scrollbar-thin">
            {cart.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag />}
                title="Ticket vacío"
                message="Agrega tratamientos o productos del catálogo para iniciar la venta."
              />
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-app-gray-50/50 rounded-2xl border border-app-gray-200 space-y-2 relative"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="absolute right-2.5 top-2.5 text-app-gray-500 hover:text-app-pink transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Service / Product details */}
                  <div className="pr-6">
                    <h5 className="text-xs font-bold text-app-text-primary truncate">{item.name}</h5>
                    <span className="text-2xs text-app-text-secondary font-semibold">
                      {formatCOP(item.price)} c/u
                    </span>
                  </div>

                  {/* Specialist Selector for comisiones */}
                  <div>
                    <select
                      value={item.collaboratorId}
                      onChange={(e) => updateItemCollaborator(item.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-app-gray-200 rounded-lg text-2xs font-medium bg-white outline-none focus:border-app-mint cursor-pointer"
                    >
                      <option value="">-- Sin especialista (Venta General) --</option>
                      {collaborators.map((cb) => (
                        <option key={cb.id} value={cb.id}>
                          {cb.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qty and price line */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-app-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-app-gray-100 rounded-lg border border-app-gray-200 text-app-text-secondary"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-app-text-primary">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-app-gray-100 rounded-lg border border-app-gray-200 text-app-text-secondary"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-black text-app-text-primary">
                      {formatCOP(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Billing Section */}
          <div className="border-t border-app-gray-200 pt-3 mt-2 space-y-3 flex-shrink-0">

            {/* Payment method */}
            <div>
              <span className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1.5">
                Método de Pago
              </span>
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-1.5">
                {[
                  { key: 'cash', label: 'Efectivo' },
                  { key: 'card', label: 'Tarjeta' },
                  { key: 'transfer', label: 'Transf.' },
                  { key: 'credit', label: 'Crédito' },
                  { key: 'split', label: 'Mixto' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(key as any);
                      if (key === 'split') {
                        setIsSplitModalOpen(true);
                      }
                    }}
                    className={`py-2 rounded-xl border text-2xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                      paymentMethod === key
                        ? 'bg-app-mint border-app-mint text-white shadow-sm'
                        : 'bg-white border-app-gray-200 text-app-text-secondary hover:bg-app-gray-50 hover:border-app-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div className="bg-app-peach-50 border border-app-peach-100 p-3 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-app-peach font-bold">
                  <span>Abono Inicial (Opcional):</span>
                  <input
                    type="number"
                    min="0"
                    max={finalTotal}
                    placeholder="$0"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Math.min(finalTotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-24 px-2 py-1.5 bg-white border border-app-peach-100 rounded-lg text-right font-mono font-bold text-xs outline-none focus:border-app-peach"
                  />
                </div>
                {depositAmount > 0 && (
                  <div className="flex justify-between items-center text-2xs text-app-peach font-semibold">
                    <span>Método del Abono:</span>
                    <select
                      value={depositPaymentMethod}
                      onChange={(e) => setDepositPaymentMethod(e.target.value as any)}
                      className="bg-white border border-app-peach-100 rounded-lg px-2 py-1 font-bold outline-none text-2xs cursor-pointer"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="card">Tarjeta</option>
                      <option value="transfer">Transferencia</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-app-peach-100 pt-1.5 text-xs font-black text-app-peach">
                  <span>Saldo Pendiente:</span>
                  <span className="font-mono text-xs text-app-pink">{formatCOP(Math.max(0, finalTotal - depositAmount))}</span>
                </div>
              </div>
            )}

            {/* Checkout Summary */}
            <div className="bg-app-gray-50/50 p-2.5 rounded-2xl border border-app-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-app-text-secondary">
                <span>Subtotal</span>
                <span className="font-bold font-mono">{formatCOP(subtotal)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-app-mint font-medium">
                  <span>Descuento</span>
                  <span className="font-bold font-mono">-{formatCOP(calculatedDiscount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Fidelizacion {appliedReward?.name ? `(${appliedReward.name})` : ''}</span>
                  <span className="font-bold font-mono">-{formatCOP(loyaltyDiscount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-app-pink font-medium">
                  <span>Propina</span>
                  <span className="font-bold font-mono">+{formatCOP(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-app-gray-200">
                <span className="font-extrabold text-app-text-primary text-xs">Total Facturado</span>
                <span className="text-base font-black text-app-text-primary font-sans">
                  {formatCOP(finalTotal)}
                </span>
              </div>
            </div>

            {/* Button */}
            <Button
              onClick={handleCheckout}
              disabled={saving || cart.length === 0}
              loading={saving}
              variant={!isRegisterOpen ? 'warning' : 'primary'}
              fullWidth
              icon={!isRegisterOpen ? <Lock /> : undefined}
            >
              {!isRegisterOpen
                ? 'Caja Cerrada - Abrir para Cobrar'
                : saving
                ? 'Procesando cobro...'
                : 'Confirmar Cobro / Cerrar Ticket'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Pago Mixto */}
      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        totalAmount={finalTotal}
        onClose={() => setIsSplitModalOpen(false)}
        onConfirm={(payments) => {
          setSplitPayments(payments);
        }}
      />

      {/* Modal de Control de Caja */}
      <CashRegisterModal
        isOpen={isCashModalOpen}
        mode={cashModalMode}
        activeRegister={activeRegisterData?.register}
        currentTenantId={currentTenant!.id}
        currentUserId={currentUser?.id}
        onClose={() => setIsCashModalOpen(false)}
        onSuccess={async (registerData) => {
          setActiveRegisterData({
            isOpen: true,
            register: registerData || { initialBase: '0' },
          });
          await fetchActiveRegister();
          triggerRefresh();
        }}
      />

      {/* Modal Pop-up de Éxito e Impresión Directa de Tirilla (80mm) */}
      <Modal
        isOpen={isSuccessModalOpen && !!lastSaleReceiptData}
        onClose={() => setIsSuccessModalOpen(false)}
        title="¡Venta Cobrada con Éxito!"
        subtitle="La transacción ha sido registrada y el inventario actualizado."
        icon={<CheckCircle2 />}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Cerrar y Nueva Venta
            </Button>
            <Button
              variant="primary"
              icon={<Printer />}
              onClick={() => {
                setTimeout(() => {
                  window.print();
                }, 150);
              }}
            >
              Imprimir Tirilla (80mm)
            </Button>
          </>
        }
      >
        {lastSaleReceiptData && (
          <div className="bg-app-gray-50/70 p-4 rounded-2xl border border-app-gray-200 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-app-text-secondary font-medium">Total Cobrado:</span>
              <span className="font-black text-app-mint font-mono">{formatCOP(lastSaleReceiptData.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-text-secondary font-medium">Cliente:</span>
              <span className="font-bold text-app-text-primary">{lastSaleReceiptData.clientName || 'Cliente Casual'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-text-secondary font-medium">Método de Pago:</span>
              <span className="font-bold text-app-text-primary">
                {lastSaleReceiptData.paymentMethod === 'cash' || lastSaleReceiptData.paymentMethod === 'efectivo'
                  ? 'Efectivo'
                  : lastSaleReceiptData.paymentMethod === 'card' || lastSaleReceiptData.paymentMethod === 'tarjeta'
                  ? 'Tarjeta'
                  : lastSaleReceiptData.paymentMethod === 'transfer' || lastSaleReceiptData.paymentMethod === 'transferencia'
                  ? 'Transferencia'
                  : lastSaleReceiptData.paymentMethod === 'split' || lastSaleReceiptData.paymentMethod === 'mixto'
                  ? 'Mixto'
                  : lastSaleReceiptData.paymentMethod}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
