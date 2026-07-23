import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  UserCheck,
  Trash2,
  UserPlus,
  ArrowLeft,
  Eye,
  Users,
  Award,
  CalendarDays,
  Pencil,
  Camera,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Badge, PageHeader, StatCard, Modal, Input, Select } from '../components/ui';

export const CollaboratorsPage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh } = useAppStore();

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View state: 'list' or 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Modals / Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');

  // Edit collaborator modal
  const [showEditColabModal, setShowEditColabModal] = useState(false);
  const [editColabName, setEditColabName] = useState('');
  const [editColabPhone, setEditColabPhone] = useState('');
  const [editColabEmail, setEditColabEmail] = useState('');
  const [editColabDocType, setEditColabDocType] = useState('');
  const [editColabDocNumber, setEditColabDocNumber] = useState('');
  const [editColabBio, setEditColabBio] = useState('');
  const [editColabExperience, setEditColabExperience] = useState('');
  const [editColabAvatarUrl, setEditColabAvatarUrl] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, colabId: string) => {
    const file = e.target.files?.[0];
    if (file && currentTenant) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch(`/api/collaborators?id=${colabId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': currentTenant.id,
            },
            body: JSON.stringify({
              avatarUrl: base64,
            }),
          });
          if (res.ok) {
            const updated = await res.json();
            setSelectedColab((prev: any) => ({ ...prev, avatarUrl: base64 }));
            setCollaborators((prev: any[]) =>
              prev.map((c: any) => (c.id === colabId ? { ...c, avatarUrl: base64 } : c))
            );
            triggerRefresh();
          } else {
            alert('Error al actualizar la foto de perfil.');
          }
        } catch (err) {
          console.error(err);
          alert('Error de conexión al actualizar la foto.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    const fetchColabData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const headers = { 'x-tenant-id': currentTenant.id };
        const [colabRes, transRes, schedRes, appRes] = await Promise.all([
          fetch('/api/collaborators', { headers }),
          fetch('/api/transactions', { headers }),
          fetch('/api/schedules', { headers }),
          fetch('/api/appointments', { headers })
        ]);

        if (colabRes.ok) {
          const list = await colabRes.json();
          setCollaborators(list);
        }
        if (transRes.ok) setTransactions(await transRes.json());
        if (schedRes.ok) setSchedules(await schedRes.json());
        if (appRes.ok) setAppointments(await appRes.json());
      } catch (err) {
        console.error('Error al cargar colaboradores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchColabData();
  }, [currentTenant, refreshTrigger]);

  const handleCreateColab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      alert('Campos incompletos');
      return;
    }

    const specialtiesArr = formSpecialties
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id
        },
        body: JSON.stringify({
          name: formName,
          email: formEmail || null,
          phone: formPhone,
          specialties: specialtiesArr
        })
      });

      if (response.ok) {
        const newColab = await response.json();
        
        // Default Mon-Sat 9 AM - 6 PM weekly schedule
        const defaultSchedules = Array.from({ length: 6 }, (_, idx) => ({
          collaboratorId: newColab.id,
          dayOfWeek: idx + 1,
          startTime: '09:00',
          endTime: '18:00',
          isActive: true
        }));

        await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': currentTenant!.id
          },
          body: JSON.stringify({ schedules: defaultSchedules })
        });

        setShowCreateModal(false);
        setSelectedColab(newColab);
        setViewMode('detail');
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormSpecialties('');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteColab = async (id: string) => {
    if (!confirm('¿Desea dar de baja a este colaborador?')) return;
    try {
      const response = await fetch(`/api/collaborators?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id }
      });
      if (response.ok) {
        setSelectedColab(null);
        setViewMode('list');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const colabCommissions = selectedColab
    ? transactions
        .filter(t => t.type === 'sale' && t.items)
        .flatMap(t => t.items)
        .filter(item => item && item.collaboratorId === selectedColab.id)
        .reduce((sum, item) => sum + parseFloat(item.commissionPaid || '0.00'), 0)
    : 0;

  const colabSchedules = selectedColab
    ? schedules.filter(s => s.collaboratorId === selectedColab.id)
    : [];

  const colabAppointments = selectedColab
    ? appointments.filter(a => a.specialistId === selectedColab.id)
    : [];

  if (loading && collaborators.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  // --- RENDERING DETAIL VIEW (INSPIRADO EN DETALLE_COLABORADORES.PNG) ---
  if (viewMode === 'detail' && selectedColab) {
    return (
      <div className="space-y-4">
        {/* Top Header Back Navigation */}
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft />}
            onClick={() => setViewMode('list')}
          >
            Volver a la Lista de Colaboradores
          </Button>
          <h3 className="text-lg font-black text-app-text-primary mt-1 font-sans">
            Ficha del Especialista / Detalles
          </h3>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* COLUMN 1: DOCTOR PROFILE CARD (25% / 1 col) */}
          <div className="lg:col-span-1 bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm space-y-5 relative">
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil />}
              className="absolute right-4 top-4"
              onClick={() => {
                setEditColabName(selectedColab.name || '');
                setEditColabPhone(selectedColab.phone || '');
                setEditColabEmail(selectedColab.email || '');
                setEditColabDocType(selectedColab.docType || 'Cédula');
                setEditColabDocNumber(selectedColab.docNumber || '');
                setEditColabBio(selectedColab.bio || '');
                setEditColabExperience(selectedColab.experience || '');
                setEditColabAvatarUrl(selectedColab.avatarUrl || '');
                setShowEditColabModal(true);
              }}
            >
              Editar
            </Button>

            {/* Square Avatar with Rounded Corners & Name */}
            <div className="flex flex-col items-center text-center pt-4">
              <div className="relative group cursor-pointer">
                <img
                  src={selectedColab.avatarUrl}
                  alt={selectedColab.name}
                  className="w-24 h-24 rounded-3xl border border-app-mint-250/20 shadow-md bg-app-mint-50 object-cover"
                />
                <label
                  htmlFor="colab-avatar-file-input"
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-3xl cursor-pointer transition-opacity duration-200 text-white text-[10px] font-bold gap-1"
                  title="Cambiar foto de perfil del colaborador"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <span>Cambiar</span>
                  <input
                    type="file"
                    id="colab-avatar-file-input"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e, selectedColab.id)}
                    className="hidden"
                  />
                </label>
              </div>
              <h4 className="text-sm font-black text-app-text-primary mt-3 font-sans leading-tight">
                {selectedColab.name}
              </h4>
              <p className="text-[9px] text-app-gray-500 font-bold uppercase mt-1.5 font-mono">
                DB-{selectedColab.id.slice(0, 4).toUpperCase()} — {selectedColab.specialties?.[0] || 'General'}
              </p>
              <p className="text-[9px] text-app-gray-500 font-bold uppercase mt-0.5">
                {selectedColab.docType || 'Cédula'}: {selectedColab.docNumber || 'Sin especificar'}
              </p>
            </div>

            {/* About bio paragraph */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-app-text-primary uppercase tracking-wider">Sobre el Colaborador</h5>
              <p className="text-xs text-app-text-secondary leading-relaxed italic bg-app-gray-50 p-3 rounded-2xl border border-app-gray-150">
                {selectedColab.bio || 'Sin descripción'}
              </p>
            </div>

            <div className="h-px bg-app-gray-100" />

            {/* Contact Info */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-app-text-primary uppercase tracking-wider">Información de Contacto</h5>
              <div className="space-y-2 text-xs text-app-text-secondary leading-tight font-semibold">
                <div>
                  <span className="text-[9px] text-app-gray-500 block mb-0.5">Teléfono Celular</span>
                  <span className="text-app-text-primary font-bold">{selectedColab.phone}</span>
                </div>
                <div>
                  <span className="text-[9px] text-app-gray-500 block mb-0.5">Correo Electrónico</span>
                  <span className="text-app-text-primary font-bold truncate block">{selectedColab.email || 'no-registra@salon.com'}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-app-gray-100" />

            {/* Experience list */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-app-text-primary uppercase tracking-wider">Experiencia Profesional</h5>
              <div className="space-y-2">
                {(selectedColab.experience || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-app-mint-100 text-app-mint flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <div className="leading-tight text-[11px]">
                      <p className="font-bold text-app-text-primary">{line}</p>
                    </div>
                  </div>
                ))}
                {!selectedColab.experience && (
                  <p className="text-xs text-app-gray-500 italic">Sin experiencia registrada</p>
                )}
              </div>
            </div>

            <Button
              variant="danger"
              fullWidth
              icon={<Trash2 />}
              onClick={() => handleDeleteColab(selectedColab.id)}
            >
              Dar de baja del equipo
            </Button>
          </div>

          {/* COLUMN 2: RIGHT CONTENT AREA (75% / 3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Mini Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard
                tone="mint"
                icon={<Users />}
                label="Clientes Atendidos"
                value={String(colabAppointments.length || 120)}
              />
              <StatCard
                tone="lavender"
                icon={<Percent />}
                label="Comisiones Ganadas"
                value={formatCOP(colabCommissions)}
              />
            </div>

            {/* Split layout: Center Table and Right Schedule Widget */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              
              {/* Left Column: All Patients Table (60%) */}
              <div className="xl:col-span-3 bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-app-gray-100 pb-2">
                  <h5 className="text-xs font-black text-app-text-primary uppercase tracking-wider">Historial de Clientes Atendidos</h5>
                  <button className="text-[10px] text-app-mint font-bold px-2 py-0.5 bg-app-mint-100 rounded-full hover:underline">
                    Ver Todo
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                        <th className="p-3">Cliente ID</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Fecha y Hora</th>
                        <th className="p-3">Servicio</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colabAppointments.slice(0, 5).map((app) => (
                        <tr key={app.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                          <td className="p-3 text-app-gray-550 font-mono text-[10px]">
                            #{app.id.slice(0, 6).toUpperCase()}
                          </td>
                          <td className="p-3 font-bold text-app-text-primary">
                            {app.client?.name || 'Cliente Casual'}
                          </td>
                          <td className="p-3 text-app-text-secondary">
                            {format(new Date(app.startTime), "d LLL, yyyy - HH:mm", { locale: es })}
                          </td>
                          <td className="p-3 text-app-text-secondary">
                            {app.service?.name}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={app.status === 'completed' ? 'success' : app.status === 'cancelled' ? 'danger' : 'warning'}
                            >
                              {app.status === 'completed' ? 'Completado' : app.status === 'cancelled' ? 'Cancelado' : 'Programado'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {colabAppointments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-app-gray-500 italic">
                            No registra historial de citas con este especialista.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Schedule availability shifts (40%) */}
              <div className="xl:col-span-2 bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-app-gray-100 pb-2">
                  <h5 className="text-xs font-black text-app-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-app-mint" />
                    Horario de Disponibilidad
                  </h5>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {daysOfWeek.map((dayName, idx) => {
                    const daySched = colabSchedules.find(s => s.dayOfWeek === idx);
                    const isActive = daySched ? daySched.isActive : false;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex justify-between items-center text-[11px] font-bold ${
                          isActive
                            ? 'bg-[#fdf2f8] border-app-mint-250/20 text-app-mint shadow-sm'
                            : 'bg-app-gray-100 border-app-gray-200 text-app-gray-500'
                        }`}
                      >
                        <span>{dayName}</span>
                        {isActive ? (
                          <span>{daySched.startTime} - {daySched.endTime}</span>
                        ) : (
                          <span className="italic uppercase text-[9px]">No Disponible</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Edit Collaborator Modal */}
        {showEditColabModal && (
          <Modal
            isOpen={showEditColabModal}
            onClose={() => setShowEditColabModal(false)}
            title="Editar Colaborador"
            icon={<Pencil />}
          >
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedColab || !currentTenant) return;
              try {
                const response = await fetch(`/api/collaborators?id=${selectedColab.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': currentTenant.id
                  },
                  body: JSON.stringify({
                    name: editColabName,
                    phone: editColabPhone,
                    email: editColabEmail,
                    docType: editColabDocType,
                    docNumber: editColabDocNumber,
                    bio: editColabBio,
                    experience: editColabExperience,
                    avatarUrl: editColabAvatarUrl || selectedColab.avatarUrl
                  })
                });
                if (response.ok) {
                  const updated = await response.json();
                  setSelectedColab(updated);
                  setCollaborators(prev => prev.map(c => c.id === updated.id ? updated : c));
                  setShowEditColabModal(false);
                }
              } catch (err) {
                console.error('Error updating collaborator:', err);
              }
            }} className="space-y-4">
              {/* Photo uploader inside modal */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-app-mint uppercase block">Foto de Perfil</span>
                <div className="flex items-center gap-3 bg-app-gray-50 p-3 rounded-2xl border border-app-gray-150">
                  <img
                    src={editColabAvatarUrl || selectedColab?.avatarUrl}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border border-app-mint"
                  />
                  <div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-app-mint text-white text-[11px] font-bold rounded-xl cursor-pointer hover:bg-app-mint-600 transition-all shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      Cambiar Foto de Perfil
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditColabAvatarUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-app-gray-500 mt-1">Formatos recomendados: PNG, JPG, WebP</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-app-mint uppercase block">Información de Contacto</span>
                <Input label="Nombre Completo" required value={editColabName}
                  onChange={(e) => setEditColabName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Teléfono Celular" required value={editColabPhone}
                    onChange={(e) => setEditColabPhone(e.target.value)} />
                  <Input label="Correo Electrónico" type="email" value={editColabEmail}
                    onChange={(e) => setEditColabEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-[10px] font-extrabold text-app-mint uppercase block">Documento de Identidad</span>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Tipo de Documento"
                    value={editColabDocType}
                    onChange={(e) => setEditColabDocType(e.target.value)}
                    options={[
                      { value: 'Cédula', label: 'Cédula' },
                      { value: 'Pasaporte', label: 'Pasaporte' },
                      { value: 'Tarjeta de Identidad', label: 'Tarjeta de Identidad' },
                      { value: 'Otro', label: 'Otro' },
                    ]}
                  />
                  <Input label="Número de Documento" placeholder="ej. 1023456789" value={editColabDocNumber}
                    onChange={(e) => setEditColabDocNumber(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-app-gray-100">
                <span className="text-[10px] font-extrabold text-app-mint uppercase block">Perfil Profesional</span>
                <div>
                  <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Sobre el Colaborador</label>
                  <textarea rows={2} placeholder="Breve descripción del colaborador..." value={editColabBio}
                    onChange={(e) => setEditColabBio(e.target.value)}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Experiencia Profesional</label>
                  <textarea rows={2} placeholder={"Especialista Principal\nAura Beauty Clinic — 2018 - Presente"} value={editColabExperience}
                    onChange={(e) => setEditColabExperience(e.target.value)}
                    className="w-full px-3 py-1.5 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold text-app-text-primary resize-none" />
                  <p className="text-[9px] text-app-gray-500 mt-1">Una línea por entrada. Ej: Cargo — Empresa</p>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowEditColabModal(false)} fullWidth>Cancelar</Button>
                <Button type="submit" fullWidth>Guardar</Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // --- RENDERING LIST VIEW (FULL-WIDTH SPECIALISTS DIRECTORY) ---
  return (
    <div className="bg-white border border-app-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <PageHeader
          icon={<UserCheck />}
          title="Especialistas (Colaboradores)"
          actions={
            <Button icon={<UserPlus />} onClick={() => setShowCreateModal(true)}>
              Agregar Especialista
            </Button>
          }
        />
      </div>

      {/* Directory Table */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
              <th className="p-3.5 w-8 rounded-l-xl">
                <input type="checkbox" className="rounded border-app-gray-300" />
              </th>
              <th className="p-3.5">ID Colaborador</th>
              <th className="p-3.5">Nombre</th>
              <th className="p-3.5">Teléfono</th>
              <th className="p-3.5">Especialidades</th>
              <th className="p-3.5">Estado</th>
              <th className="p-3.5 text-center rounded-r-xl w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map((colab) => {
              return (
                <tr
                  key={colab.id}
                  className="border-b border-app-gray-50 hover:bg-app-gray-50/50 transition-colors"
                >
                  <td className="p-3">
                    <input type="checkbox" className="rounded border-app-gray-300" />
                  </td>
                  <td className="p-3.5 text-app-gray-500 font-mono text-[10px]">
                    #{colab.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="p-3.5 font-bold text-app-text-primary flex items-center gap-2.5">
                    <img
                      src={colab.avatarUrl}
                      alt={colab.name}
                      className="w-7 h-7 rounded-full border border-app-mint-100 shadow-sm"
                    />
                    <span>{colab.name}</span>
                  </td>
                  <td className="p-3.5 text-app-text-secondary">{colab.phone}</td>
                  <td className="p-3.5 text-app-text-secondary max-w-[150px] truncate" title={colab.specialties?.join(', ')}>
                    {colab.specialties?.join(', ') || 'General'}
                  </td>
                  <td className="p-3.5">
                    <Badge variant="success">Activo</Badge>
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye />}
                      onClick={() => {
                        setSelectedColab(colab);
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

      {/* CREATE COLLABORATOR MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agregar Colaborador Especialista"
        icon={<UserPlus />}
      >
        <form onSubmit={handleCreateColab} className="space-y-4">
          <Input
            label="Nombre Completo *"
            placeholder="ej. Elena Rossi"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          <Input
            label="Teléfono de Contacto *"
            type="tel"
            placeholder="ej. +573151234567"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            required
          />
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="ej. elena@salon.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <Input
            label="Especialidades (separadas por comas)"
            placeholder="ej. Balayage, Cortes, Peinados"
            value={formSpecialties}
            onChange={(e) => setFormSpecialties(e.target.value)}
          />
          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              Agregar Especialista
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
