import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Send,
  X,
  Sparkles,
  ChevronDown,
  Eye,
  ArrowLeft,
  MoreVertical,
  Thermometer,
  Heart,
  Activity,
  UserCheck,
  Download,
  AlertCircle
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Button, Modal, Input } from '../components/ui';
import { LoyaltyCard } from '../components/loyalty/LoyaltyCard';
import { PointsHistory } from '../components/loyalty/PointsHistory';
import { ReactivateAlert } from '../components/loyalty/ReactivateAlert';
import { RewardsModal } from '../components/loyalty/RewardsModal';
import { ActivityLogModal } from '../components/loyalty/ActivityLogModal';
import { ActivityLogSection } from '../components/loyalty/ActivityLogSection';

export const CRMPage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh, setPendingAppointmentDetail, setCurrentTab } = useAppStore();

  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'list' or 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatmentFilter, setSelectedTreatmentFilter] = useState('');
  const [selectedSpecialistFilter, setSelectedSpecialistFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // Medical Data Editing State (Full modal)
  const [showEditMedicalModal, setShowEditMedicalModal] = useState(false);
  const [editMedicalData, setEditMedicalData] = useState<any>({
    name: '',
    phone: '',
    email: '',
    docType: '',
    docNumber: '',
    gender: '',
    age: '',
    temp: '',
    heartRate: '',
    bloodPressure: '',
    respiratoryRate: '',
    allergies: '',
    notes: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: ''
  });

  // Section-specific modals
  const [showEditEmergencyModal, setShowEditEmergencyModal] = useState(false);
  const [editEmergencyData, setEditEmergencyData] = useState({ name: '', relation: '', phone: '' });
  const [showEditVitalsModal, setShowEditVitalsModal] = useState(false);
  const [editVitalsData, setEditVitalsData] = useState({ temp: '', heartRate: '', bloodPressure: '', respiratoryRate: '' });
  const [showEditAllergiesModal, setShowEditAllergiesModal] = useState(false);
  const [editAllergiesData, setEditAllergiesData] = useState({ allergies: '', notes: '' });

  // Documents
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docDescription, setDocDescription] = useState('');

  // Modals / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Chat input
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Loyalty state
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);

  // All client balances for table display
  const [clientBalances, setClientBalances] = useState<Map<string, number>>(new Map());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'ficha' | 'tratamientos' | 'fidelizacion' | 'historial' | 'chat'>('tratamientos');

  useEffect(() => {
    const fetchCRMData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        const [clientsRes, appRes, servicesRes, colabsRes, balancesRes] = await Promise.all([
          fetch('/api/clients', { headers }),
          fetch('/api/appointments', { headers }),
          fetch('/api/services', { headers }),
          fetch('/api/collaborators', { headers }),
          fetch('/api/loyalty?balances=true', { headers }),
        ]);

        if (clientsRes.ok) setClients(await clientsRes.json());
        if (appRes.ok) setAppointments(await appRes.json());
        if (servicesRes.ok) setServices(await servicesRes.json());
        if (colabsRes.ok) setCollaborators(await colabsRes.json());
        if (balancesRes.ok) {
          const data = await balancesRes.json();
          setClientBalances(new Map(data.map((b: any) => [b.clientId, b.balance])));
        }
      } catch (err) {
        console.error('Error al cargar datos CRM:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCRMData();
  }, [currentTenant, refreshTrigger]);

  useEffect(() => {
    const fetchClientDetailData = async () => {
      if (!selectedClient || !currentTenant) return;

      try {
        const headers = { 'x-tenant-id': currentTenant.id };

        const [chatRes, loyaltyRes, configRes, rewardsRes, activityRes] = await Promise.all([
          fetch(`/api/messages?clientId=${selectedClient.id}`, { headers }),
          fetch(`/api/loyalty?clientId=${selectedClient.id}`, { headers }),
          fetch('/api/loyalty?config=true', { headers }),
          fetch('/api/loyalty?rewards=true', { headers }),
          fetch(`/api/client-activity?clientId=${selectedClient.id}`, { headers }),
        ]);

        if (chatRes.ok) setChatHistory(await chatRes.json());
        if (loyaltyRes.ok) setLoyaltyData(await loyaltyRes.json());
        if (configRes.ok) setLoyaltyConfig(await configRes.json());
        if (rewardsRes.ok) setRewards(await rewardsRes.json());
        if (activityRes.ok) setActivityLog(await activityRes.json());
      } catch (err) {
        console.error('Error al cargar datos del cliente:', err);
      }
    };

    fetchClientDetailData();
  }, [selectedClient, currentTenant]);

  const calculateDaysSinceLastVisit = (clientId: string): number => {
    const clientApps = appointments.filter(
      app => app.clientId === clientId && app.status === 'completed'
    );

    if (clientApps.length === 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        return Math.floor((Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }
      return 0;
    }

    const lastVisit = clientApps.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    return Math.floor((Date.now() - new Date(lastVisit.startTime).getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!selectedClient || !currentTenant) return;

    const response = await fetch('/api/loyalty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant.id
      },
      body: JSON.stringify({
        clientId: selectedClient.id,
        rewardId
      })
    });

    if (response.ok) {
      const updatedRes = await fetch(`/api/loyalty?clientId=${selectedClient.id}`, {
        headers: { 'x-tenant-id': currentTenant.id }
      });
      if (updatedRes.ok) setLoyaltyData(await updatedRes.json());
      triggerRefresh();
    }
  };

  const handleRegisterActivity = async (action: string, description: string, metadata?: any) => {
    if (!selectedClient || !currentTenant) return;

    const response = await fetch('/api/client-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant.id
      },
      body: JSON.stringify({
        clientId: selectedClient.id,
        action,
        description,
        metadata
      })
    });

    if (response.ok) {
      const updatedRes = await fetch(`/api/client-activity?clientId=${selectedClient.id}`, {
        headers: { 'x-tenant-id': currentTenant.id }
      });
      if (updatedRes.ok) setActivityLog(await updatedRes.json());
      setShowActivityModal(false);
    }
  };

  const handleOpenAppointmentDetail = (appointmentId: string) => {
    setPendingAppointmentDetail(appointmentId);
    setCurrentTab('calendar');
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      alert('Campos incompletos');
      return;
    }

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({
          name: formName,
          email: formEmail || null,
          phone: formPhone,
          notes: formNotes || null
        })
      });

      if (response.ok) {
        const newC = await response.json();
        setShowCreateModal(false);
        setSelectedClient(newC);
        setViewMode('detail');
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormNotes('');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedClient || !currentTenant) return;
    
    setSendingMsg(true);
    const content = chatInput;
    setChatInput('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant.id
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          direction: 'outbound',
          content,
          channel: 'whatsapp'
        })
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessagesState((prev: any[]) => [...prev, newMsg]);

        setTimeout(async () => {
          try {
            await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': currentTenant.id
              },
              body: JSON.stringify({
                clientId: selectedClient.id,
                direction: 'inbound',
                content: "¡Perfecto! Nos vemos pronto en la cita.",
                channel: 'whatsapp',
                status: 'read'
              })
            });
            const refreshChatRes = await fetch(`/api/messages?clientId=${selectedClient.id}`, {
              headers: { 'x-tenant-id': currentTenant.id }
            });
            if (refreshChatRes.ok) {
              setMessagesState(await refreshChatRes.json());
            }
          } catch (error) {}
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Safe setter helper for chat messages
  const setMessagesState = (updater: any) => {
    setChatHistory(updater);
  };

  const getParsedMedicalData = (client: any) => {
    if (!client || !client.notes) return {};
    try {
      if (client.notes.trim().startsWith('{')) {
        return JSON.parse(client.notes);
      }
    } catch (e) {}
    return { notes: client.notes };
  };

  const openEditMedicalModal = () => {
    if (!selectedClient) return;
    const parsed = getParsedMedicalData(selectedClient);
    setEditMedicalData({
      name: selectedClient.name || '',
      phone: selectedClient.phone || '',
      email: selectedClient.email || '',
      docType: parsed.docType || '',
      docNumber: parsed.docNumber || '',
      gender: parsed.gender || '',
      age: parsed.age || '',
      temp: parsed.temp || '',
      heartRate: parsed.heartRate || '',
      bloodPressure: parsed.bloodPressure || '',
      respiratoryRate: parsed.respiratoryRate || '',
      allergies: parsed.allergies || '',
      notes: parsed.notes || '',
      emergencyContactName: parsed.emergencyContactName || '',
      emergencyContactRelation: parsed.emergencyContactRelation || '',
      emergencyContactPhone: parsed.emergencyContactPhone || ''
    });
    setShowEditMedicalModal(true);
  };

  const mergeAndSaveMedicalData = async (partialUpdate: any) => {
    if (!selectedClient || !currentTenant) return false;
    const existing = getParsedMedicalData(selectedClient);
    const merged = { ...existing, ...partialUpdate };
    const documents = merged.documents || [];
    try {
      const response = await fetch(`/api/clients?id=${selectedClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant.id
        },
        body: JSON.stringify({
          name: selectedClient.name,
          phone: selectedClient.phone,
          email: selectedClient.email,
          notes: JSON.stringify({ ...merged, documents })
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedClient(updated);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        triggerRefresh();
        return true;
      }
      const err = await response.json();
      alert(`Error al guardar: ${err.error}`);
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleSaveMedicalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !currentTenant) return;

    const clinicalPayload = {
      docType: editMedicalData.docType,
      docNumber: editMedicalData.docNumber,
      gender: editMedicalData.gender,
      age: editMedicalData.age,
      temp: editMedicalData.temp,
      heartRate: editMedicalData.heartRate,
      bloodPressure: editMedicalData.bloodPressure,
      respiratoryRate: editMedicalData.respiratoryRate,
      allergies: editMedicalData.allergies,
      notes: editMedicalData.notes,
      emergencyContactName: editMedicalData.emergencyContactName,
      emergencyContactRelation: editMedicalData.emergencyContactRelation,
      emergencyContactPhone: editMedicalData.emergencyContactPhone
    };

    try {
      const response = await fetch(`/api/clients?id=${selectedClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant.id
        },
        body: JSON.stringify({
          name: editMedicalData.name,
          phone: editMedicalData.phone,
          email: editMedicalData.email,
          notes: JSON.stringify(clinicalPayload)
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedClient(updated);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        setShowEditMedicalModal(false);
        triggerRefresh();
      } else {
        const err = await response.json();
        alert(`Error al guardar: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c => {
    const parsed = getParsedMedicalData(c);
    const docNumber = parsed.docNumber || '';
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          docNumber.includes(searchTerm) ||
                          (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const clientApps = appointments.filter(a => a.clientId === c.id);

    const matchesTreatment = !selectedTreatmentFilter || clientApps.some(a => a.serviceId === selectedTreatmentFilter || a.service?.name === selectedTreatmentFilter);
    const matchesSpecialist = !selectedSpecialistFilter || clientApps.some(a => a.specialistId === selectedSpecialistFilter || a.specialist?.name === selectedSpecialistFilter);
    
    let matchesDate = true;
    if (selectedDateFilter) {
      const filterDate = new Date(selectedDateFilter);
      matchesDate = isSameDay(new Date(c.createdAt), filterDate) || clientApps.some(a => isSameDay(new Date(a.startTime), filterDate));
    }

    return matchesSearch && matchesTreatment && matchesSpecialist && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const paginatedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTreatmentFilter, selectedSpecialistFilter, selectedDateFilter]);

  const clientAppointments = selectedClient
    ? appointments.filter(app => app.clientId === selectedClient.id)
    : [];

  const getColabNameForClient = (clientId: string) => {
    const app = appointments.find(a => a.clientId === clientId);
    return app?.specialist?.name || 'Dra. Olivia Grant';
  };

  const getColabForClient = (clientId: string) => {
    const app = appointments.find(a => a.clientId === clientId);
    if (!app?.specialist?.id) return null;
    return collaborators.find(c => c.id === app.specialist.id) || null;
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  // --- RENDERING DETAIL VIEW ---
  if (viewMode === 'detail' && selectedClient) {
    const nextApp = clientAppointments.find(a => a.status === 'scheduled');
    const pastApps = clientAppointments.filter(a => a.status === 'completed');
    const medical = getParsedMedicalData(selectedClient);

    return (
      <div className="space-y-4">
        {/* Top Header Back Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 text-xs text-app-mint font-extrabold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a la Lista de Clientes
            </button>
            <h3 className="text-lg font-black text-app-text-primary mt-1 font-sans">
              Ficha / Detalles del Cliente
            </h3>
          </div>

          <button
            onClick={openEditMedicalModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Editar Datos
          </button>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* COLUMN 1: PATIENT PROFILE ONLY (lg:col-span-1) */}
          <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
            {/* Patient Profile Card */}
            <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-5 relative">
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-20 h-20 rounded-full bg-app-mint-100 text-app-mint font-black text-2xl flex items-center justify-center border-2 border-app-mint-250 shadow-md">
                  {selectedClient.name.charAt(0)}
                </div>
                <h4 className="text-sm font-black text-app-text-primary mt-3 font-sans leading-tight">
                  {selectedClient.name}
                </h4>
                <div className="mt-3 space-y-1.5 w-full text-center">
                  <p className="text-xs text-app-mint font-extrabold flex items-center justify-center gap-1.5 bg-app-mint-50/80 py-1.5 px-3 rounded-xl border border-app-mint-100/80">
                    <Phone className="w-3.5 h-3.5" />
                    {selectedClient.phone || 'Sin teléfono'}
                  </p>
                  <p className="text-[11px] text-app-text-secondary font-semibold flex items-center justify-center gap-1.5 truncate max-w-full px-2 py-0.5">
                    <Mail className="w-3.5 h-3.5 text-app-gray-500 shrink-0" />
                    <span className="truncate">{selectedClient.email || 'Sin correo registrado'}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-app-gray-50">
                  <span className="text-[10px] text-app-gray-500 font-bold uppercase">Id Cliente</span>
                  <span className="text-xs font-bold text-app-text-primary font-mono">#{selectedClient.id.slice(0, 6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-app-gray-50">
                  <span className="text-[10px] text-app-gray-500 font-bold uppercase">Documento</span>
                  <span className="text-xs font-bold text-app-text-primary">{(medical.docType || 'Cédula') + ': ' + (medical.docNumber || 'Sin especificar')}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-app-gray-50">
                  <span className="text-[10px] text-app-gray-500 font-bold uppercase">Género</span>
                  <span className="text-xs font-bold text-app-text-primary">{medical.gender || 'Sin especificar'}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-app-gray-50">
                  <span className="text-[10px] text-app-gray-500 font-bold uppercase">Edad</span>
                  <span className="text-xs font-bold text-app-text-primary">{medical.age ? `${medical.age} años` : 'Sin especificar'}</span>
                </div>
              </div>
              <button
                onClick={openEditMedicalModal}
                className="w-full py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center"
              >
                Editar Datos
              </button>
            </div>
          </div>

          {/* COLUMN 2: TABS + CONTENT (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-6 flex flex-col justify-start">
            
            {/* Segmented Pill Toggle */}
            <div className="flex items-center gap-1 bg-app-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveDetailTab('ficha')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDetailTab === 'ficha'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Ficha Tecnica
              </button>
              <button
                onClick={() => setActiveDetailTab('historial')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDetailTab === 'historial'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveDetailTab('chat')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDetailTab === 'chat'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setActiveDetailTab('tratamientos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDetailTab === 'tratamientos'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Tratamientos
              </button>
              <button
                onClick={() => setActiveDetailTab('fidelizacion')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDetailTab === 'fidelizacion'
                    ? 'bg-white shadow-sm text-app-text-primary'
                    : 'text-app-gray-500 hover:text-app-text-secondary'
                }`}
              >
                Fidelizacion
              </button>
            </div>

            {/* Tab Content */}
            {activeDetailTab === 'ficha' && (
              <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-5 flex-1">
                <div className="flex justify-between items-center border-b border-app-gray-100 pb-2">
                  <h5 className="text-sm font-black text-app-text-primary uppercase tracking-wider">Ficha Tecnica & Signos</h5>
                  <button onClick={() => {
                    setEditVitalsData({
                      temp: medical.temp || '',
                      heartRate: medical.heartRate || '',
                      bloodPressure: medical.bloodPressure || '',
                      respiratoryRate: medical.respiratoryRate || ''
                    });
                    setShowEditVitalsModal(true);
                  }} className="text-sm text-app-mint font-bold hover:underline">
                    Editar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#fdf2f8] border border-[#fce7f3] p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white text-app-mint flex items-center justify-center shadow-sm">
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-500 font-bold uppercase block">Temp. Corporal</span>
                      <span className="text-sm font-extrabold text-app-text-primary">{medical.temp || 'Sin registrar'}</span>
                    </div>
                  </div>
                  <div className="bg-[#fef2f2] border border-[#fee2e2] p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white text-app-pink flex items-center justify-center shadow-sm">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-500 font-bold uppercase block">Frec. Cardiaca</span>
                      <span className="text-sm font-extrabold text-app-text-primary">{medical.heartRate || 'Sin registrar'}</span>
                    </div>
                  </div>
                  <div className="bg-[#fef2f2] border border-[#fee2e2] p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white text-app-pink flex items-center justify-center shadow-sm">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-500 font-bold uppercase block">Presion Art.</span>
                      <span className="text-sm font-extrabold text-app-text-primary">{medical.bloodPressure || 'Sin registrar'}</span>
                    </div>
                  </div>
                  <div className="bg-[#fdf2f8] border border-[#fce7f3] p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white text-app-mint flex items-center justify-center shadow-sm">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-500 font-bold uppercase block">Frec. Respiratoria</span>
                      <span className="text-sm font-extrabold text-app-text-primary">{medical.respiratoryRate || 'Sin registrar'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="text-xs font-bold text-app-gray-500 uppercase tracking-wider">Alergias Conocidas</h6>
                    <button onClick={() => {
                      setEditAllergiesData({
                        allergies: medical.allergies || '',
                        notes: medical.notes || ''
                      });
                      setShowEditAllergiesModal(true);
                    }} className="text-xs text-app-mint font-bold hover:underline">
                      Editar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      {medical.allergies ? (
                        <ul className="list-disc list-inside text-sm text-app-text-secondary space-y-1 font-semibold">
                          {medical.allergies.split('\n').map((alg: string, idx: number) => (
                            <li key={idx}>{alg}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-app-gray-400 italic">No registra alergias conocidas.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-app-text-secondary bg-app-gray-50 p-2.5 rounded-xl border border-app-gray-150 italic leading-relaxed">
                        {medical.notes || 'No registra notas clinicas especiales para tratamientos.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-app-gray-100 pt-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h6 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Contacto de Emergencia</h6>
                    <button onClick={() => {
                      setEditEmergencyData({
                        name: medical.emergencyContactName || '',
                        relation: medical.emergencyContactRelation || '',
                        phone: medical.emergencyContactPhone || ''
                      });
                      setShowEditEmergencyModal(true);
                    }} className="text-xs text-app-mint font-bold hover:underline">
                      Editar
                    </button>
                  </div>
                  <div className="space-y-3 text-sm text-app-text-secondary leading-tight">
                    <div>
                      <span className="text-xs text-app-gray-550 block mb-0.5">Telefono Celular Cliente</span>
                      <span className="font-bold text-app-text-primary">{selectedClient.phone}</span>
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-550 block mb-0.5">Correo Electronico Cliente</span>
                      <span className="font-bold text-app-text-primary truncate block">{selectedClient.email || 'no-registra@correo.com'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-app-gray-550 block mb-0.5">Contacto / Familiar Directo</span>
                      {medical.emergencyContactName ? (
                        <>
                          <span className="font-bold text-app-text-primary block">
                            {medical.emergencyContactName} {medical.emergencyContactRelation ? `(${medical.emergencyContactRelation})` : ''}
                          </span>
                          {medical.emergencyContactPhone && (
                            <span className="text-xs text-app-gray-500 font-mono mt-0.5 block">{medical.emergencyContactPhone}</span>
                          )}
                        </>
                      ) : (
                        <span className="italic text-app-gray-400 text-sm">Sin contacto asignado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="border-t border-app-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h6 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Documentos</h6>
                    <button onClick={() => { setDocName(''); setDocDescription(''); setShowUploadDocModal(true); }} className="text-xs text-app-mint font-bold hover:underline">
                      + Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(medical.documents && medical.documents.length > 0) ? (
                      medical.documents.map((doc: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-app-gray-50 border border-app-gray-150 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#fef2f2] text-[#dc2626] flex items-center justify-center font-bold text-xs flex-shrink-0">
                              PDF
                            </div>
                            <div className="overflow-hidden leading-tight">
                              <span className="text-sm font-bold text-app-text-primary truncate block">{doc.name}</span>
                              {doc.description && <span className="text-xs text-app-gray-500 font-semibold uppercase">{doc.description}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.data;
                              link.download = doc.name;
                              link.click();
                            }}
                            className="p-1.5 hover:bg-app-gray-150 rounded-lg text-app-gray-550"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-app-gray-400 italic text-center py-4">No hay documentos adjuntos.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'tratamientos' && (
              <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-5 flex-1">
                <div className="flex justify-between items-center border-b border-app-gray-100 pb-2">
                  <h5 className="text-sm font-black text-app-text-primary uppercase tracking-wider">Tratamientos</h5>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-app-gray-500 font-bold uppercase block">Especialista Asignado</span>
                  <div className="flex items-center gap-3 bg-app-gray-50 p-2.5 rounded-2xl border border-app-gray-150">
                    <div className="w-9 h-9 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center shadow-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-app-text-primary leading-tight">
                        {getColabNameForClient(selectedClient.id)}
                      </h6>
                      <span className="text-xs text-app-gray-500 mt-0.5 block">
                        {(() => {
                          const colab = getColabForClient(selectedClient.id);
                          const specs = colab?.specialties;
                          if (specs && specs.length > 0) return specs.join(' · ');
                          return 'Sin especialidades registradas';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-app-gray-500 font-bold uppercase tracking-wider block">Citas Programadas</span>
                  {nextApp ? (
                    <div
                      onClick={() => handleOpenAppointmentDetail(nextApp.id)}
                      className="p-3 bg-gradient-to-tr from-[#fef2f2] to-[#fee2e2] border border-app-pink-250/20 rounded-2xl shadow-sm leading-tight space-y-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-[#ffe8d4] text-[#a44c00] text-[10px] font-bold rounded-full uppercase">
                          Pendiente
                        </span>
                      </div>
                      <h6 className="text-sm font-bold text-app-text-primary">{nextApp.service.name}</h6>
                      <p className="text-xs text-app-text-secondary flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-app-pink" />
                        {format(new Date(nextApp.startTime), "yyyy/MM/dd - HH:mm")}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-app-mint font-bold mt-1">
                        <Eye className="w-3 h-3" />
                        Ver detalle en Citas
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-app-gray-500 italic">No registra citas pendientes.</p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs text-app-gray-500 font-bold uppercase tracking-wider block">Historial de Tratamientos</span>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {pastApps.length === 0 ? (
                      <p className="text-sm text-app-gray-500 italic">No registra tratamientos anteriores.</p>
                    ) : (
                      pastApps.map(app => (
                        <div key={app.id} className="p-2.5 bg-white border border-app-gray-200 rounded-2xl shadow-sm leading-tight space-y-1.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 bg-app-mint-100 text-app-mint text-[10px] font-bold rounded-full uppercase">
                              Completado
                            </span>
                          </div>
                          <h6 className="text-sm font-bold text-app-text-primary">{app.service.name}</h6>
                          <span className="text-xs text-app-gray-500 block">
                            {format(new Date(app.startTime), "yyyy/MM/dd")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'fidelizacion' && loyaltyData && loyaltyConfig && (
              <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-4 flex-1">
                <div className="flex justify-between items-center border-b border-app-gray-100 pb-2">
                  <h5 className="text-sm font-black text-app-text-primary uppercase tracking-wider">
                    Fidelizacion
                  </h5>
                  <button
                    onClick={() => setShowRewardsModal(true)}
                    className="text-xs text-app-mint font-bold hover:underline"
                  >
                    Canjear Puntos
                  </button>
                </div>

                <LoyaltyCard
                  balance={loyaltyData.balance}
                  daysSinceLastVisit={calculateDaysSinceLastVisit(selectedClient.id)}
                  inactivityThreshold={loyaltyConfig.inactivityDays}
                  onRedeemClick={() => setShowRewardsModal(true)}
                />

                {calculateDaysSinceLastVisit(selectedClient.id) >= loyaltyConfig.inactivityDays && (
                  <ReactivateAlert
                    daysSinceLastVisit={calculateDaysSinceLastVisit(selectedClient.id)}
                    threshold={loyaltyConfig.inactivityDays}
                    clientName={selectedClient.name}
                    clientPhone={selectedClient.phone}
                    onRegisterContact={() => setShowActivityModal(true)}
                  />
                )}

                <PointsHistory history={loyaltyData.history || []} />
              </div>
            )}

            {activeDetailTab === 'fidelizacion' && (!loyaltyData || !loyaltyConfig) && (
              <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex-1 flex items-center justify-center">
                <p className="text-sm text-app-gray-500 italic">Cargando datos de fidelizacion...</p>
              </div>
            )}

            {activeDetailTab === 'historial' && (
              <ActivityLogSection
                activities={activityLog}
                onRegisterClick={() => setShowActivityModal(true)}
              />
            )}

            {activeDetailTab === 'chat' && (
              <div className="bg-white border border-app-gray-200 rounded-[28px] shadow-sm flex flex-col flex-1 min-h-[460px] overflow-hidden">
                <div className="p-3 bg-app-gray-50 border-b border-app-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-650 flex items-center justify-center font-bold text-[10px]">
                      WA
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-app-text-primary leading-tight">Chat de WhatsApp</h5>
                      <span className="text-[10px] text-emerald-650 font-bold">Linea activa con cliente</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9f6]">
                  {chatHistory.length === 0 ? (
                    <p className="text-sm text-app-gray-500 italic text-center py-12">No hay mensajes recientes con el cliente.</p>
                  ) : (
                    chatHistory.map((msg) => {
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isOutbound ? 'bg-app-mint text-white rounded-br-none' : 'bg-white border border-app-gray-200 text-app-text-primary rounded-bl-none'
                          }`}>
                            <p>{msg.content}</p>
                            <span className="text-[10px] block text-right mt-1 opacity-70">
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-2.5 border-t border-app-gray-100 flex gap-2 bg-white flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Escribir mensaje por WhatsApp..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={sendingMsg}
                    className="flex-1 px-3 py-2 border border-app-gray-200 rounded-xl text-sm bg-transparent outline-none focus:border-app-mint font-medium"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="px-4 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl shadow-sm font-bold text-sm flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Enviar
                  </button>
                </form>
              </div>
            )}

          </div>

        {/* Section Edit Modals */}
          {showEditEmergencyModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in relative">
                <button onClick={() => setShowEditEmergencyModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-app-mint" />
                  Contacto de Emergencia
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await mergeAndSaveMedicalData({
                    emergencyContactName: editEmergencyData.name,
                    emergencyContactRelation: editEmergencyData.relation,
                    emergencyContactPhone: editEmergencyData.phone
                  });
                  if (ok) setShowEditEmergencyModal(false);
                }} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre del Contacto</label>
                    <input type="text" placeholder="ej. Sara Restrepo" value={editEmergencyData.name}
                      onChange={(e) => setEditEmergencyData({ ...editEmergencyData, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Parentesco</label>
                    <input type="text" placeholder="ej. Hermana" value={editEmergencyData.relation}
                      onChange={(e) => setEditEmergencyData({ ...editEmergencyData, relation: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Teléfono del Contacto</label>
                    <input type="text" placeholder="ej. +57 311 000 9988" value={editEmergencyData.phone}
                      onChange={(e) => setEditEmergencyData({ ...editEmergencyData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setShowEditEmergencyModal(false)}
                      className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50">Cancelar</button>
                    <button type="submit"
                      className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditVitalsModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in relative">
                <button onClick={() => setShowEditVitalsModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-app-mint" />
                  Signos Vitales
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await mergeAndSaveMedicalData({
                    temp: editVitalsData.temp,
                    heartRate: editVitalsData.heartRate,
                    bloodPressure: editVitalsData.bloodPressure,
                    respiratoryRate: editVitalsData.respiratoryRate
                  });
                  if (ok) setShowEditVitalsModal(false);
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Temp. Corporal</label>
                      <input type="text" placeholder="ej. 37 °C" value={editVitalsData.temp}
                        onChange={(e) => setEditVitalsData({ ...editVitalsData, temp: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Cardíaca</label>
                      <input type="text" placeholder="ej. 72 LPM" value={editVitalsData.heartRate}
                        onChange={(e) => setEditVitalsData({ ...editVitalsData, heartRate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Presión Arterial</label>
                      <input type="text" placeholder="ej. 120 / 80 mmHg" value={editVitalsData.bloodPressure}
                        onChange={(e) => setEditVitalsData({ ...editVitalsData, bloodPressure: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Respiratoria</label>
                      <input type="text" placeholder="ej. 16 /min" value={editVitalsData.respiratoryRate}
                        onChange={(e) => setEditVitalsData({ ...editVitalsData, respiratoryRate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setShowEditVitalsModal(false)}
                      className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50">Cancelar</button>
                    <button type="submit"
                      className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditAllergiesModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in relative">
                <button onClick={() => setShowEditAllergiesModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-app-mint" />
                  Alergias y Observaciones
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await mergeAndSaveMedicalData({
                    allergies: editAllergiesData.allergies,
                    notes: editAllergiesData.notes
                  });
                  if (ok) setShowEditAllergiesModal(false);
                }} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Alergias Conocidas</label>
                    <textarea rows={3} placeholder="Piel Sensible&#10;Látex..." value={editAllergiesData.allergies}
                      onChange={(e) => setEditAllergiesData({ ...editAllergiesData, allergies: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Observaciones Técnicas</label>
                    <textarea rows={3} placeholder="Notas especiales para tratamientos..." value={editAllergiesData.notes}
                      onChange={(e) => setEditAllergiesData({ ...editAllergiesData, notes: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setShowEditAllergiesModal(false)}
                      className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50">Cancelar</button>
                    <button type="submit"
                      className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showUploadDocModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in relative">
                <button onClick={() => setShowUploadDocModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-app-mint" />
                  Adjuntar Documento
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!docName.trim()) { alert('Ingrese un nombre para el documento.'); return; }
                  const fileInput = (e.target as HTMLFormElement).querySelector('#docFile') as HTMLInputElement;
                  const file = fileInput?.files?.[0];
                  let fileData = '';
                  if (file) {
                    const reader = new FileReader();
                    fileData = await new Promise<string>((resolve) => {
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                    });
                  } else {
                    alert('Debe seleccionar un archivo.');
                    return;
                  }
                  const existing = getParsedMedicalData(selectedClient);
                  const docs = existing.documents || [];
                  const newDoc = {
                    name: docName,
                    description: docDescription,
                    data: fileData
                  };
                  docs.push(newDoc);
                  const ok = await mergeAndSaveMedicalData({ documents: docs });
                  if (ok) { setShowUploadDocModal(false); setDocName(''); setDocDescription(''); }
                }} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre del Documento *</label>
                    <input type="text" required placeholder="ej. Test de Diagnóstico Dérmico" value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Descripción</label>
                    <input type="text" placeholder="ej. Resultados del diagnóstico" value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Archivo *</label>
                    <input id="docFile" type="file" required
                      className="w-full text-xs text-app-text-primary file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-app-mint file:text-white hover:file:bg-app-mint-600 cursor-pointer" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setShowUploadDocModal(false)}
                      className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50">Cancelar</button>
                    <button type="submit"
                      className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md">Agregar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Full Edit Medical Data Modal */}
          {showEditMedicalModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowEditMedicalModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-app-mint" />
                  Editar Ficha del Cliente
                </h4>
                <form onSubmit={handleSaveMedicalData} className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-app-mint uppercase block">Información de Contacto</span>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre Completo *</label>
                      <input type="text" required value={editMedicalData.name}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Teléfono / WhatsApp *</label>
                        <input type="text" required value={editMedicalData.phone}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, phone: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Correo Electrónico</label>
                        <input type="email" value={editMedicalData.email}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, email: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-app-gray-100">
                    <span className="text-xs font-extrabold text-app-mint uppercase block">Datos Personales</span>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Tipo de Documento</label>
                      <select value={editMedicalData.docType}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, docType: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary mb-2">
                        <option value="Cédula">Cédula</option>
                        <option value="Pasaporte">Pasaporte</option>
                        <option value="Tarjeta de Identidad">Tarjeta de Identidad</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Número de Documento</label>
                      <input type="text" placeholder="ej. 1234567890" value={editMedicalData.docNumber}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, docNumber: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary mb-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Género</label>
                        <input type="text" placeholder="ej. Femenino" value={editMedicalData.gender}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, gender: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Edad</label>
                        <input type="text" placeholder="ej. 34" value={editMedicalData.age}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, age: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-app-gray-100">
                    <span className="text-xs font-extrabold text-app-mint uppercase block">Signos Vitales</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Temp. Corporal</label>
                        <input type="text" placeholder="ej. 37 °C" value={editMedicalData.temp}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, temp: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Cardíaca</label>
                        <input type="text" placeholder="ej. 72 LPM" value={editMedicalData.heartRate}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, heartRate: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Presión Arterial</label>
                        <input type="text" placeholder="ej. 120 / 80 mmHg" value={editMedicalData.bloodPressure}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, bloodPressure: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Respiratoria</label>
                        <input type="text" placeholder="ej. 16 /min" value={editMedicalData.respiratoryRate}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, respiratoryRate: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-app-gray-100">
                    <span className="text-xs font-extrabold text-app-mint uppercase block">Contacto de Emergencia</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre Familiar / Contacto</label>
                        <input type="text" placeholder="ej. Sara Restrepo" value={editMedicalData.emergencyContactName}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactName: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Parentesco</label>
                        <input type="text" placeholder="ej. Hermana" value={editMedicalData.emergencyContactRelation}
                          onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactRelation: e.target.value })}
                          className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Teléfono del Contacto</label>
                      <input type="text" placeholder="ej. +57 311 000 9988" value={editMedicalData.emergencyContactPhone}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactPhone: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-app-gray-100">
                    <span className="text-xs font-extrabold text-app-mint uppercase block">Historial & Observaciones</span>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Alergias Conocidas (una por línea)</label>
                      <textarea rows={2} placeholder="Piel Sensible&#10;Látex..." value={editMedicalData.allergies}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, allergies: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Observaciones Técnicas / Notas</label>
                      <textarea rows={2} placeholder="Notas especiales para tratamientos..." value={editMedicalData.notes}
                        onChange={(e) => setEditMedicalData({ ...editMedicalData, notes: e.target.value })}
                        className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                    </div>
                  </div>
                  <div className="pt-3 flex gap-2">
                    <button type="button" onClick={() => setShowEditMedicalModal(false)}
                      className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50">Cancelar</button>
                    <button type="submit"
                      className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md">Guardar Cambios</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <RewardsModal
            isOpen={showRewardsModal}
            onClose={() => setShowRewardsModal(false)}
            clientBalance={loyaltyData?.balance || 0}
            rewards={rewards}
            redeemedHistory={(loyaltyData?.history || []).filter((h: any) => h.type === 'redeemed').map((h: any) => ({
              id: h.id,
              points: h.points,
              description: h.description,
              createdAt: h.createdAt,
            }))}
            onRedeem={handleRedeemReward}
          />

          <ActivityLogModal
            isOpen={showActivityModal}
            onClose={() => setShowActivityModal(false)}
            activities={activityLog}
            onRegister={handleRegisterActivity}
          />
        </div>
      </div>
    );
  }

  // --- RENDERING LIST VIEW (FULL-WIDTH PATIENTS DIRECTORY) ---
  return (
    <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
      
      {/* Search & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-app-gray-500" />
            <input
              type="text"
              placeholder="Buscar cliente, tratamiento, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-app-gray-200 rounded-xl text-xs bg-app-bg outline-none focus:border-app-mint focus:bg-white transition-all font-semibold"
            />
          </div>
          
          {/* Dynamic Treatment Filter */}
          <select
            value={selectedTreatmentFilter}
            onChange={(e) => setSelectedTreatmentFilter(e.target.value)}
            className="px-3 py-2 bg-app-mint-50 border border-app-mint-250 text-app-mint text-xs font-extrabold rounded-xl outline-none cursor-pointer hover:bg-app-mint-100 transition-all"
          >
            <option value="">Todos los Tratamientos</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Dynamic Specialist Filter */}
          <select
            value={selectedSpecialistFilter}
            onChange={(e) => setSelectedSpecialistFilter(e.target.value)}
            className="px-3 py-2 bg-app-mint-50 border border-app-mint-250 text-app-mint text-xs font-extrabold rounded-xl outline-none cursor-pointer hover:bg-app-mint-100 transition-all"
          >
            <option value="">Todos los Especialistas</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Dynamic Date Picker Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-app-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-app-mint" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-app-text-primary outline-none cursor-pointer"
            />
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter('')}
                className="text-app-gray-400 hover:text-app-text-primary ml-1"
                title="Limpiar fecha"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(searchTerm || selectedTreatmentFilter || selectedSpecialistFilter || selectedDateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTreatmentFilter('');
                setSelectedSpecialistFilter('');
                setSelectedDateFilter('');
              }}
              className="text-2xs font-bold text-app-pink hover:underline px-2"
            >
              Limpiar Filtros
            </button>
          )}
          <Button size="sm" icon={<Plus />} onClick={() => setShowCreateModal(true)}>
            Registrar Cliente
          </Button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-app-gray-200 text-app-text-secondary font-extrabold uppercase tracking-wider text-2xs bg-app-gray-50/50">
              <th className="p-3 w-8 rounded-l-xl">
                <input type="checkbox" className="rounded border-app-gray-300" />
              </th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Celular</th>
              <th className="p-3">Puntos Acumulados</th>
              <th className="p-3 text-center rounded-r-xl w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.map((client) => {
              const medData = getParsedMedicalData(client);
              const docStr = medData.docNumber
                ? `${medData.docType || 'Cédula'}: ${medData.docNumber}`
                : '—';
              const balance = clientBalances.get(client.id) ?? 0;
              return (
                <tr
                  key={client.id}
                  className="border-b border-app-gray-100 last:border-b-0 hover:bg-app-gray-50/50 transition-colors"
                >
                  <td className="p-3">
                    <input type="checkbox" className="rounded border-app-gray-300" />
                  </td>
                  <td className="p-3 font-bold text-app-text-primary flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-app-mint-100 text-app-mint font-bold text-2xs flex items-center justify-center shadow-sm flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <span>{client.name}</span>
                  </td>
                  <td className="p-3 text-app-text-secondary text-xs font-medium">
                    {docStr}
                  </td>
                  <td className="p-3 text-app-text-secondary text-xs">
                    {client.phone || '—'}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
                      {balance}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye />}
                      className="mx-auto"
                      onClick={() => {
                        setSelectedClient(client);
                        setViewMode('detail');
                      }}
                    >
                      Ver Ficha
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between border-t border-app-gray-100 pt-4 mt-3 flex-shrink-0 text-xs font-bold text-app-gray-500">
        <div>
          Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredClients.length)}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} de {filteredClients.length} clientes
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 border border-app-gray-200 rounded-lg hover:bg-app-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                page === currentPage
                  ? 'bg-app-mint text-white'
                  : 'hover:bg-app-gray-50 text-app-text-primary'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            className="p-1 border border-app-gray-200 rounded-lg hover:bg-app-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            &gt;
          </button>
        </div>
      </div>

      {/* CREATE CLIENT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Registrar Cliente"
        subtitle="Crea la ficha básica del cliente para el CRM."
        icon={<User />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="create-client-form">
              Guardar Ficha
            </Button>
          </>
        }
      >
        <form id="create-client-form" onSubmit={handleCreateClient} className="space-y-4">
          <Input
            label="Nombre Completo *"
            type="text"
            required
            placeholder="ej. Laura Gomez"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="Número de Teléfono *"
            type="tel"
            required
            placeholder="ej. +57 300 123 4567"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="ej. laura@ejemplo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <div>
            <label className="text-2xs font-extrabold uppercase tracking-wider text-app-text-secondary mb-1.5 block">Notas Técnicas</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              placeholder="Alergias, preferencias de crema, detalles estéticos..."
              className="w-full px-3.5 py-2.5 border border-app-gray-200 rounded-xl text-sm font-medium text-app-text-primary bg-white outline-none focus:border-app-mint focus:ring-2 focus:ring-app-mint-100 resize-none transition-all placeholder:text-app-gray-500"
            />
          </div>
        </form>
      </Modal>

      {/* EDIT MEDICAL DATA MODAL */}
      {showEditMedicalModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowEditMedicalModal(false)} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-app-gray-50 text-app-gray-550">
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-md font-extrabold text-app-text-primary font-sans mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-app-mint" />
              Editar Ficha del Cliente
            </h4>

            <form onSubmit={handleSaveMedicalData} className="space-y-4">
              {/* Información Básica */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-app-mint uppercase block">Información de Contacto</span>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={editMedicalData.name}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={editMedicalData.phone}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editMedicalData.email}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-xs font-extrabold text-app-mint uppercase block">Datos Personales</span>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Tipo de Documento</label>
                  <select value={editMedicalData.docType}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, docType: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary mb-2">
                    <option value="Cédula">Cédula</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Tarjeta de Identidad">Tarjeta de Identidad</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Número de Documento</label>
                  <input type="text" placeholder="ej. 1234567890" value={editMedicalData.docNumber}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, docNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary mb-2" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Género</label>
                    <input
                      type="text"
                      placeholder="ej. Femenino"
                      value={editMedicalData.gender}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, gender: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Edad</label>
                    <input
                      type="text"
                      placeholder="ej. 34"
                      value={editMedicalData.age}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, age: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Signos Vitales */}
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-xs font-extrabold text-app-mint uppercase block">Signos Vitales</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Temp. Corporal</label>
                    <input
                      type="text"
                      placeholder="ej. 37 °C"
                      value={editMedicalData.temp}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, temp: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Cardíaca</label>
                    <input
                      type="text"
                      placeholder="ej. 72 LPM"
                      value={editMedicalData.heartRate}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, heartRate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Presión Arterial</label>
                    <input
                      type="text"
                      placeholder="ej. 120 / 80 mmHg"
                      value={editMedicalData.bloodPressure}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, bloodPressure: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Frec. Respiratoria</label>
                    <input
                      type="text"
                      placeholder="ej. 16 /min"
                      value={editMedicalData.respiratoryRate}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, respiratoryRate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-xs font-extrabold text-app-mint uppercase block">Contacto de Emergencia</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Nombre Familiar / Contacto</label>
                    <input
                      type="text"
                      placeholder="ej. Sara Restrepo"
                      value={editMedicalData.emergencyContactName}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Parentesco</label>
                    <input
                      type="text"
                      placeholder="ej. Hermana"
                      value={editMedicalData.emergencyContactRelation}
                      onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactRelation: e.target.value })}
                      className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Teléfono del Contacto</label>
                  <input
                    type="text"
                    placeholder="ej. +57 311 000 9988"
                    value={editMedicalData.emergencyContactPhone}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary"
                  />
                </div>
              </div>

              {/* Alergias & Observaciones */}
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-xs font-extrabold text-app-mint uppercase block">Historial & Observaciones</span>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Alergias Conocidas (una por línea)</label>
                  <textarea
                    rows={2}
                    placeholder="Piel Sensible&#10;Látex..."
                    value={editMedicalData.allergies}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, allergies: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-app-gray-500 uppercase block mb-1">Observaciones Técnicas / Notas</label>
                  <textarea
                    rows={2}
                    placeholder="Notas especiales para tratamientos..."
                    value={editMedicalData.notes}
                    onChange={(e) => setEditMedicalData({ ...editMedicalData, notes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-sm bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditMedicalModal(false)}
                  className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-sm font-bold hover:bg-app-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Internal icon component for message icon
const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
