import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Sparkles,
  CheckCircle,
  XCircle,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import {
  format,
  addMinutes,
  isSameDay,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, IconButton, Badge, Modal, Input, Tabs } from '../components/ui';
import type { TabItem } from '../components/ui';

export const CalendarPage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh, setCurrentTab, setPendingPOSItem, setAppointmentTxFilter, pendingAppointmentDetail, setPendingAppointmentDetail } = useAppStore();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedColabFilter, setSelectedColabFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Form State
  const [formClientId, setFormClientId] = useState('');
  const [formSpecialistId, setFormSpecialistId] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formNotes, setFormNotes] = useState('');
  const [formRoom, setFormRoom] = useState('Cabina 1');

  // Quick Client Creation State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [savingNewClient, setSavingNewClient] = useState(false);

  // Treatment Search Filter inside modal
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Workday hours (8:00 to 19:00)
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        
        const [appRes, colabRes, clientRes, serviceRes] = await Promise.all([
          fetch('/api/appointments', { headers }),
          fetch('/api/collaborators', { headers }),
          fetch('/api/clients', { headers }),
          fetch('/api/services', { headers })
        ]);

        if (appRes.ok) setAppointments(await appRes.json());
        if (colabRes.ok) setCollaborators(await colabRes.json());
        if (clientRes.ok) setClients(await clientRes.json());
        if (serviceRes.ok) setServices(await serviceRes.json());
      } catch (err) {
        console.error('Error al cargar datos del calendario:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenant, refreshTrigger]);

  // Open appointment detail from external navigation (e.g. CRM)
  useEffect(() => {
    if (pendingAppointmentDetail && appointments.length > 0) {
      const target = appointments.find((a: any) => a.id === pendingAppointmentDetail);
      if (target) {
        setSelectedAppointment(target);
        setShowDetailModal(true);
        setPendingAppointmentDetail(null);
      }
    }
  }, [pendingAppointmentDetail, appointments]);

  const handlePrev = () => {
    if (activeView === 'day') {
      setSelectedDate(prev => addDays(prev, -1));
    } else if (activeView === 'week') {
      setSelectedDate(prev => addDays(prev, -7));
    } else {
      setSelectedDate(prev => addMonths(prev, -1));
    }
  };

  const handleNext = () => {
    if (activeView === 'day') {
      setSelectedDate(prev => addDays(prev, 1));
    } else if (activeView === 'week') {
      setSelectedDate(prev => addDays(prev, 7));
    } else {
      setSelectedDate(prev => addMonths(prev, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const openCreateModal = (specialistId = '', time = '09:00', date: Date = selectedDate) => {
    setSelectedDate(date);
    setFormClientId(clients[0]?.id || '');
    setFormSpecialistId(specialistId || collaborators[0]?.id || '');
    setFormServiceId(services[0]?.id || '');
    setFormTime(time);
    setFormNotes('');
    setFormRoom('Cabina 1');
    setIsAddingClient(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setServiceSearchQuery('');
    setShowCreateModal(true);
  };

  const handleCreateQuickClient = async () => {
    if (!newClientName.trim()) {
      alert('Ingrese el nombre del cliente.');
      return;
    }
    setSavingNewClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({
          name: newClientName.trim(),
          phone: newClientPhone.trim() || '',
          email: newClientEmail.trim() || ''
        })
      });

      if (res.ok) {
        const createdClient = await res.json();
        setClients(prev => [...prev, createdClient]);
        setFormClientId(createdClient.id);
        setIsAddingClient(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
      } else {
        const err = await res.json();
        alert(`Error al registrar cliente: ${err.error}`);
      }
    } catch (err) {
      console.error('Error al crear cliente rápido:', err);
    } finally {
      setSavingNewClient(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formSpecialistId || !formServiceId || !formTime) {
      alert('Campos incompletos');
      return;
    }

    const service = services.find(s => s.id === formServiceId);
    if (!service) return;

    const [hoursStr, minutesStr] = formTime.split(':');
    const startTime = new Date(selectedDate);
    startTime.setHours(parseInt(hoursStr), parseInt(minutesStr), 0, 0);
    const endTime = addMinutes(startTime, service.duration);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({
          clientId: formClientId,
          specialistId: formSpecialistId,
          serviceId: formServiceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes: `${formNotes} [Sala: ${formRoom}]`,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        triggerRefresh();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppointment) return;
    try {
      const response = await fetch(`/api/appointments?id=${selectedAppointment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        setShowDetailModal(false);
        triggerRefresh();

        if (status === 'completed') {
          setPendingPOSItem({
            clientId: selectedAppointment.clientId,
            serviceId: selectedAppointment.serviceId,
            collaboratorId: selectedAppointment.specialistId
          });
          setCurrentTab('pos');
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    if (!confirm('¿Desea eliminar la cita?')) return;
    try {
      const response = await fetch(`/api/appointments?id=${selectedAppointment.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id }
      });
      if (response.ok) {
        setShowDetailModal(false);
        triggerRefresh();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  // Calculate days for day/week views
  const displayedDays = activeView === 'day'
    ? [selectedDate]
    : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i));

  // Calculate days for month view
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filter services inside modal
  const filteredFormServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  const handleServiceSearchChange = (val: string) => {
    setServiceSearchQuery(val);
    const matched = services.filter(s => s.name.toLowerCase().includes(val.toLowerCase()));
    if (matched.length > 0) {
      setFormServiceId(matched[0].id);
    }
  };

  const viewTabs: TabItem[] = [
    { id: 'day', label: 'Día' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
  ];

  // Google Calendar style layout algorithm for overlapping events
  const getDayLayout = (dayApps: any[]) => {
    const sorted = [...dayApps].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const columns: any[][] = [];
    const layoutMap = new Map<string, { colIndex: number; totalCols: number }>();

    for (const app of sorted) {
      const start = new Date(app.startTime).getTime();
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastAppInCol = col[col.length - 1];
        const lastEnd = new Date(lastAppInCol.endTime).getTime();
        if (start >= lastEnd) {
          col.push(app);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([app]);
      }
    }

    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      for (const app of columns[colIndex]) {
        layoutMap.set(app.id, {
          colIndex,
          totalCols: columns.length
        });
      }
    }
    return layoutMap;
  };

  return (
    <div className="space-y-5">
      {/* 1. FILTER & NAVIGATION BAR */}
      <div className="bg-white p-4 rounded-3xl border border-app-gray-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left Side Navigation & Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToday}
          >
            Hoy
          </Button>

          <div className="flex items-center gap-1">
            <IconButton variant="neutral" icon={ChevronLeft} label="Anterior" onClick={handlePrev} />
            <IconButton variant="neutral" icon={ChevronRight} label="Siguiente" onClick={handleNext} />
          </div>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1.5 bg-app-gray-50 border border-app-gray-200 rounded-xl px-3 py-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-app-mint" />
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setSelectedDate(new Date(year, month - 1, day));
                }
              }}
              className="bg-transparent text-xs font-bold text-app-text-primary outline-none cursor-pointer"
            />
          </div>

          <span className="text-sm font-extrabold text-app-text-primary ml-1 capitalize">
            {activeView === 'day' 
              ? format(selectedDate, "eeee, d 'de' MMMM yyyy", { locale: es })
              : format(selectedDate, 'MMMM yyyy', { locale: es })}
          </span>
        </div>

        {/* Right Side Filters & View selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedColabFilter}
            onChange={(e) => setSelectedColabFilter(e.target.value)}
            className="px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent font-bold outline-none text-app-text-secondary"
          >
            <option value="">Todos los Especialistas</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <Tabs
            tabs={viewTabs}
            activeTab={activeView}
            onChange={(id) => setActiveView(id as 'day' | 'week' | 'month')}
          />

          <Button icon={<Plus />} onClick={() => openCreateModal()}>
            Agendar Cita
          </Button>
        </div>
      </div>

      {/* 2. CALENDAR VIEWS */}
      {activeView === 'month' ? (
        /* MONTH VIEW (Vista Mes estilo Google Calendar) */
        <div className="bg-white border border-app-gray-200 rounded-[28px] shadow-sm p-4 overflow-hidden">
          {/* Month Header Days */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center border-b border-app-gray-100 pb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dayName => (
              <div key={dayName} className="text-[11px] font-bold text-app-gray-500 uppercase">
                {dayName}
              </div>
            ))}
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {monthDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayApps = appointments.filter(app => {
                const matchesDate = isSameDay(new Date(app.startTime), day);
                const matchesDoctor = selectedColabFilter ? app.specialistId === selectedColabFilter : true;
                return matchesDate && matchesDoctor;
              });

              return (
                <div
                  key={idx}
                  onClick={() => openCreateModal(selectedColabFilter, '08:00', day)}
                  className={`min-h-[110px] p-2 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:border-app-mint ${
                    !isCurrentMonth 
                      ? 'bg-app-gray-50/40 border-app-gray-100 opacity-40' 
                      : 'bg-white border-app-gray-150 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-app-mint text-white shadow-sm' : 'text-app-text-primary'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayApps.length > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-app-mint-100 text-app-mint rounded-full">
                        {dayApps.length}
                      </span>
                    )}
                  </div>

                  {/* List of appointments in this day cell */}
                  <div className="space-y-1 overflow-y-auto max-h-[75px] pr-0.5">
                    {dayApps.map(app => {
                      const isCompleted = app.status === 'completed';
                      const isCancelled = app.status === 'cancelled';

                      const styleClasses = isCompleted
                        ? 'bg-[#fce7f3] border-[#fbcfe8] text-[#db2777]'
                        : isCancelled
                        ? 'bg-[#fee2e2] border-[#fca5a5] text-[#dc2626] opacity-60'
                        : 'bg-app-gray-100 border-app-gray-200 text-app-text-secondary';

                      return (
                        <div
                          key={app.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(app);
                            setShowDetailModal(true);
                          }}
                          className={`p-1.5 rounded-xl border text-left text-[9px] font-bold truncate transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1 ${styleClasses}`}
                        >
                          {isCompleted && <CheckCircle className="w-3 h-3 text-[#db2777] shrink-0" />}
                          {isCancelled && <XCircle className="w-3 h-3 text-[#dc2626] shrink-0" />}
                          <span className="opacity-75">{format(new Date(app.startTime), 'HH:mm')}</span>
                          <span className={`truncate ${isCancelled ? 'line-through' : ''}`}>{app.service.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* DAY AND WEEK VIEWS (Vista Día / Semana) */
        <div className="bg-white border border-app-gray-200 rounded-[28px] shadow-sm overflow-x-auto">
          <div className="min-w-[900px] flex">
            {/* Hours Header column on the left */}
            <div className="flex flex-col border-r border-app-gray-200 bg-app-gray-50/30 w-[90px] flex-shrink-0">
              <div className="h-[53px] border-b border-app-gray-100 flex items-center justify-center text-[11px] font-bold text-app-gray-500">
                Horas
              </div>
              {hours.map(hour => (
                <div key={hour} className="h-[90px] border-b border-app-gray-100 flex items-center justify-center text-[10px] font-extrabold text-app-gray-500 bg-white">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] divide-x divide-app-gray-200">
              {displayedDays.map((day, dayIdx) => {
                const isSelectedDay = isSameDay(day, new Date());
                
                const dayApps = appointments.filter(app => {
                  const matchesDoctor = selectedColabFilter ? app.specialistId === selectedColabFilter : true;
                  return isSameDay(new Date(app.startTime), day) && matchesDoctor;
                });

                const layoutMap = getDayLayout(dayApps);

                return (
                  <div key={dayIdx} className="flex flex-col min-w-[130px]">
                    {/* Day Header */}
                    <div className={`h-[53px] text-center border-b border-app-gray-200 flex flex-col items-center justify-center bg-app-gray-50/50 ${
                      isSelectedDay ? 'bg-app-mint-50/40' : ''
                    }`}>
                      <span className="text-[9px] font-bold text-app-gray-500 uppercase">
                        {format(day, 'eee', { locale: es })}
                      </span>
                      <span className={`text-xs font-extrabold mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelectedDay ? 'bg-app-mint text-white shadow-sm' : 'text-app-text-primary'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Agenda Column Grid (Positioned relative for events to stretch across hours) */}
                    <div 
                      className="relative bg-white hover:bg-app-gray-50/10 cursor-pointer h-[1080px]"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const hourIndex = Math.floor(clickY / 90);
                        const clickedHour = hours[hourIndex] || 8;
                        openCreateModal(selectedColabFilter, `${clickedHour.toString().padStart(2, '0')}:00`, day);
                      }}
                    >
                      {/* Hour background lines */}
                      {hours.map((_, hIdx) => (
                        <div key={hIdx} className="absolute left-0 right-0 border-b border-app-gray-100" style={{ top: `${(hIdx + 1) * 90}px`, height: '0px' }} />
                      ))}

                      {/* Render appointments */}
                      {dayApps.map(app => {
                        const appStart = new Date(app.startTime);
                        const appEnd = new Date(app.endTime);
                        
                        const startHour = appStart.getHours();
                        const startMin = appStart.getMinutes();
                        // 8:00 is our start hour index
                        const hourOffset = startHour - 8;
                        const topPx = (hourOffset * 90) + (startMin / 60) * 90;

                        const durationMin = (appEnd.getTime() - appStart.getTime()) / 60000;
                        const heightPx = (durationMin / 60) * 90;

                        const isCompleted = app.status === 'completed';
                        const isCancelled = app.status === 'cancelled';

                        const styleClasses = isCompleted
                          ? 'bg-[#fce7f3] border-[#fbcfe8] text-[#db2777]'
                          : isCancelled
                          ? 'bg-[#fee2e2] border-[#fca5a5] text-[#dc2626] opacity-65'
                          : 'bg-app-gray-100 border-app-gray-200 text-app-text-secondary';

                        const layout = layoutMap.get(app.id) || { colIndex: 0, totalCols: 1 };
                        const widthPercent = 100 / layout.totalCols;
                        const leftPercent = layout.colIndex * widthPercent;

                        return (
                          <div
                            key={app.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(app);
                              setShowDetailModal(true);
                            }}
                            style={{
                              position: 'absolute',
                              top: `${topPx + 3}px`,
                              height: `${Math.max(heightPx - 6, 40)}px`,
                              left: `calc(${leftPercent}% + 2px)`,
                              width: `calc(${widthPercent}% - 4px)`,
                              zIndex: 10,
                            }}
                            className={`p-2 rounded-2xl border shadow-sm text-left transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden cursor-pointer ${styleClasses}`}
                          >
                            <div className="overflow-hidden">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-extrabold uppercase opacity-85 truncate">
                                  {app.notes?.match(/\[Sala:\s*([^\]]+)\]/)?.[1] || 'Cabina 1'}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isCompleted && <CheckCircle className="w-3 h-3 text-[#db2777]" />}
                                  {isCancelled && <XCircle className="w-3 h-3 text-[#dc2626]" />}
                                  <span className="text-[8px] font-bold opacity-75">
                                    {format(appStart, 'HH:mm')}
                                  </span>
                                </div>
                              </div>
                              <h6 className={`text-[10px] font-black truncate mt-1 leading-tight ${isCancelled ? 'line-through' : ''}`}>
                                {app.service.name}
                              </h6>
                              <p className="text-[9px] font-bold opacity-90 truncate mt-0.5">
                                {app.client.name}
                              </p>
                            </div>
                            <span className="text-[8px] font-semibold opacity-75 mt-1 block truncate">
                              {app.specialist.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE APPOINTMENT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agendar Nueva Cita"
        icon={<CalendarIcon />}
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          {/* CLIENTE FIELD WITH QUICK REGISTRATION */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-app-gray-500 uppercase">Cliente *</label>
              <button
                type="button"
                onClick={() => setIsAddingClient(!isAddingClient)}
                className="text-[10px] font-bold text-app-mint hover:underline flex items-center gap-1"
              >
                {isAddingClient ? 'Seleccionar existente' : '+ Registrar Nuevo Cliente'}
              </button>
            </div>

            {isAddingClient ? (
              <div className="p-3 bg-app-mint-50/50 border border-app-mint-250/40 rounded-2xl space-y-2 animate-fade-in">
                <span className="text-[10px] font-extrabold text-app-mint uppercase block">Registrar Cliente Rápido</span>
                <Input
                  placeholder="Nombre completo *"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Teléfono / WhatsApp"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Email (opcional)"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  fullWidth
                  loading={savingNewClient}
                  disabled={!newClientName.trim()}
                  onClick={handleCreateQuickClient}
                >
                  Guardar y Seleccionar Cliente
                </Button>
              </div>
            ) : (
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent outline-none focus:border-app-mint font-semibold text-app-text-primary"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ESPECIALISTA FIELD */}
          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Especialista *</label>
            <select
              value={formSpecialistId}
              onChange={(e) => setFormSpecialistId(e.target.value)}
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent outline-none focus:border-app-mint font-semibold text-app-text-primary"
            >
              {collaborators.map(cb => (
                <option key={cb.id} value={cb.id}>{cb.name}</option>
              ))}
            </select>
          </div>

          {/* TRATAMIENTO (SERVICIO) FIELD WITH SEARCH FILTER */}
          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Tratamiento (Servicio) *</label>
            <div className="space-y-1.5">
              <Input
                icon={<Search />}
                placeholder="Filtrar servicio por nombre..."
                value={serviceSearchQuery}
                onChange={(e) => handleServiceSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />

              <select
                value={formServiceId}
                onChange={(e) => {
                  setFormServiceId(e.target.value);
                  setServiceSearchQuery('');
                }}
                className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent outline-none focus:border-app-mint font-semibold text-app-text-primary"
              >
                {filteredFormServices.length === 0 ? (
                  <option value="">-- No se encontraron servicios --</option>
                ) : (
                  filteredFormServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - ({s.duration} min, {formatCOP(s.price)})</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* FECHA & HORA DE INICIO */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de la Cita *"
              type="date"
              required
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setSelectedDate(new Date(year, month - 1, day));
                }
              }}
            />
            <Input
              label="Hora de Inicio *"
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
            />
          </div>

          {/* CABINA / SALA (TEXTO CORTO) */}
          <Input
            label="Cabina / Sala *"
            placeholder="ej. Cabina 1"
            value={formRoom}
            onChange={(e) => setFormRoom(e.target.value)}
            required
          />

          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Notas (Opcional)</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Detalles especiales..."
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent outline-none focus:border-app-mint resize-none font-semibold text-app-text-primary"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              Agendar Cita
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW APPOINTMENT DETAIL MODAL */}
      <Modal
        isOpen={showDetailModal && !!selectedAppointment}
        onClose={() => setShowDetailModal(false)}
        title="Detalle de Cita"
        icon={<CalendarIcon />}
      >
        {selectedAppointment && (
          <>
            <Badge
              variant={
                selectedAppointment.status === 'completed' ? 'success' :
                selectedAppointment.status === 'cancelled' ? 'danger' :
                selectedAppointment.status === 'no_show' ? 'warning' : 'neutral'
              }
            >
              {selectedAppointment.status === 'completed' ? 'Completada' :
               selectedAppointment.status === 'cancelled' ? 'Cancelada' :
               selectedAppointment.status === 'no_show' ? 'No asistio' : 'Programada'}
            </Badge>

            <div className="space-y-3 bg-app-gray-50/50 p-4 rounded-2xl border border-app-gray-200 text-xs mt-4">
              <div className="flex items-center gap-2 text-app-text-primary">
                <User className="w-4 h-4 text-app-mint" />
                <span className="font-bold">Cliente:</span> {selectedAppointment.client?.name}
              </div>

              <div className="flex items-center gap-2 text-app-text-primary">
                <Sparkles className="w-4 h-4 text-app-mint" />
                <span className="font-bold">Servicio:</span> {selectedAppointment.service?.name}
              </div>

              <div className="flex items-center gap-2 text-app-text-primary">
                <UserCheck className="w-4 h-4 text-app-mint" />
                <span className="font-bold">Especialista:</span> {selectedAppointment.specialist?.name}
              </div>

              <div className="flex items-center gap-2 text-app-text-primary">
                <Clock className="w-4 h-4 text-app-mint" />
                <span className="font-bold">Horario:</span> {format(new Date(selectedAppointment.startTime), 'HH:mm')} - {format(new Date(selectedAppointment.endTime), 'HH:mm')}
              </div>

              <div className="pt-2 border-t border-app-gray-200">
                <span className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Notas:</span>
                <p className="text-app-text-secondary italic">{selectedAppointment.notes || 'Sin notas.'}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              {selectedAppointment.status === 'completed' && (
                <Button
                  icon={<Receipt />}
                  fullWidth
                  onClick={() => {
                    setShowDetailModal(false);
                    setAppointmentTxFilter(selectedAppointment.id);
                    setCurrentTab('history');
                  }}
                >
                  Ver Factura / Ticket
                </Button>
              )}

              <Button
                icon={<ShoppingBag />}
                fullWidth
                className={
                  selectedAppointment.status === 'completed'
                    ? 'bg-[#e8f4fd] hover:bg-[#d0eafb] text-[#1a6b8a] border-transparent'
                    : 'bg-[#fce7f3] hover:bg-[#f9d6e8] text-[#db2777] border-transparent'
                }
                onClick={() => {
                  setShowDetailModal(false);
                  setPendingPOSItem(
                    selectedAppointment.status === 'completed'
                      ? { clientId: selectedAppointment.clientId }
                      : {
                          clientId: selectedAppointment.clientId,
                          serviceId: selectedAppointment.serviceId,
                          collaboratorId: selectedAppointment.specialistId,
                          appointmentId: selectedAppointment.id
                        }
                  );
                  setCurrentTab('pos');
                }}
              >
                {selectedAppointment.status === 'completed' ? 'Ir a POS / Nueva Venta' : 'Completar Cita'}
              </Button>

              {selectedAppointment.status !== 'completed' &&
               selectedAppointment.status !== 'cancelled' &&
               selectedAppointment.status !== 'no_show' && (
                <Button
                  variant="warning"
                  icon={<UserX />}
                  fullWidth
                  onClick={() => handleUpdateStatus('no_show')}
                >
                  No asistio
                </Button>
              )}

              {selectedAppointment.status !== 'completed' &&
               selectedAppointment.status !== 'cancelled' && (
                <Button
                  variant="danger"
                  icon={<XCircle />}
                  fullWidth
                  onClick={() => handleUpdateStatus('cancelled')}
                >
                  Cancelar Cita
                </Button>
              )}

              {selectedAppointment.status !== 'completed' && (
                <Button
                  variant="danger"
                  icon={<Trash2 />}
                  fullWidth
                  onClick={handleDeleteAppointment}
                >
                  Eliminar Registro
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
