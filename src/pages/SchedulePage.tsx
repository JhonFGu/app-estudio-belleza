import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Button, PageHeader, Input } from '../components/ui';

const getCurrentWeekString = (date = new Date()) => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  const weekStr = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`;
  return `${year}-W${weekStr}`;
};

export const SchedulePage: React.FC = () => {
  const { currentTenant, refreshTrigger } = useAppStore();

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Expansion state
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedColabs, setExpandedColabs] = useState<Record<string, boolean>>({});
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekString());

  const daysOfWeek = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        const [colabRes, schedRes] = await Promise.all([
          fetch('/api/collaborators', { headers }),
          fetch('/api/schedules', { headers })
        ]);

        if (colabRes.ok) setCollaborators(await colabRes.json());
        if (schedRes.ok) setSchedules(await schedRes.json());
      } catch (err) {
        console.error('Error al cargar datos del equipo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenant, refreshTrigger]);

  const toggleExpand = (colabId: string) => {
    setExpandedColabs(prev => ({ ...prev, [colabId]: !prev[colabId] }));
  };

  const handleNavigateWeek = (offsetWeeks: number) => {
    if (!selectedWeek) return;
    const [yearStr, weekStr] = selectedWeek.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
    simpleDate.setDate(simpleDate.getDate() + offsetWeeks * 7);
    setSelectedWeek(getCurrentWeekString(simpleDate));
  };

  const getColabDaySchedule = (colabId: string, dayId: number) => {
    const weekSched = schedules.find(s => s.collaboratorId === colabId && s.dayOfWeek === dayId && s.week === selectedWeek);
    if (weekSched) return weekSched;

    const baseSched = schedules.find(s => s.collaboratorId === colabId && s.dayOfWeek === dayId && (!s.week || s.week === 'default'));
    if (baseSched) {
      return { ...baseSched, week: selectedWeek };
    }

    return {
      collaboratorId: colabId,
      dayOfWeek: dayId,
      week: selectedWeek,
      startTime: '09:00',
      endTime: '18:00',
      isActive: true
    };
  };

  const handleTimeChange = (colabId: string, dayId: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => {
      const currentSched = getColabDaySchedule(colabId, dayId);
      const updatedItem = { ...currentSched, week: selectedWeek, [field]: value };
      const filtered = prev.filter(s => !(s.collaboratorId === colabId && s.dayOfWeek === dayId && s.week === selectedWeek));
      return [...filtered, updatedItem];
    });
  };

  const handleToggleDay = (colabId: string, dayId: number) => {
    setSchedules(prev => {
      const currentSched = getColabDaySchedule(colabId, dayId);
      const updatedItem = { ...currentSched, week: selectedWeek, isActive: !currentSched.isActive };
      const filtered = prev.filter(s => !(s.collaboratorId === colabId && s.dayOfWeek === dayId && s.week === selectedWeek));
      return [...filtered, updatedItem];
    });
  };

  const handleSaveSchedules = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({ schedules })
      });

      if (response.ok) {
        setMessage({ text: `Horarios de la semana (${selectedWeek}) guardados exitosamente.`, type: 'success' });
      } else {
        setMessage({ text: 'Error al actualizar horarios.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error de conexión con el servidor.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredCollaborators = collaborators.filter(colab =>
    colab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (colab.specialties && colab.specialties.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getScheduleSummary = (colabId: string) => {
    const activeDays = daysOfWeek.filter(day => {
      const s = getColabDaySchedule(colabId, day.id);
      return s.isActive;
    });

    if (activeDays.length === 0) return 'Sin horario activo esta semana';
    const names = activeDays.map(d => d.name.slice(0, 3)).join(', ');
    return `${activeDays.length} días activos (${names})`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-5">
      
      {/* Top Action Bar */}
      <div className="pb-2 border-b border-app-gray-100">
        <PageHeader
          icon={<Clock />}
          title="Disponibilidad de Horarios del Equipo"
          subtitle="Configure las horas de reserva y atención del staff médico-estético."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-app-gray-50 px-2.5 py-1.5 rounded-xl border border-app-gray-200 text-xs font-bold text-app-text-primary">
                <button
                  onClick={() => handleNavigateWeek(-1)}
                  className="p-1 hover:bg-app-gray-150 rounded-lg text-app-gray-550 transition-colors"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 px-1 font-sans">
                  <Calendar className="w-3.5 h-3.5 text-app-mint" />
                  <input
                    type="week"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="bg-transparent text-xs font-bold text-app-text-primary outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => handleNavigateWeek(1)}
                  className="p-1 hover:bg-app-gray-150 rounded-lg text-app-gray-550 transition-colors"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                icon={<Save />}
                loading={saving}
                onClick={handleSaveSchedules}
              >
                Guardar Horarios
              </Button>
            </div>
          }
        />
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-app-gray-50/70 p-2 rounded-2xl border border-app-gray-150">
        <div className="flex-1">
          <Input
            icon={<Search />}
            placeholder="Buscar colaborador por nombre o especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs font-bold text-app-mint hover:underline px-2"
          >
            Limpiar
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-app-mint-100 border-app-mint-250 text-app-mint'
            : 'bg-app-pink-100 border-app-pink-250 text-app-pink'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Grid of collaborators with accordion expandable shifts */}
      <div className="space-y-3">
        {filteredCollaborators.length === 0 ? (
          <p className="text-xs text-app-gray-500 italic text-center py-8">
            No se encontraron colaboradores que coincidan con la búsqueda.
          </p>
        ) : (
          filteredCollaborators.map((colab) => {
            const isExpanded = !!expandedColabs[colab.id];
            const summary = getScheduleSummary(colab.id);

            return (
              <div key={colab.id} className="bg-app-gray-50/50 border border-app-gray-200 rounded-[22px] overflow-hidden transition-all shadow-2xs">
                {/* Accordion Header (Click to expand/collapse) */}
                <div
                  onClick={() => toggleExpand(colab.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-app-gray-100/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-3.5">
                    {colab.avatarUrl ? (
                      <img
                        src={colab.avatarUrl}
                        alt={colab.name}
                        className="w-9 h-9 rounded-full border border-app-mint-100 shadow-xs object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-app-mint-100 text-app-mint flex items-center justify-center font-bold text-xs">
                        <UserCheck className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold text-app-text-primary">{colab.name}</h4>
                      <p className="text-[9px] text-app-gray-500 font-bold uppercase mt-0.5">
                        {colab.specialties?.join(', ') || 'Especialista General'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white border border-app-gray-200 text-app-text-secondary">
                      {summary}
                    </span>
                    <button className="p-1 rounded-lg text-app-gray-500 hover:bg-white transition-all">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Days list row layout (Expanded content) */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-app-gray-150/60 mt-1 animate-fade-in">
                    <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {daysOfWeek.map((day) => {
                        const daySched = getColabDaySchedule(colab.id, day.id);
                        const isActive = daySched.isActive;
                        const start = daySched.startTime;
                        const end = daySched.endTime;

                        return (
                          <div
                            key={day.id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between items-center ${
                              isActive
                                ? 'bg-white border-app-mint-250 text-app-mint shadow-xs'
                                : 'bg-app-gray-100 border-app-gray-200 text-app-gray-500'
                            }`}
                          >
                            <span className="text-[10px] font-bold block mb-2">{day.name}</span>
                            
                            <button
                              onClick={() => handleToggleDay(colab.id, day.id)}
                              className="mb-3 hover:scale-105 transition-transform"
                            >
                              {isActive ? (
                                <ToggleRight className="w-8 h-8 text-app-mint" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-app-gray-350" />
                              )}
                            </button>

                            {isActive ? (
                              <div className="space-y-1 w-full text-center">
                                <input
                                  type="time"
                                  value={start}
                                  onChange={(e) => handleTimeChange(colab.id, day.id, 'startTime', e.target.value)}
                                  className="w-full text-center border-none bg-transparent text-[10px] font-bold text-app-text-primary outline-none"
                                />
                                <div className="h-px bg-app-gray-100 w-full" />
                                <input
                                  type="time"
                                  value={end}
                                  onChange={(e) => handleTimeChange(colab.id, day.id, 'endTime', e.target.value)}
                                  className="w-full text-center border-none bg-transparent text-[10px] font-bold text-app-text-primary outline-none"
                                />
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold uppercase italic py-2">Cerrado</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
