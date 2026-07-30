import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  Sparkles,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  FileText,
  Pencil,
} from 'lucide-react';
import { Button, IconButton, Badge, Card, CardHeader, Modal, Input, EmptyState, labelBaseClass, inputBaseClass } from '../components/ui';

export const TreatmentsPage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh } = useAppStore();

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modals / Form State
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState('60');
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const response = await fetch('/api/services', {
          headers: { 'x-tenant-id': currentTenant.id }
        });
        if (response.ok) {
          const list = await response.json();
          setServices(list);
          if (list.length > 0 && !selectedService) {
            setSelectedService(list[0]);
          }
        }
      } catch (err) {
        console.error('Error al cargar tratamientos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [currentTenant, refreshTrigger]);

  const openCreateModal = () => {
    setEditingService(null);
    setFormName('');
    setFormDesc('');
    setFormDuration('60');
    setFormPrice('');
    setShowModal(true);
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDesc(service.description || '');
    setFormDuration(service.duration.toString());
    setFormPrice(parseFloat(service.price).toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDuration || !formPrice) {
      alert('Nombre, duración y precio son obligatorios.');
      return;
    }

    const payload = {
      name: formName,
      description: formDesc || null,
      duration: parseInt(formDuration),
      price: parseFloat(formPrice).toFixed(2),
    };

    setSaving(true);
    try {
      let response;
      if (editingService) {
        response = await fetch(`/api/services?id=${editingService.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': currentTenant!.id
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': currentTenant!.id
          },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setShowModal(false);
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este servicio del catálogo?')) return;
    try {
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id }
      });
      if (response.ok) {
        setSelectedService(null);
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:h-[calc(100vh-110px)] xl:overflow-hidden">
      {/* 1. LEFT PANEL: CATALOG TABLE */}
      <Card padding={false} className="xl:col-span-2 flex flex-col xl:h-full h-[calc(100vh-180px)] xl:h-auto overflow-hidden">
        <CardHeader
          icon={<Sparkles />}
          title="Menú de Tratamientos"
          subtitle="Catálogo de servicios y procedimientos del centro."
          actions={
            <Button size="sm" icon={<Plus />} onClick={openCreateModal}>
              Agregar Tratamiento
            </Button>
          }
        />

        {/* Directory Table */}
        <div className="flex-1 overflow-auto -mx-5 px-5">
          {services.length === 0 ? (
            <EmptyState
              icon={<Sparkles />}
              title="Sin tratamientos"
              message="Aún no has registrado tratamientos en el catálogo."
              action={
                <Button size="sm" icon={<Plus />} onClick={openCreateModal}>
                  Agregar Tratamiento
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-text-secondary bg-app-gray-50/50 text-2xs font-extrabold uppercase tracking-wider">
                  <th className="p-3.5">Nombre del Tratamiento</th>
                  <th className="p-3.5">Duración</th>
                  <th className="p-3.5 text-right">Precio Base</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <tr
                      key={service.id}
                      onClick={() => { setSelectedService(service); setShowDetailModal(true); }}
                      className={`border-b border-app-gray-100 hover:bg-app-gray-50/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-app-mint-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-app-text-primary">
                        <span className="block">{service.name}</span>
                        <span className="text-xs text-app-text-secondary font-medium truncate max-w-[240px] block">
                          {service.description || 'Sin descripción.'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="neutral">{service.duration} min</Badge>
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-app-text-primary">
                        {formatCOP(service.price)}
                      </td>
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1.5">
                          <IconButton variant="edit" label="Editar tratamiento" onClick={() => openEditModal(service)} />
                          <IconButton variant="delete" label="Eliminar tratamiento" onClick={() => handleDelete(service.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* 2. RIGHT PANEL: TREATMENT DETAILS CARD */}
      <Card padding={false} className="hidden xl:flex xl:col-span-1 flex-col h-full overflow-y-auto">
        {selectedService ? (
          <div className="p-5 flex flex-col h-full space-y-4">
            <div className="pb-4 border-b border-app-gray-100">
              <h4 className="text-base font-extrabold text-app-text-primary tracking-tight">{selectedService.name}</h4>
              <span className="text-2xs text-app-mint font-extrabold uppercase tracking-wider mt-1 block">Procedimiento Catálogo</span>
            </div>

            <div className="space-y-3.5 flex-1">
              <div>
                <h5 className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Descripción del Tratamiento
                </h5>
                <p className="text-sm text-app-text-secondary bg-app-gray-50 border border-app-gray-100 p-3.5 rounded-2xl leading-relaxed italic">
                  {selectedService.description ? `"${selectedService.description}"` : 'No registra descripción técnica.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-app-gray-50 rounded-2xl border border-app-gray-100">
                  <span className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1">Duración</span>
                  <span className="text-sm font-extrabold text-app-text-primary flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-app-mint" />
                    {selectedService.duration} min
                  </span>
                </div>

                <div className="p-3.5 bg-app-gray-50 rounded-2xl border border-app-gray-100">
                  <span className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1">Precio Fijo</span>
                  <span className="text-sm font-extrabold text-app-text-primary flex items-center gap-1 font-sans">
                    <DollarSign className="w-4 h-4 text-app-pink" />
                    {formatCOP(selectedService.price)}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-2 border-t border-app-gray-100">
              <Button
                variant="secondary"
                size="sm"
                icon={<Pencil />}
                fullWidth
                onClick={() => openEditModal(selectedService)}
              >
                Editar Parámetros
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                onClick={() => handleDelete(selectedService.id)}
              >
                Eliminar
              </Button>
            </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles />}
            title="Ningún tratamiento seleccionado"
            message="Selecciona un tratamiento del catálogo para ver su detalle."
          />
        )}
      </Card>

      {/* Mobile: Detalle del tratamiento como modal fullscreen */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedService?.name || 'Detalle del Tratamiento'}
        icon={<Sparkles />}
        fullscreen
      >
        {selectedService && (
          <div className="space-y-4">
            <span className="text-2xs text-app-mint font-extrabold uppercase tracking-wider block">Procedimiento Catálogo</span>

            <div>
              <h5 className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Descripción del Tratamiento
              </h5>
              <p className="text-sm text-app-text-secondary bg-app-gray-50 border border-app-gray-100 p-3.5 rounded-2xl leading-relaxed italic">
                {selectedService.description ? `"${selectedService.description}"` : 'No registra descripción técnica.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-app-gray-50 rounded-2xl border border-app-gray-100">
                <span className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1">Duración</span>
                <span className="text-sm font-extrabold text-app-text-primary flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-app-mint" />
                  {selectedService.duration} min
                </span>
              </div>
              <div className="p-3.5 bg-app-gray-50 rounded-2xl border border-app-gray-100">
                <span className="text-2xs font-extrabold text-app-text-secondary uppercase tracking-wider block mb-1">Precio Fijo</span>
                <span className="text-sm font-extrabold text-app-text-primary flex items-center gap-1 font-sans">
                  <DollarSign className="w-4 h-4 text-app-pink" />
                  {formatCOP(selectedService.price)}
                </span>
              </div>
            </div>

            <div className="pt-4 flex gap-2 border-t border-app-gray-100">
              <Button
                variant="secondary"
                size="sm"
                icon={<Pencil />}
                fullWidth
                onClick={() => openEditModal(selectedService)}
              >
                Editar Parámetros
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                onClick={() => handleDelete(selectedService.id)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingService ? 'Modificar Tratamiento' : 'Agregar Tratamiento'}
        subtitle="Define el nombre, duración y precio del servicio."
        icon={<Sparkles />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="treatment-form" loading={saving}>
              {editingService ? 'Actualizar' : 'Agregar Tratamiento'}
            </Button>
          </>
        }
      >
        <form id="treatment-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Tratamiento *"
            type="text"
            required
            placeholder="ej. Facial Hialurónico"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <div>
            <label className={labelBaseClass}>Descripción</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el procedimiento..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className={`${inputBaseClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración (min) *"
              type="number"
              min="1"
              required
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
            />
            <Input
              label="Precio Base ($) *"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
            />
          </div>

        </form>
      </Modal>
    </div>
  );
};
