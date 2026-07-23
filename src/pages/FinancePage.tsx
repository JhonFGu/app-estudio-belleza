import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP, formatPaymentMethod } from '../utils/format';
import { ClosureTicket } from '../components/pos/ClosureTicket';
import {
  DollarSign,
  TrendingDown,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  UserCheck,
  TrendingUp,
  Receipt,
  Download,
  PlusCircle,
  CheckCircle2,
  PieChart,
  Lock,
  Printer,
  Settings,
  X,
  Trash2,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, StatCard } from '../components/ui';

export const FinancePage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh } = useAppStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'incomes' | 'expenses' | 'receivables' | 'payables' | 'closures' | 'reports' | 'commissions'>('summary');
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [closuresHistory, setClosuresHistory] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [selectedClosureToPrint, setSelectedClosureToPrint] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({ totalSales: 0, totalExpenses: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);

  // Cuentas por cobrar form states
  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [receivableInvoiceNumber, setReceivableInvoiceNumber] = useState('');
  const [receivableDescription, setReceivableDescription] = useState('');
  const [receivableCategory, setReceivableCategory] = useState('Tratamientos');
  const [receivableTotalValue, setReceivableTotalValue] = useState('');
  const [receivableStatus, setReceivableStatus] = useState<'pending' | 'paid'>('pending');
  const [receivableDocumentUrl, setReceivableDocumentUrl] = useState('');
  const [receivableCreatedAt, setReceivableCreatedAt] = useState('');
  const [submittingReceivable, setSubmittingReceivable] = useState(false);

  // Cuentas por cobrar flow to record income
  const [receivableToCollect, setReceivableToCollect] = useState<any>(null);
  const [logAsIncome, setLogAsIncome] = useState(true);
  const [receivableIncomeMethod, setReceivableIncomeMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [collectAmountInput, setCollectAmountInput] = useState('');
  const [isIncomePromptOpen, setIsIncomePromptOpen] = useState(false);

  // Cuentas por pagar form states
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [payableInvoiceNumber, setPayableInvoiceNumber] = useState('');
  const [payableDescription, setPayableDescription] = useState('');
  const [payableCategory, setPayableCategory] = useState('Insumos');
  const [payableTotalValue, setPayableTotalValue] = useState('');
  const [payableStatus, setPayableStatus] = useState<'pending' | 'paid'>('pending');
  const [payableDocumentUrl, setPayableDocumentUrl] = useState('');
  const [payableCreatedAt, setPayableCreatedAt] = useState('');
  const [submittingPayable, setSubmittingPayable] = useState(false);

  // Cuentas por pagar flow to record expense
  const [payableToPay, setPayableToPay] = useState<any>(null);
  const [logAsExpense, setLogAsExpense] = useState(true);
  const [payableExpenseMethod, setPayableExpenseMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isExpensePromptOpen, setIsExpensePromptOpen] = useState(false);

  // Abono modal state
  const [selectedAbonoTx, setSelectedAbonoTx] = useState<any>(null);
  const [abonoAmountInput, setAbonoAmountInput] = useState('');
  const [abonoMethodInput, setAbonoMethodInput] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);

  // Expense Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Insumos');
  const [description, setDescription] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [saving, setSaving] = useState(false);

  // Commission payout state
  const [paidCommissions, setPaidCommissions] = useState<Record<string, boolean>>({});

  // Commission Rules state
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [selectedRuleColab, setSelectedRuleColab] = useState<string>('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleFormType, setRuleFormType] = useState<'service' | 'product'>('service');
  const [ruleFormTargetId, setRuleFormTargetId] = useState('');
  const [ruleFormRate, setRuleFormRate] = useState('');
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Liquidation state
  const [liquidations, setLiquidations] = useState<any[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState<any[]>([]);
  const [selectedLiqColab, setSelectedLiqColab] = useState<string>('');
  const [liqDateStart, setLiqDateStart] = useState('');
  const [liqDateEnd, setLiqDateEnd] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchedPending, setSearchedPending] = useState(false);
  const [showLiquidationDetail, setShowLiquidationDetail] = useState<any>(null);
  const [liquidationSubTab, setLiquidationSubTab] = useState<'liquidation' | 'rules'>('rules');

  // Payment modal state
  const [liquidationToPay, setLiquidationToPay] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchFinanceData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        
        const [metricsRes, transRes, colabRes, appRes, closuresRes, payablesRes, receivablesRes, rulesRes, liquidationsRes, srvRes, prodRes] = await Promise.all([
          fetch('/api/dashboard', { headers }),
          fetch('/api/transactions', { headers }),
          fetch('/api/collaborators', { headers }),
          fetch('/api/appointments', { headers }),
          fetch('/api/cash-register?action=history', { headers }),
          fetch('/api/accounts-payable', { headers }),
          fetch('/api/accounts-receivable', { headers }),
          fetch('/api/commission-rules', { headers }),
          fetch('/api/commission-liquidations', { headers }),
          fetch('/api/services', { headers }),
          fetch('/api/products', { headers }),
        ]);

        if (metricsRes.ok) {
          const dash = await metricsRes.json();
          setMetrics({
            totalSales: dash.metrics.totalSales || 0,
            totalExpenses: dash.metrics.totalExpenses || 0,
            netProfit: dash.metrics.netProfit || 0
          });
        }

        if (transRes.ok) {
          const transList = await transRes.json();
          setExpenses(transList.filter((t: any) => t.type === 'expense'));
          setIncomes(transList.filter((t: any) => t.type === 'sale' || t.type === 'income'));
        }

        if (colabRes.ok) setCollaborators(await colabRes.json());
        if (appRes.ok) setAppointments(await appRes.json());
        if (closuresRes.ok) setClosuresHistory(await closuresRes.json());
        if (payablesRes.ok) setPayables(await payablesRes.json());
        if (receivablesRes.ok) setReceivables(await receivablesRes.json());
        if (rulesRes.ok) setCommissionRules(await rulesRes.json());
        if (liquidationsRes.ok) setLiquidations(await liquidationsRes.json());
        if (srvRes.ok) setServicesList(await srvRes.json());
        if (prodRes.ok) setProductsList(await prodRes.json());
      } catch (err) {
        console.error('Error al cargar datos financieros:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [currentTenant, refreshTrigger]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !description.trim()) {
      alert('Por favor ingrese un monto válido y la descripción del gasto.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({
          type: 'expense',
          amount: parseFloat(amount).toFixed(2),
          paymentMethod: expensePaymentMethod,
          description: `[${category}] ${description}`
        })
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setExpensePaymentMethod('cash');
        triggerRefresh();
      } else {
        const err = await response.json();
        alert(`Error al registrar gasto: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintClosure = (closure: any) => {
    setSelectedClosureToPrint(closure);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // ========== COMMISSION RULES HANDLERS ==========

  const filteredRules = commissionRules.filter((r: any) =>
    selectedRuleColab ? r.collaboratorId === selectedRuleColab : true
  );

  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleFormType('service');
    setRuleFormTargetId('');
    setRuleFormRate('');
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: any) => {
    setEditingRule(rule);
    setRuleFormType(rule.serviceId ? 'service' : 'product');
    setRuleFormTargetId(rule.serviceId || rule.productId || '');
    setRuleFormRate(parseFloat(rule.commissionRate).toString());
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleColab || !ruleFormTargetId || !ruleFormRate) {
      alert('Complete todos los campos.');
      return;
    }

    const body: any = {
      collaboratorId: selectedRuleColab,
      commissionRate: parseFloat(ruleFormRate).toFixed(2),
    };
    if (ruleFormType === 'service') body.serviceId = ruleFormTargetId;
    else body.productId = ruleFormTargetId;

    try {
      const url = editingRule
        ? `/api/commission-rules?id=${editingRule.id}`
        : '/api/commission-rules';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': currentTenant!.id },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowRuleModal(false);
        setEditingRule(null);
        triggerRefresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar la regla.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Eliminar esta regla de comisión?')) return;
    try {
      const res = await fetch(`/api/commission-rules?id=${ruleId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id },
      });
      if (res.ok) {
        triggerRefresh();
      } else {
        alert('Error al eliminar la regla.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ========== LIQUIDATION HANDLERS ==========

  const handleSearchPending = async () => {
    if (!selectedLiqColab) {
      alert('Seleccione un colaborador.');
      return;
    }
    const params = new URLSearchParams();
    params.set('action', 'pending');
    params.set('collaboratorId', selectedLiqColab);
    if (liqDateStart) params.set('periodStart', liqDateStart);
    if (liqDateEnd) params.set('periodEnd', liqDateEnd + 'T23:59:59');

    try {
      const res = await fetch(`/api/commission-liquidations?${params.toString()}`, {
        headers: { 'x-tenant-id': currentTenant!.id },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCommissions(data);
        setSearchedPending(true);
        setSelectedItemIds(new Set());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === pendingCommissions.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(pendingCommissions.map((i: any) => i.id)));
    }
  };

  const handleCreateLiquidation = async () => {
    if (selectedItemIds.size === 0) {
      alert('Seleccione al menos un ítem para liquidar.');
      return;
    }

    try {
      const res = await fetch('/api/commission-liquidations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({
          collaboratorId: selectedLiqColab,
          periodStart: liqDateStart || new Date().toISOString(),
          periodEnd: liqDateEnd || new Date().toISOString(),
          notes: '',
          transactionItemIds: Array.from(selectedItemIds),
        }),
      });

      if (res.ok) {
        alert('Liquidación creada exitosamente.');
        setSearchedPending(false);
        setPendingCommissions([]);
        setSelectedItemIds(new Set());
        triggerRefresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al crear la liquidación.');
    }
  };

  const handleUpdateLiquidationStatus = async (liqId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/commission-liquidations?id=${liqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        triggerRefresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLiquidation = async (liqId: string) => {
    if (!confirm('¿Eliminar esta liquidación?')) return;
    try {
      const res = await fetch(`/api/commission-liquidations?id=${liqId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id },
      });
      if (res.ok) {
        triggerRefresh();
      } else {
        alert('Error al eliminar la liquidación.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!liquidationToPay) return;
    setIsPaying(true);
    try {
      const res = await fetch(`/api/commission-liquidations?id=${liquidationToPay.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({
          status: 'paid',
          paymentMethod,
        }),
      });
      if (res.ok) {
        setLiquidationToPay(null);
        triggerRefresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al procesar el pago.');
    } finally {
      setIsPaying(false);
    }
  };

  const totalPendingSelected = pendingCommissions
    .filter((i: any) => selectedItemIds.has(i.id))
    .reduce((acc: number, i: any) => acc + parseFloat(i.commissionPaid || '0'), 0);

  // Real Receivables data calculation
  const realReceivables = incomes.filter((t: any) => {
    const pending = t.pendingBalance !== undefined && t.pendingBalance !== null
      ? parseFloat(t.pendingBalance)
      : Math.max(0, parseFloat(t.amount || '0') - parseFloat(t.paidAmount || '0'));
    return pending > 0 || t.status === 'partial' || t.status === 'pending' || t.paymentMethod === 'credit';
  });

  const totalReceivablesAmount = realReceivables.reduce((acc: number, r: any) => {
    const origAmount = parseFloat(r.amount || '0');
    const paid = parseFloat(r.paidAmount || '0');
    const pending = r.pendingBalance !== undefined && r.pendingBalance !== null
      ? parseFloat(r.pendingBalance)
      : Math.max(0, origAmount - paid);
    return acc + pending;
  }, 0);

  const handleRegisterAbono = async () => {
    if (!selectedAbonoTx) return;
    const amountNum = parseFloat(abonoAmountInput);
    if (!amountNum || amountNum <= 0) {
      alert('Ingrese un monto de abono válido mayor a 0.');
      return;
    }

    const origAmount = parseFloat(selectedAbonoTx.amount || '0');
    const paid = parseFloat(selectedAbonoTx.paidAmount || '0');
    const pending = selectedAbonoTx.pendingBalance !== undefined && selectedAbonoTx.pendingBalance !== null
      ? parseFloat(selectedAbonoTx.pendingBalance)
      : Math.max(0, origAmount - paid);

    if (amountNum > pending + 0.01) {
      alert(`El abono ($${amountNum}) no puede superar el saldo pendiente ($${pending}).`);
      return;
    }

    setIsSubmittingAbono(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({
          type: 'abono',
          targetTransactionId: selectedAbonoTx.id,
          clientId: selectedAbonoTx.clientId || selectedAbonoTx.client?.id,
          amount: amountNum.toFixed(2),
          paymentMethod: abonoMethodInput,
          description: `Abono a Factura #${selectedAbonoTx.id.slice(0, 8).toUpperCase()}`,
        }),
      });

      if (response.ok) {
        alert('¡Abono registrado exitosamente e ingresado a la caja activa!');
        setSelectedAbonoTx(null);
        setAbonoAmountInput('');
        triggerRefresh();
      } else {
        const err = await response.json();
        alert(`Error al registrar el abono: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error al procesar el abono.');
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  const handleOpenAddPayable = () => {
    setSelectedPayable(null);
    setPayableInvoiceNumber('');
    setPayableDescription('');
    setPayableCategory('Insumos');
    setPayableTotalValue('');
    setPayableStatus('pending');
    setPayableDocumentUrl('');
    setPayableCreatedAt(new Date().toISOString().split('T')[0]);
    setIsPayableModalOpen(true);
  };

  const handleOpenEditPayable = (item: any) => {
    setSelectedPayable(item);
    setPayableInvoiceNumber(item.invoiceNumber || '');
    setPayableDescription(item.description);
    setPayableCategory(item.category);
    setPayableTotalValue(String(item.totalValue));
    setPayableStatus(item.status);
    setPayableDocumentUrl(item.documentUrl || '');
    setPayableCreatedAt(new Date(item.createdAt).toISOString().split('T')[0]);
    setIsPayableModalOpen(true);
  };

  const handleSubmitPayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payableDescription || !payableCategory || !payableTotalValue) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }
    setSubmittingPayable(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant?.id || '',
      };
      const body = {
        invoiceNumber: payableInvoiceNumber,
        description: payableDescription,
        category: payableCategory,
        totalValue: parseFloat(payableTotalValue).toFixed(2),
        status: payableStatus,
        documentUrl: payableDocumentUrl,
        createdAt: payableCreatedAt ? new Date(payableCreatedAt).toISOString() : undefined,
      };

      const url = selectedPayable
        ? `/api/accounts-payable?id=${selectedPayable.id}`
        : '/api/accounts-payable';
      const method = selectedPayable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsPayableModalOpen(false);
        const itemSaved = await res.json();
        // If marked as paid, offer to log as an expense in transaction history
        if (payableStatus === 'paid' && (!selectedPayable || selectedPayable.status !== 'paid')) {
          setPayableToPay(itemSaved);
          setPayableExpenseMethod('cash');
          setLogAsExpense(true);
          setIsExpensePromptOpen(true);
        } else {
          triggerRefresh();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al guardar.');
    } finally {
      setSubmittingPayable(false);
    }
  };

  const handleQuickPay = (item: any) => {
    setPayableToPay(item);
    setPayableExpenseMethod('cash');
    setLogAsExpense(true);
    setIsExpensePromptOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!payableToPay) return;
    setSubmittingPayable(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant?.id || '',
      };

      // 1. Mark as Paid in backend
      const updateRes = await fetch(`/api/accounts-payable?id=${payableToPay.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'paid'
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        alert(`Error al actualizar estado: ${err.error}`);
        return;
      }

      // 2. If logAsExpense is selected, create the expense transaction
      if (logAsExpense) {
        const transRes = await fetch('/api/transactions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'expense',
            amount: parseFloat(payableToPay.totalValue).toFixed(2),
            paymentMethod: payableExpenseMethod,
            description: `[Pago Cuenta Pagar] ${payableToPay.invoiceNumber ? '#' + payableToPay.invoiceNumber + ' - ' : ''}${payableToPay.description}`
          }),
        });

        if (!transRes.ok) {
          alert('La cuenta se marcó como Pagada, pero hubo un error al registrar la salida de caja (Egreso).');
        }
      }

      setIsExpensePromptOpen(false);
      setPayableToPay(null);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert('Error de conexión al procesar el pago.');
    } finally {
      setSubmittingPayable(false);
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      const res = await fetch(`/api/accounts-payable?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant?.id || '' },
      });
      if (res.ok) {
        triggerRefresh();
      } else {
        alert('Error al eliminar el registro.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPayableDocumentUrl(file.name);
    }
  };

  const handleOpenAddReceivable = () => {
    setSelectedReceivable(null);
    setReceivableInvoiceNumber('');
    setReceivableDescription('');
    setReceivableCategory('Tratamientos');
    setReceivableTotalValue('');
    setReceivableStatus('pending');
    setReceivableDocumentUrl('');
    setReceivableCreatedAt(new Date().toISOString().split('T')[0]);
    setIsReceivableModalOpen(true);
  };

  const handleOpenEditReceivable = (item: any) => {
    setSelectedReceivable(item);
    setReceivableInvoiceNumber(item.invoiceNumber || '');
    setReceivableDescription(item.description);
    setReceivableCategory(item.category);
    setReceivableTotalValue(String(item.totalValue));
    setReceivableStatus(item.status);
    setReceivableDocumentUrl(item.documentUrl || '');
    setReceivableCreatedAt(new Date(item.createdAt).toISOString().split('T')[0]);
    setIsReceivableModalOpen(true);
  };

  const handleSubmitReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivableDescription || !receivableCategory || !receivableTotalValue) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }
    setSubmittingReceivable(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant?.id || '',
      };
      const body = {
        invoiceNumber: receivableInvoiceNumber,
        description: receivableDescription,
        category: receivableCategory,
        totalValue: parseFloat(receivableTotalValue).toFixed(2),
        status: receivableStatus,
        documentUrl: receivableDocumentUrl,
        createdAt: receivableCreatedAt ? new Date(receivableCreatedAt).toISOString() : undefined,
      };

      const url = selectedReceivable
        ? `/api/accounts-receivable?id=${selectedReceivable.id}`
        : '/api/accounts-receivable';
      const method = selectedReceivable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsReceivableModalOpen(false);
        const itemSaved = await res.json();
        // If marked as paid (cobrada), offer to log as an income in transaction history
        if (receivableStatus === 'paid' && (!selectedReceivable || selectedReceivable.status !== 'paid')) {
          setReceivableToCollect(itemSaved);
          setCollectAmountInput(String(itemSaved.totalValue));
          setReceivableIncomeMethod('cash');
          setLogAsIncome(true);
          setIsIncomePromptOpen(true);
        } else {
          triggerRefresh();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al guardar.');
    } finally {
      setSubmittingReceivable(false);
    }
  };

  const handleQuickCollect = (item: any) => {
    setReceivableToCollect(item);
    setCollectAmountInput(String(item.totalValue));
    setReceivableIncomeMethod('cash');
    setLogAsIncome(true);
    setIsIncomePromptOpen(true);
  };

  const handleConfirmCollect = async () => {
    if (!receivableToCollect) return;
    const collectAmount = parseFloat(collectAmountInput);
    if (isNaN(collectAmount) || collectAmount <= 0) {
      alert('Por favor ingrese un monto de cobro válido.');
      return;
    }
    const currentTotal = parseFloat(receivableToCollect.totalValue);
    if (collectAmount > currentTotal + 0.01) {
      alert(`El monto a cobrar ($${collectAmount}) no puede superar el saldo pendiente ($${currentTotal}).`);
      return;
    }

    setSubmittingReceivable(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant?.id || '',
      };

      const remaining = Math.max(0, currentTotal - collectAmount);
      const isFullPayment = remaining <= 0.01;

      // 1. Mark as Paid/Pending in backend
      const updateRes = await fetch(`/api/accounts-receivable?id=${receivableToCollect.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: isFullPayment ? 'paid' : 'pending',
          totalValue: remaining.toFixed(2),
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        alert(`Error al actualizar estado: ${err.error}`);
        return;
      }

      // 2. If logAsIncome is selected, create the income/sale transaction
      if (logAsIncome) {
        const transRes = await fetch('/api/transactions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'sale',
            amount: collectAmount.toFixed(2),
            paymentMethod: receivableIncomeMethod,
            description: `[${isFullPayment ? 'Liquidación' : 'Abono'} Cuenta por Cobrar] ${receivableToCollect.invoiceNumber ? '#' + receivableToCollect.invoiceNumber + ' - ' : ''}${receivableToCollect.description}`
          }),
        });

        if (!transRes.ok) {
          alert('La cuenta se actualizó, pero hubo un error al registrar el ingreso en caja.');
        }
      }

      setIsIncomePromptOpen(false);
      setReceivableToCollect(null);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert('Error de conexión al procesar el cobro.');
    } finally {
      setSubmittingReceivable(false);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      const res = await fetch(`/api/accounts-receivable?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant?.id || '' },
      });
      if (res.ok) {
        triggerRefresh();
      } else {
        alert('Error al eliminar el registro.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReceivableFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceivableDocumentUrl(file.name);
    }
  };

  const tabs = [
    { id: 'summary', label: 'Resumen General', icon: DollarSign },
    { id: 'incomes', label: 'Ingresos', icon: TrendingUp },
    { id: 'expenses', label: 'Gastos y Egresos', icon: TrendingDown },
    { id: 'receivables', label: 'Cuentas por Cobrar', icon: Receipt },
    { id: 'payables', label: 'Cuentas por Pagar', icon: CreditCard },
    { id: 'closures', label: 'Arqueos y Cierres', icon: Lock },
    { id: 'commissions', label: 'Comisiones', icon: Percent },
    { id: 'reports', label: 'Reporte Mensual P&L', icon: PieChart },
  ] as const;

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Componente invisible para impresión de tirilla */}
      {selectedClosureToPrint && (
        <ClosureTicket
          ref={ticketRef}
          closure={selectedClosureToPrint}
          tenantName={currentTenant?.name}
        />
      )}

      {/* Horizontal Navigation Tabs Bar */}
      <div className="bg-white border border-app-gray-200 rounded-2xl p-2.5 shadow-sm">
        <Tabs
          tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: <t.icon /> }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </div>

      {/* TAB 1: RESUMEN GENERAL */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fade-in">
          {/* Financial Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <StatCard
              tone="mint"
              icon={<TrendingUp />}
              label="Ingresos POS"
              value={formatCOP(metrics.totalSales)}
            />
            <StatCard
              tone="pink"
              icon={<TrendingDown />}
              label="Egresos / Gastos"
              value={formatCOP(metrics.totalExpenses)}
            />
            <StatCard
              tone={metrics.netProfit >= 0 ? 'mint' : 'pink'}
              icon={<DollarSign />}
              label="Utilidad Neta"
              value={formatCOP(metrics.netProfit)}
            />
            <StatCard
              tone="peach"
              icon={<Receipt />}
              label="Por Cobrar (Abonos)"
              value={formatCOP(totalReceivablesAmount)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: INGRESOS */}
      {activeTab === 'incomes' && (
        <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-app-gray-100 pb-3">
            <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-app-mint" />
              Historial de Ingresos y Facturación POS
            </h4>
            <span className="text-xs font-bold text-app-mint bg-app-mint-100 px-3 py-1 rounded-full">
              Total Ingresos: {formatCOP(metrics.totalSales)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                  <th className="p-3 rounded-l-xl">Fecha</th>
                  <th className="p-3">ID Factura/Ticket</th>
                  <th className="p-3">Producto / Servicio</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center rounded-r-xl">Método de Pago</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const flatIncomesList = incomes.flatMap((inc: any) => {
                    if (inc.items && inc.items.length > 0) {
                      return inc.items.map((item: any, idx: number) => ({
                        id: `${inc.id}-${idx}`,
                        createdAt: inc.createdAt,
                        invoiceId: inc.id,
                        name: item.service?.name || item.product?.name || inc.description,
                        category: item.service ? 'Tratamiento' : (item.product ? 'Producto' : 'Tratamiento'),
                        subtotal: parseFloat(item.unitPrice || '0') * (item.quantity || 1),
                        paymentMethod: inc.paymentMethod,
                      }));
                    }
                    return [{
                      id: inc.id,
                      createdAt: inc.createdAt,
                      invoiceId: inc.id,
                      name: inc.description || 'Venta POS Ticket',
                      category: 'Tratamiento',
                      subtotal: parseFloat(inc.amount || '0'),
                      paymentMethod: inc.paymentMethod,
                    }];
                  });

                  if (flatIncomesList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-app-gray-400 italic">
                          No registra ingresos en el período. Las ventas realizadas desde el POS aparecerán aquí.
                        </td>
                      </tr>
                    );
                  }

                  return flatIncomesList.map((row: any) => (
                    <tr key={row.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                      <td className="p-3 font-semibold text-app-text-secondary">
                        {format(new Date(row.createdAt), "d 'de' LLL, yyyy - HH:mm", { locale: es })}
                      </td>
                      <td className="p-3 font-extrabold text-app-text-primary font-mono">
                        {row.invoiceId.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3 font-bold text-app-text-primary">
                        {row.name}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-app-gray-100 text-app-text-primary text-[10px] font-bold rounded-md">
                          {row.category}
                        </span>
                      </td>
                      <td className="p-3 font-black text-emerald-700 text-right font-mono">
                        {formatCOP(row.subtotal)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          {formatPaymentMethod(row.paymentMethod)}
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GASTOS Y EGRESOS */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm h-fit">
            <h4 className="text-sm font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-app-pink" />
              Registrar Egreso de Caja
            </h4>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Monto ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Categoría del Gasto</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-bold text-app-text-primary"
                >
                  <option value="Insumos">Insumos y Productos Estéticos</option>
                  <option value="Arriendo">Arriendo de Local</option>
                  <option value="Servicios">Servicios Públicos</option>
                  <option value="Nómina">Nómina / Sueldos Fijos</option>
                  <option value="Publicidad">Marketing y Publicidad</option>
                  <option value="Mantenimiento">Mantenimiento Equipos</option>
                  <option value="Otros">Otros Gastos</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Método de Pago *</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-bold text-app-text-primary"
                >
                  <option value="cash">💵 Efectivo (Caja Chica)</option>
                  <option value="card">💳 Tarjeta / Datáfono</option>
                  <option value="transfer">📱 Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Concepto / Descripción *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="ej. Compra de esmaltes, ácido hialurónico o pago de luz..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint resize-none font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                {saving ? 'Registrando...' : 'Registrar Egreso'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm flex flex-col h-[500px]">
            <h4 className="text-sm font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2 flex-shrink-0">
              <FileText className="w-5 h-5 text-app-mint" />
              Historial Completo de Egresos de Caja
            </h4>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-app-gray-500">
                  <AlertCircle className="w-10 h-10 stroke-1 mb-2 text-app-gray-200" />
                  <p className="text-xs italic">No hay egresos de caja registrados para esta cuenta.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                        <th className="p-3.5 rounded-l-xl">Fecha</th>
                        <th className="p-3.5">Concepto / Descripción</th>
                        <th className="p-3.5 text-center">Método de Pago</th>
                        <th className="p-3.5 text-right rounded-r-xl">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp: any) => {
                        const expDate = new Date(exp.createdAt);
                        return (
                          <tr key={exp.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                            <td className="p-3.5 font-bold text-app-text-secondary flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-app-gray-550" />
                              {format(expDate, "d 'de' LLL, yyyy", { locale: es })}
                            </td>
                            <td className="p-3.5 font-bold text-app-text-primary max-w-[200px] truncate" title={exp.description}>
                              {exp.description}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="bg-app-gray-100 text-app-text-primary text-[10px] font-bold px-2 py-0.5 rounded-md uppercase animate-fade-in">
                                {exp.paymentMethod === 'cash' ? 'Efectivo' : exp.paymentMethod === 'card' ? 'Tarjeta' : exp.paymentMethod === 'transfer' ? 'Transferencia' : exp.paymentMethod || 'Efectivo'}
                              </span>
                            </td>
                            <td className="p-3.5 font-extrabold text-app-pink text-right font-mono">
                              {formatCOP(exp.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMISIONES */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-app-gray-100 pb-3 gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <Percent className="w-5 h-5 text-app-mint" />
                Comisiones de Especialistas
              </h4>
              <p className="text-xs text-app-text-secondary mt-0.5">
                Configura reglas de comisión por colaborador y gestiona liquidaciones.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-app-gray-100 rounded-xl p-1">
              <button
                onClick={() => setLiquidationSubTab('rules')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  liquidationSubTab === 'rules'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Reglas de Comisión
              </button>
              <button
                onClick={() => setLiquidationSubTab('liquidation')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  liquidationSubTab === 'liquidation'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Liquidación
              </button>
            </div>
          </div>

          {/* ========== SUB-TAB: REGLAS DE COMISIÓN ========== */}
          {liquidationSubTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-bold text-app-gray-500 mb-1">Colaborador</label>
                  <select
                    value={selectedRuleColab}
                    onChange={(e) => setSelectedRuleColab(e.target.value)}
                    className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary bg-white"
                  >
                    <option value="">Todos los colaboradores</option>
                    {collaborators.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleOpenAddRule}
                  disabled={!selectedRuleColab}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-4 h-4" />
                  Agregar Regla
                </button>
              </div>

              {filteredRules.length === 0 ? (
                <div className="text-center py-8 text-app-gray-400 italic text-xs">
                  {selectedRuleColab
                    ? 'No hay reglas configuradas para este colaborador. Agrega una nueva regla.'
                    : 'Selecciona un colaborador para ver o agregar sus reglas de comisión.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                        <th className="p-3.5 rounded-l-xl">Colaborador</th>
                        <th className="p-3.5">Tipo</th>
                        <th className="p-3.5">Servicio / Producto</th>
                        <th className="p-3.5 text-center">% Comisión</th>
                        <th className="p-3.5 text-center rounded-r-xl">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRules.map((rule: any) => (
                        <tr key={rule.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                          <td className="p-3.5 font-bold text-app-text-primary">
                            {rule.collaborator?.name || '—'}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rule.serviceId
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {rule.serviceId ? 'Servicio' : 'Producto'}
                            </span>
                          </td>
                          <td className="p-3.5 text-app-text-secondary">
                            {rule.service?.name || rule.product?.name || '—'}
                          </td>
                          <td className="p-3.5 text-center font-black text-app-mint text-sm">
                            {parseFloat(rule.commissionRate).toFixed(0)}%
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditRule(rule)}
                                className="p-1.5 hover:bg-app-gray-100 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Settings className="w-3.5 h-3.5 text-app-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========== SUB-TAB: LIQUIDACIÓN ========== */}
          {liquidationSubTab === 'liquidation' && (
            <div className="space-y-5">
              {/* Search Panel */}
              <div className="bg-app-gray-50 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-extrabold text-app-text-primary">Buscar Comisiones Pendientes</h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-app-gray-500 mb-1">Colaborador</label>
                    <select
                      value={selectedLiqColab}
                      onChange={(e) => setSelectedLiqColab(e.target.value)}
                      className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {collaborators.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-app-gray-500 mb-1">Desde</label>
                    <input
                      type="date"
                      value={liqDateStart}
                      onChange={(e) => setLiqDateStart(e.target.value)}
                      className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-app-gray-500 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={liqDateEnd}
                      onChange={(e) => setLiqDateEnd(e.target.value)}
                      className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSearchPending}
                      className="w-full px-3.5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Results */}
              {searchedPending && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-app-text-primary">
                      {pendingCommissions.length} comisiones encontradas
                    </h5>
                    {pendingCommissions.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSelectAll}
                          className="text-[10px] font-bold text-app-mint hover:underline"
                        >
                          {selectedItemIds.size === pendingCommissions.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </button>
                        <button
                          onClick={handleCreateLiquidation}
                          disabled={selectedItemIds.size === 0}
                          className="px-3.5 py-1.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          Crear Liquidación ({selectedItemIds.size} ítems — {formatCOP(totalPendingSelected)})
                        </button>
                      </div>
                    )}
                  </div>

                  {pendingCommissions.length === 0 ? (
                    <div className="text-center py-6 text-app-gray-400 italic text-xs">
                      No se encontraron comisiones pendientes para este colaborador en el período.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                            <th className="p-3 rounded-l-xl w-8">
                              <input
                                type="checkbox"
                                checked={selectedItemIds.size === pendingCommissions.length && pendingCommissions.length > 0}
                                onChange={handleSelectAll}
                                className="rounded"
                              />
                            </th>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Servicio / Producto</th>
                            <th className="p-3 text-right">Precio</th>
                            <th className="p-3 text-center">Cant.</th>
                            <th className="p-3 text-right rounded-r-xl">Comisión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingCommissions.map((item: any) => (
                            <tr
                              key={item.id}
                              className={`border-b border-app-gray-50 hover:bg-app-gray-50/50 cursor-pointer ${
                                selectedItemIds.has(item.id) ? 'bg-app-mint-50' : ''
                              }`}
                              onClick={() => toggleItemSelection(item.id)}
                            >
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedItemIds.has(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleItemSelection(item.id)}
                                  className="rounded"
                                />
                              </td>
                              <td className="p-3 text-app-text-secondary">
                                {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: es }) : '—'}
                              </td>
                              <td className="p-3 font-bold text-app-text-primary">
                                {item.serviceName || item.productName || 'Ítem'}
                              </td>
                              <td className="p-3 text-right font-mono text-app-text-secondary">
                                {formatCOP(parseFloat(item.unitPrice || '0') * (item.quantity || 1))}
                              </td>
                              <td className="p-3 text-center">{item.quantity || 1}</td>
                              <td className="p-3 text-right font-black text-app-mint font-mono">
                                {formatCOP(item.commissionPaid)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Liquidation History */}
              <div className="border-t border-app-gray-100 pt-4">
                <h5 className="text-xs font-extrabold text-app-text-primary mb-3">Historial de Liquidaciones</h5>
                {liquidations.length === 0 ? (
                  <div className="text-center py-4 text-app-gray-400 italic text-xs">
                    No hay liquidaciones registradas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                          <th className="p-3 rounded-l-xl">Colaborador</th>
                          <th className="p-3">Período</th>
                          <th className="p-3 text-right">Monto</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center rounded-r-xl">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liquidations.map((liq: any) => (
                          <tr key={liq.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                            <td className="p-3 font-bold text-app-text-primary">
                              {liq.collaborator?.name || '—'}
                            </td>
                            <td className="p-3 text-app-text-secondary">
                              {liq.periodStart
                                ? `${format(new Date(liq.periodStart), 'dd/MM/yy', { locale: es })} - ${format(new Date(liq.periodEnd), 'dd/MM/yy', { locale: es })}`
                                : '—'}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-app-text-primary">
                              {formatCOP(liq.totalAmount)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                liq.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : liq.status === 'approved'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {liq.status === 'draft' ? 'Borrador' : liq.status === 'approved' ? 'Aprobado' : 'Pagado'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {liq.status === 'draft' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateLiquidationStatus(liq.id, 'approved')}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-200 transition-all"
                                    >
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLiquidation(liq.id)}
                                      className="p-1 hover:bg-red-50 rounded-lg transition-all"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </button>
                                  </>
                                )}
                                {liq.status === 'approved' && (
                                  <button
                                    onClick={() => {
                                      setLiquidationToPay(liq);
                                      setPaymentMethod('cash');
                                    }}
                                    className="px-2 py-1 bg-app-mint text-white rounded-lg text-[10px] font-bold hover:bg-app-mint-600 transition-all"
                                  >
                                    Pagar
                                  </button>
                                )}
                                {liq.status === 'paid' && (
                                  <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {liq.paidAt
                                      ? format(new Date(liq.paidAt), 'dd/MM/yy', { locale: es })
                                      : 'Pagado'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rule Modal */}
          {showRuleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 w-full max-w-md shadow-xl space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-app-text-primary">
                    {editingRule ? 'Editar Regla' : 'Nueva Regla de Comisión'}
                  </h4>
                  <button
                    onClick={() => { setShowRuleModal(false); setEditingRule(null); }}
                    className="p-1.5 hover:bg-app-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-app-gray-500" />
                  </button>
                </div>
                <form onSubmit={handleSaveRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-app-gray-500 mb-1">Tipo</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRuleFormType('service'); setRuleFormTargetId(''); }}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          ruleFormType === 'service'
                            ? 'bg-app-mint text-white'
                            : 'bg-app-gray-100 text-app-gray-600'
                        }`}
                      >
                        Servicio
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRuleFormType('product'); setRuleFormTargetId(''); }}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          ruleFormType === 'product'
                            ? 'bg-app-mint text-white'
                            : 'bg-app-gray-100 text-app-gray-600'
                        }`}
                      >
                        Producto
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-gray-500 mb-1">
                      {ruleFormType === 'service' ? 'Servicio' : 'Producto'}
                    </label>
                    <select
                      value={ruleFormTargetId}
                      onChange={(e) => setRuleFormTargetId(e.target.value)}
                      className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary bg-white"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {ruleFormType === 'service'
                        ? servicesList.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} — {formatCOP(s.price)}</option>
                          ))
                        : productsList.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} — {formatCOP(p.price)}</option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-gray-500 mb-1">% Comisión</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={ruleFormRate}
                      onChange={(e) => setRuleFormRate(e.target.value)}
                      placeholder="ej. 35"
                      className="w-full border border-app-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-app-text-primary"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowRuleModal(false); setEditingRule(null); }}
                      className="flex-1 px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Liquidation Detail Modal */}
          {showLiquidationDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[80vh] overflow-y-auto animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-app-text-primary">
                    Detalle de Liquidación
                  </h4>
                  <button
                    onClick={() => setShowLiquidationDetail(null)}
                    className="p-1.5 hover:bg-app-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-app-gray-500" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <p><span className="font-bold text-app-gray-500">Colaborador:</span> {showLiquidationDetail.collaborator?.name}</p>
                  <p><span className="font-bold text-app-gray-500">Período:</span> {format(new Date(showLiquidationDetail.periodStart), 'PPP', { locale: es })} - {format(new Date(showLiquidationDetail.periodEnd), 'PPP', { locale: es })}</p>
                  <p><span className="font-bold text-app-gray-500">Total:</span> {formatCOP(showLiquidationDetail.totalAmount)}</p>
                  <p><span className="font-bold text-app-gray-500">Estado:</span> {showLiquidationDetail.status}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold">
                        <th className="p-2">Servicio/Producto</th>
                        <th className="p-2 text-right">Comisión</th>
                        <th className="p-2 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showLiquidationDetail.items?.map((item: any) => (
                        <tr key={item.id} className="border-b border-app-gray-50">
                          <td className="p-2">
                            {item.transactionItem?.service?.name || item.transactionItem?.product?.name || '—'}
                          </td>
                          <td className="p-2 text-right font-mono">{formatCOP(item.commissionAmount)}</td>
                          <td className="p-2 text-center font-bold text-app-mint">
                            {parseFloat(item.appliedRate).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {liquidationToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 w-full max-w-sm shadow-xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-extrabold text-app-text-primary">
                Confirmar Pago de Liquidación
              </h4>
              <button
                onClick={() => setLiquidationToPay(null)}
                className="p-1.5 hover:bg-app-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-app-gray-500" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-app-gray-50 rounded-2xl p-3.5">
              <div className="flex justify-between">
                <span className="font-bold text-app-gray-500">Colaborador:</span>
                <span className="font-bold text-app-text-primary">{liquidationToPay.collaborator?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-app-gray-500">Período:</span>
                <span className="font-bold text-app-text-primary">
                  {liquidationToPay.periodStart
                    ? `${format(new Date(liquidationToPay.periodStart), 'dd/MM/yy', { locale: es })} - ${format(new Date(liquidationToPay.periodEnd), 'dd/MM/yy', { locale: es })}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-app-gray-500">Monto Total:</span>
                <span className="font-black text-app-mint font-mono text-sm">{formatCOP(liquidationToPay.totalAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-app-gray-500 mb-2">Método de Pago</label>
              <div className="flex gap-2">
                {([
                  { id: 'cash', label: 'Efectivo' },
                  { id: 'card', label: 'Tarjeta' },
                  { id: 'transfer', label: 'Transferencia' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      paymentMethod === opt.id
                        ? 'bg-app-mint text-white'
                        : 'bg-app-gray-100 text-app-gray-600 hover:bg-app-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-app-text-secondary text-center">
              Se registrará como egreso en la caja activa si existe.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLiquidationToPay(null)}
                className="flex-1 px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isPaying}
                className="flex-1 px-4 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isPaying ? 'Procesando...' : 'Confirmar y Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CUENTAS POR COBRAR */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-gray-150 pb-4">
            <div>
              <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Control de Cuentas por Cobrar
              </h4>
              <p className="text-xs text-app-text-secondary mt-0.5">
                Administración y registro de facturas pendientes de cobro a clientes.
              </p>
            </div>

            <button
              onClick={handleOpenAddReceivable}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Cuenta por Cobrar
            </button>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                  <th className="p-3 rounded-l-xl">Fecha Registro</th>
                  <th className="p-3">Número Factura</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Valor Total</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Documento</th>
                  <th className="p-3 text-center rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-app-gray-400 italic">
                      No hay cuentas por cobrar registradas.
                    </td>
                  </tr>
                ) : (
                  receivables.map((item: any) => (
                    <tr key={item.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                      <td className="p-3 font-semibold text-app-text-secondary">
                        {item.createdAt ? format(new Date(item.createdAt), "d 'de' LLL, yyyy", { locale: es }) : 'N/A'}
                      </td>
                      <td className="p-3 font-extrabold text-app-text-primary font-mono">
                        {item.invoiceNumber || 'S/N'}
                      </td>
                      <td className="p-3 text-app-text-secondary">{item.description}</td>
                      <td className="p-3 text-app-text-secondary">
                        <span className="bg-app-gray-100 text-app-text-primary text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-black text-app-text-primary font-mono text-right">
                        {formatCOP(parseFloat(item.totalValue || '0'))}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'paid' ? 'COBRADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.documentUrl ? (
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-app-mint">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[80px]" title={item.documentUrl}>
                              {item.documentUrl}
                            </span>
                          </div>
                        ) : (
                          <span className="text-app-gray-400 italic">Ninguno</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleQuickCollect(item)}
                              className="text-[10px] font-extrabold text-amber-600 hover:underline"
                            >
                              Cobrar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditReceivable(item)}
                            className="text-[10px] font-bold text-app-mint hover:underline"
                          >
                            Modificar
                          </button>
                          <button
                            onClick={() => handleDeleteReceivable(item.id)}
                            className="text-[10px] font-bold text-app-pink hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO / MODIFICACIÓN DE CUENTA POR COBRAR */}
      {isReceivableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-app-gray-200 w-full max-w-md overflow-hidden animate-scale-up animate-fade-in">
            <div className="p-6 border-b border-app-gray-150 bg-app-gray-50/50">
              <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <Receipt className="w-5 h-5 text-app-mint" />
                {selectedReceivable ? 'Modificar Cuenta por Cobrar' : 'Registrar Cuenta por Cobrar'}
              </h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                Ingresa los detalles de la factura o ticket de cobro.
              </p>
            </div>

            <form onSubmit={handleSubmitReceivable}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Fecha de Registro:</label>
                  <input
                    type="date"
                    required
                    value={receivableCreatedAt}
                    onChange={(e) => setReceivableCreatedAt(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  />
                </div>

                {/* Número de Factura */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Número Factura / Ticket:</label>
                  <input
                    type="text"
                    value={receivableInvoiceNumber}
                    onChange={(e) => setReceivableInvoiceNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                    placeholder="ej: FAC-2026-88"
                  />
                </div>

                {/* Descripción / Tratamiento / Productos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Descripción (Tratamientos/Productos):</label>
                  <input
                    type="text"
                    required
                    value={receivableDescription}
                    onChange={(e) => setReceivableDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                    placeholder="ej: Tratamiento de Rejuvenecimiento Facial de 3 sesiones"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Categoría:</label>
                  <select
                    value={receivableCategory}
                    onChange={(e) => setReceivableCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  >
                    <option value="Tratamientos">Tratamientos / Servicios</option>
                    <option value="Productos">Productos / Cremas</option>
                  </select>
                </div>

                {/* Valor Total */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Valor Total ($ COP):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={receivableTotalValue}
                    onChange={(e) => setReceivableTotalValue(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-app-mint"
                    placeholder="Ingresa el valor total"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Estado de Pago:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="receivableStatus"
                        value="pending"
                        checked={receivableStatus === 'pending'}
                        onChange={() => setReceivableStatus('pending')}
                        className="accent-app-mint"
                      />
                      Pendiente
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="receivableStatus"
                        value="paid"
                        checked={receivableStatus === 'paid'}
                        onChange={() => setReceivableStatus('paid')}
                        className="accent-app-mint"
                      />
                      Cobrado (Pagado)
                    </label>
                  </div>
                </div>

                {/* Documento (Tirilla de factura) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Documento (Tirilla de Factura):</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 border border-app-gray-200 hover:bg-app-gray-50 rounded-xl cursor-pointer text-xs font-bold text-app-text-secondary transition-all">
                      <Download className="w-4 h-4 text-app-mint" />
                      Seleccionar Archivo
                      <input
                        type="file"
                        onChange={handleReceivableFileChange}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                    </label>
                    {receivableDocumentUrl && (
                      <span className="text-[10px] text-app-mint font-bold truncate max-w-[150px]">
                        {receivableDocumentUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-app-gray-150 bg-app-gray-50/50 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsReceivableModalOpen(false)}
                  className="px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReceivable}
                  className="px-5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  {submittingReceivable ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO: REGISTRAR INGRESO POR COBRO DE CUENTA */}
      {isIncomePromptOpen && receivableToCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-app-gray-200 w-full max-w-sm overflow-hidden animate-scale-up animate-fade-in">
            <div className="p-6 border-b border-app-gray-150 bg-app-gray-50/50">
              <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-app-mint" />
                Registrar Cobro Realizado
              </h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                Ingresa el monto que se va a abonar o cobrar de la cuenta.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-250 text-xs space-y-1">
                <p className="text-emerald-900 font-bold">Detalle de la cuenta:</p>
                <p className="text-emerald-800"><span className="font-bold">Factura:</span> {receivableToCollect.invoiceNumber || 'S/N'}</p>
                <p className="text-emerald-800"><span className="font-bold">Descripción:</span> {receivableToCollect.description}</p>
                <p className="text-emerald-950 font-black"><span className="font-bold">Saldo Pendiente:</span> {formatCOP(parseFloat(receivableToCollect.totalValue))}</p>
              </div>

              {/* Monto del abono */}
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-app-text-primary block">Monto a Cobrar / Abonar ($ COP):</label>
                <input
                  type="number"
                  min="1"
                  max={parseFloat(receivableToCollect.totalValue)}
                  value={collectAmountInput}
                  onChange={(e) => setCollectAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-app-mint"
                  placeholder="Monto a cobrar"
                />
                {parseFloat(collectAmountInput) < parseFloat(receivableToCollect.totalValue) && (
                  <p className="text-[10px] text-amber-700 font-bold mt-1">
                    Saldo restante después del abono: {formatCOP(parseFloat(receivableToCollect.totalValue) - parseFloat(collectAmountInput || '0'))}
                  </p>
                )}
              </div>

              {/* Log as income check */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="logAsIncomeCheckbox"
                  checked={logAsIncome}
                  onChange={(e) => setLogAsIncome(e.target.checked)}
                  className="mt-0.5 accent-app-mint"
                />
                <div>
                  <label htmlFor="logAsIncomeCheckbox" className="text-xs font-bold text-app-text-primary block cursor-pointer">
                    Registrar ingreso en el flujo de caja
                  </label>
                  <p className="text-[10px] text-app-text-secondary mt-0.5">
                    Creará automáticamente una transacción de venta/ingreso que sumará esta cantidad al saldo del día.
                  </p>
                </div>
              </div>

              {/* Payment Method selection */}
              {logAsIncome && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[11px] font-bold text-app-text-primary block">Método de Cobro del Ingreso:</label>
                  <select
                    value={receivableIncomeMethod}
                    onChange={(e) => setReceivableIncomeMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  >
                    <option value="cash">💵 Efectivo (Ingresa a Caja Chica)</option>
                    <option value="card">💳 Tarjeta / Datafono</option>
                    <option value="transfer">📱 Transferencia Bancaria</option>
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-app-gray-150 bg-app-gray-50/50 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsIncomePromptOpen(false);
                  setReceivableToCollect(null);
                }}
                className="px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                disabled={submittingReceivable}
                className="px-5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                {submittingReceivable ? 'Procesando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CUENTAS POR PAGAR */}
      {activeTab === 'payables' && (
        <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-gray-150 pb-4">
            <div>
              <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-app-pink" />
                Control de Cuentas por Pagar
              </h4>
              <p className="text-xs text-app-text-secondary mt-0.5">
                Administración y registro de facturas u órdenes de compra pendientes con proveedores.
              </p>
            </div>

            <button
              onClick={handleOpenAddPayable}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Cuenta por Pagar
            </button>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                  <th className="p-3 rounded-l-xl">Fecha de Registro</th>
                  <th className="p-3">Nº Factura / OC</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Documento</th>
                  <th className="p-3 text-center rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-app-gray-400 italic">
                      No hay cuentas por pagar registradas.
                    </td>
                  </tr>
                ) : (
                  payables.map((item: any) => (
                    <tr key={item.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                      <td className="p-3 font-semibold text-app-text-secondary">
                        {item.createdAt ? format(new Date(item.createdAt), "d 'de' LLL, yyyy", { locale: es }) : 'N/A'}
                      </td>
                      <td className="p-3 font-extrabold text-app-text-primary font-mono">
                        {item.invoiceNumber || 'S/N'}
                      </td>
                      <td className="p-3 text-app-text-secondary">{item.description}</td>
                      <td className="p-3 text-app-text-secondary">
                        <span className="bg-app-gray-100 text-app-text-primary text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-black text-app-text-primary font-mono">
                        {formatCOP(parseFloat(item.totalValue || '0'))}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.documentUrl ? (
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-app-mint">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[80px]" title={item.documentUrl}>
                              {item.documentUrl}
                            </span>
                          </div>
                        ) : (
                          <span className="text-app-gray-400 italic">Ninguno</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleQuickPay(item)}
                              className="text-[10px] font-extrabold text-amber-600 hover:underline"
                            >
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditPayable(item)}
                            className="text-[10px] font-bold text-app-mint hover:underline"
                          >
                            Modificar
                          </button>
                          <button
                            onClick={() => handleDeletePayable(item.id)}
                            className="text-[10px] font-bold text-app-pink hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO / MODIFICACIÓN DE CUENTA POR PAGAR */}
      {isPayableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-app-gray-200 w-full max-w-md overflow-hidden animate-scale-up animate-fade-in">
            <div className="p-6 border-b border-app-gray-150 bg-app-gray-50/50">
              <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-app-mint" />
                {selectedPayable ? 'Modificar Cuenta por Pagar' : 'Registrar Cuenta por Pagar'}
              </h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                Ingresa los detalles de la factura u orden de compra.
              </p>
            </div>

            <form onSubmit={handleSubmitPayable}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Fecha de Creación:</label>
                  <input
                    type="date"
                    required
                    value={payableCreatedAt}
                    onChange={(e) => setPayableCreatedAt(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  />
                </div>

                {/* Número de Factura */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Nº Factura / Orden de Compra:</label>
                  <input
                    type="text"
                    value={payableInvoiceNumber}
                    onChange={(e) => setPayableInvoiceNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                    placeholder="ej: FAC-2026-98"
                  />
                </div>

                {/* Descripción / Producto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Producto/Servicio/Descripción:</label>
                  <input
                    type="text"
                    required
                    value={payableDescription}
                    onChange={(e) => setPayableDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                    placeholder="ej: Compra de toallas de algodón premium"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Categoría:</label>
                  <select
                    value={payableCategory}
                    onChange={(e) => setPayableCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  >
                    <option value="Insumos">Insumos y Cosméticos</option>
                    <option value="Arriendo">Arriendo y Servicios Públicos</option>
                    <option value="Nómina">Nómina y Especialistas</option>
                    <option value="Marketing">Marketing y Publicidad</option>
                    <option value="Mantenimiento">Mantenimiento de Equipos</option>
                    <option value="Otros">Otros Egresos</option>
                  </select>
                </div>

                {/* Valor Total */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Valor Total ($ COP):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={payableTotalValue}
                    onChange={(e) => setPayableTotalValue(e.target.value)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-app-mint"
                    placeholder="Ingresa el valor total"
                  />
                </div>

                {/* Estado de pago */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Estado de Pago:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="payableStatus"
                        value="pending"
                        checked={payableStatus === 'pending'}
                        onChange={() => setPayableStatus('pending')}
                        className="accent-app-mint"
                      />
                      Pendiente
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="payableStatus"
                        value="paid"
                        checked={payableStatus === 'paid'}
                        onChange={() => setPayableStatus('paid')}
                        className="accent-app-mint"
                      />
                      Pagado
                    </label>
                  </div>
                </div>

                {/* Subir archivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-app-text-primary block">Subir Documento (Factura / Recibo):</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 border border-app-gray-200 hover:bg-app-gray-50 rounded-xl cursor-pointer text-xs font-bold text-app-text-secondary transition-all">
                      <Download className="w-4 h-4 text-app-mint" />
                      Seleccionar Archivo
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                    </label>
                    {payableDocumentUrl && (
                      <span className="text-[10px] text-app-mint font-bold truncate max-w-[150px]">
                        {payableDocumentUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-app-gray-150 bg-app-gray-50/50 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsPayableModalOpen(false)}
                  className="px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayable}
                  className="px-5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  {submittingPayable ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO: REGISTRAR EGRESO POR PAGO DE CUENTA */}
      {isExpensePromptOpen && payableToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-app-gray-200 w-full max-w-sm overflow-hidden animate-scale-up animate-fade-in">
            <div className="p-6 border-b border-app-gray-150 bg-app-gray-50/50">
              <h3 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-500" />
                Registrar Pago de Cuenta
              </h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                La cuenta se marcará como <strong>Pagada</strong>.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-250 text-xs space-y-1">
                <p className="text-amber-900 font-bold">Detalle de la cuenta:</p>
                <p className="text-amber-800"><span className="font-bold">Factura:</span> {payableToPay.invoiceNumber || 'S/N'}</p>
                <p className="text-amber-800"><span className="font-bold">Descripción:</span> {payableToPay.description}</p>
                <p className="text-amber-950 font-black"><span className="font-bold">Monto:</span> {formatCOP(parseFloat(payableToPay.totalValue))}</p>
              </div>

              {/* Log as expense check */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="logAsExpenseCheckbox"
                  checked={logAsExpense}
                  onChange={(e) => setLogAsExpense(e.target.checked)}
                  className="mt-0.5 accent-app-mint"
                />
                <div>
                  <label htmlFor="logAsExpenseCheckbox" className="text-xs font-bold text-app-text-primary block cursor-pointer">
                    Registrar egreso en el flujo de caja
                  </label>
                  <p className="text-[10px] text-app-text-secondary mt-0.5">
                    Creará automáticamente un registro de Gasto/Egreso que restará esta cantidad del saldo del día.
                  </p>
                </div>
              </div>

              {/* Payment Method selection */}
              {logAsExpense && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[11px] font-bold text-app-text-primary block">Método de Pago del Egreso:</label>
                  <select
                    value={payableExpenseMethod}
                    onChange={(e) => setPayableExpenseMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-app-gray-200 rounded-xl text-xs font-semibold bg-transparent outline-none focus:border-app-mint"
                  >
                    <option value="cash">💵 Efectivo (Caja Chica)</option>
                    <option value="card">💳 Tarjeta / Datafono</option>
                    <option value="transfer">📱 Transferencia Bancaria</option>
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-app-gray-150 bg-app-gray-50/50 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsExpensePromptOpen(false);
                  setPayableToPay(null);
                }}
                className="px-4 py-2 bg-app-gray-100 hover:bg-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                disabled={submittingPayable}
                className="px-5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                {submittingPayable ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HISTORIAL DE ARQUEOS Y CIERRES DE CAJA */}
      {activeTab === 'closures' && (
        <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-app-gray-100 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                Historial de Arqueos y Cierres de Caja
              </h4>
              <p className="text-xs text-app-text-secondary mt-0.5">
                Registro de cierres de turno, dinero físico declarado e impresión de tirillas.
              </p>
            </div>

            <span className="text-xs font-bold text-app-mint bg-app-mint-100 px-3 py-1 rounded-full">
              {closuresHistory.length} Cierres Registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                  <th className="p-3.5 rounded-l-xl">Fecha de Cierre</th>
                  <th className="p-3.5">Cajero</th>
                  <th className="p-3.5">Base Inicial</th>
                  <th className="p-3.5">Efectivo Esperado</th>
                  <th className="p-3.5">Efectivo Declarado</th>
                  <th className="p-3.5 text-center">Diferencia</th>
                  <th className="p-3.5 text-center rounded-r-xl">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {closuresHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-app-gray-400 italic">
                      No hay registros de cierres de caja finalizados.
                    </td>
                  </tr>
                ) : (
                  closuresHistory.map((cl: any) => {
                    const diffNum = parseFloat(cl.difference || '0');
                    return (
                      <tr key={cl.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                        <td className="p-3.5 font-bold text-app-text-secondary">
                          {cl.closedAt ? format(new Date(cl.closedAt), "d 'de' LLL, yyyy - HH:mm", { locale: es }) : 'N/A'}
                        </td>
                        <td className="p-3.5 font-bold text-app-text-primary">
                          {cl.closedByUser?.name || cl.openedByUser?.name || 'Cajero'}
                        </td>
                        <td className="p-3.5 font-bold font-mono">
                          {formatCOP(parseFloat(cl.initialBase || '0'))}
                        </td>
                        <td className="p-3.5 font-bold text-app-text-secondary font-mono">
                          {formatCOP(parseFloat(cl.expectedCash || '0'))}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700 font-mono">
                          {formatCOP(parseFloat(cl.declaredCash || '0'))}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                            diffNum === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : diffNum > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {diffNum > 0 ? '+' : ''}{formatCOP(diffNum)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handlePrintClosure(cl)}
                            className="px-3 py-1.5 bg-app-mint hover:bg-app-mint-600 text-white text-[10px] font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Tirilla
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTE MENSUAL P&L */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[28px] border border-app-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-app-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-app-mint" />
                  Estado de Resultados Consolidado (P&L)
                </h4>
                <p className="text-xs text-app-text-secondary mt-0.5">
                  Balance financiero general del mes.
                </p>
              </div>

              <button
                onClick={() => alert('Descargando reporte financiero en PDF...')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Download className="w-4 h-4" />
                Descargar Reporte PDF
              </button>
            </div>

            <div className="bg-app-gray-50/70 p-5 rounded-2xl border border-app-gray-200 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-app-gray-200">
                <span className="font-extrabold text-app-text-primary text-sm">(+) Total Ingresos por Ventas POS</span>
                <span className="font-black text-app-mint text-sm font-mono">+{formatCOP(metrics.totalSales)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-app-text-secondary pl-4">
                <span>(-) Comisiones pagadas a Especialistas (Staff)</span>
                <span className="font-bold text-app-pink font-mono">-{formatCOP(metrics.totalCommissions || 0)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-app-text-secondary pl-4 pb-2 border-b border-app-gray-200">
                <span>(-) Egresos Operativos e Insumos Estéticos</span>
                <span className="font-bold text-app-pink font-mono">-{formatCOP(metrics.totalExpenses)}</span>
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <span className="font-black text-app-text-primary uppercase tracking-wider font-sans">(=) Utilidad Neta Real</span>
                <span className="font-black text-app-mint text-base font-mono bg-white px-3 py-1 rounded-xl border border-app-mint-250 shadow-xs">
                  {formatCOP(metrics.netProfit || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
