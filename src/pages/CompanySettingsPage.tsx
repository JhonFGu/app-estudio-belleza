import React, { useState, useEffect } from 'react';
import { useAppStore, type Tenant } from '../store/useAppStore';
import {
  Building2,
  Save,
  Store,
  Mail,
  Phone,
  MapPin,
  Globe,
  Hash,
  Star,
  Gift,
  Percent,
  DollarSign,
  Sparkles,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button, Card, Input, Select, Badge, PageHeader, Modal, Tabs } from '../components/ui';
import { formatCOP } from '../utils/format';

const MONEDAS = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN'];

const CATEGORIAS = [
  'Salón de belleza',
  'Spa',
  'Barbería',
  'Clínica estética',
  'Nail Studio',
  'Centro de bienestar',
  'Otro',
];

interface LoyaltyConfig {
  id?: string;
  pointsPerCurrencyUnit: number;
  currencyUnit: string;
  inactivityDays: number;
  isActive: boolean;
}

interface Reward {
  id?: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount_pct' | 'discount_fixed' | 'free_service';
  value: string;
  serviceId?: string;
  active?: boolean;
}

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount_pct: 'Descuento %',
  discount_fixed: 'Descuento fijo',
  free_service: 'Servicio gratis',
};

export const CompanySettingsPage: React.FC = () => {
  const { currentTenant, tenants } = useAppStore();

  const [formData, setFormData] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'loyalty'>('company');

  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    pointsPerCurrencyUnit: 1,
    currencyUnit: '10000',
    inactivityDays: 45,
    isActive: true,
  });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState<Reward>({
    name: '',
    description: '',
    pointsCost: 50,
    type: 'discount_pct',
    value: '10',
    serviceId: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [savingReward, setSavingReward] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      setFormData({ ...currentTenant });
      loadLoyaltyData();
    }
  }, [currentTenant]);

  const tabs = [
    { id: 'company', label: 'Datos de la Empresa', icon: Building2 },
    { id: 'loyalty', label: 'Sistema de Fidelización', icon: Star },
  ] as const;

  const loadLoyaltyData = async () => {
    if (!currentTenant) return;
    try {
      const headers = { 'x-tenant-id': currentTenant.id };
      const [configRes, rewardsRes, servicesRes] = await Promise.all([
        fetch('/api/loyalty?config=true', { headers }),
        fetch('/api/loyalty-rewards', { headers }),
        fetch('/api/services', { headers }),
      ]);

      if (configRes.ok) {
        const config = await configRes.json();
        setLoyaltyConfig({
          pointsPerCurrencyUnit: config.pointsPerCurrencyUnit || 1,
          currencyUnit: String(config.currencyUnit || '10000'),
          inactivityDays: config.inactivityDays || 45,
          isActive: config.isActive !== undefined ? config.isActive : true,
        });
      }
      if (rewardsRes.ok) setRewards(await rewardsRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
    } catch (err) {
      console.error('Error al cargar datos de fidelizacion:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setSaving(true);
    setSuccessMsg(null);

    try {
      const payload = { id: currentTenant.id, ...formData };
      const res = await fetch('/api/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        const updatedTenants = tenants.map((t) =>
          t.id === updated.id ? { ...t, ...updated } : t
        );
        useAppStore.setState({ tenants: updatedTenants, currentTenant: updated });
        setSuccessMsg('Datos de la empresa guardados correctamente.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert('Error al guardar los datos de la empresa.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoyaltyConfig = async () => {
    if (!currentTenant) return;
    setSavingConfig(true);
    setConfigSuccessMsg(null);
    try {
      const res = await fetch('/api/loyalty?config=true', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant.id,
        },
        body: JSON.stringify({
          pointsPerCurrencyUnit: loyaltyConfig.pointsPerCurrencyUnit,
          currencyUnit: loyaltyConfig.currencyUnit,
          inactivityDays: loyaltyConfig.inactivityDays,
          isActive: loyaltyConfig.isActive,
        }),
      });
      if (res.ok) {
        setConfigSuccessMsg('Configuracion de fidelizacion guardada.');
        setTimeout(() => setConfigSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenRewardModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || '',
        pointsCost: reward.pointsCost,
        type: reward.type,
        value: reward.value || '',
        serviceId: reward.serviceId || '',
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: '',
        description: '',
        pointsCost: 50,
        type: 'discount_pct',
        value: '10',
        serviceId: '',
      });
    }
    setShowRewardModal(true);
  };

  const handleSaveReward = async () => {
    if (!currentTenant || !rewardForm.name || !rewardForm.pointsCost) return;
    setSavingReward(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenant.id,
      };

      if (editingReward?.id) {
        await fetch(`/api/loyalty-rewards?id=${editingReward.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: rewardForm.name,
            description: rewardForm.description,
            pointsCost: rewardForm.pointsCost,
            type: rewardForm.type,
            value: rewardForm.type !== 'free_service' ? rewardForm.value : null,
            serviceId: rewardForm.type === 'free_service' ? rewardForm.serviceId : null,
          }),
        });
      } else {
        await fetch('/api/loyalty-rewards', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: rewardForm.name,
            description: rewardForm.description,
            pointsCost: rewardForm.pointsCost,
            type: rewardForm.type,
            value: rewardForm.type !== 'free_service' ? rewardForm.value : null,
            serviceId: rewardForm.type === 'free_service' ? rewardForm.serviceId : null,
          }),
        });
      }

      setShowRewardModal(false);
      loadLoyaltyData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReward(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!currentTenant || !confirm('Eliminar esta recompensa?')) return;
    try {
      await fetch(`/api/loyalty-rewards?id=${rewardId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant.id },
      });
      loadLoyaltyData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Building2 />}
        title="Configuración de Empresa"
        subtitle="Administra los datos de tu negocio, sistema de fidelización y preferencias regionales."
      />

      <div className="bg-white border border-app-gray-200 rounded-2xl p-2.5 shadow-sm">
        <Tabs
          tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: <t.icon /> }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </div>

      {activeTab === 'company' && (
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="p-5 sm:p-6 border-b border-app-gray-100 bg-app-mint-50/30 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center flex-shrink-0">
              {currentTenant?.logoUrl ? (
                <img src={currentTenant.logoUrl} alt={currentTenant.name} className="w-full h-full object-contain rounded-xl" />
              ) : (
                <Store className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-app-text-primary text-base">
                {formData.name || currentTenant?.name || 'Tu Empresa'}
              </h3>
              <p className="text-xs text-app-text-secondary font-medium">
                {formData.category || currentTenant?.category || 'Categoría no definida'}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Nombre de la empresa *"
              icon={<Store />}
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Ej. Beauté Spa & Bienestar"
              required
            />
            <Input
              label="NIT / ID fiscal"
              icon={<Hash />}
              name="nit"
              value={formData.nit || ''}
              onChange={handleChange}
              placeholder="Ej. 900.123.456-7"
            />
            <Input
              label="Teléfono / WhatsApp comercial"
              icon={<Phone />}
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="Ej. +573001234567"
            />
            <Input
              label="Email de contacto"
              icon={<Mail />}
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="Ej. contacto@empresa.com"
            />
            <Input
              label="Dirección"
              icon={<MapPin />}
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Ej. Calle 85 #15-45"
            />
            <Input
              label="Ciudad"
              name="city"
              value={formData.city || ''}
              onChange={handleChange}
              placeholder="Ej. Bogotá"
            />
            <Input
              label="País"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              placeholder="Ej. Colombia"
            />
            <Select
              label="Tipo de moneda"
              name="currency"
              value={formData.currency || 'COP'}
              onChange={handleChange}
              options={MONEDAS.map((m) => ({ value: m, label: m }))}
            />
            <Select
              label="Categoría de empresa"
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              placeholder="Seleccionar..."
              options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Sitio web"
              icon={<Globe />}
              type="url"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              placeholder="Ej. https://miempresa.com"
            />
            <Input
              label="Instagram"
              name="instagram"
              value={formData.instagram || ''}
              onChange={handleChange}
              placeholder="Ej. @miempresa"
            />
          </div>

          <div className="p-5 sm:p-6 border-t border-app-gray-100 bg-app-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            {successMsg && (
              <Badge variant="success">{successMsg}</Badge>
            )}
            <div className="sm:ml-auto">
              <Button
                type="submit"
                loading={saving}
                icon={<Save />}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </Card>
      </form>
      )}

      {activeTab === 'loyalty' && (<>
      <Card>
        <div className="p-5 sm:p-6 border-b border-app-gray-100 bg-amber-50/30 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Star className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-app-text-primary text-base">Sistema de Fidelizacion</h3>
            <p className="text-xs text-app-text-secondary font-medium">
              Configura como tus clientes ganan y canjean puntos de fidelidad
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h4 className="text-sm font-extrabold text-app-text-primary uppercase tracking-wider">
                Reglas de Acumulacion de Puntos
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">
                  Puntos por unidad monetaria
                </label>
                <input
                  type="number"
                  min="1"
                  value={loyaltyConfig.pointsPerCurrencyUnit}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointsPerCurrencyUnit: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">
                  Unidad monetaria
                </label>
                <input
                  type="number"
                  min="1"
                  value={parseFloat(loyaltyConfig.currencyUnit) || 0}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, currencyUnit: e.target.value || '10000' })}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
                />
                <span className="text-[8px] text-app-gray-500 mt-0.5 block">
                  Ej: 10000 = 1 punto por cada $10.000
                </span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">
                  Dias para alerta de inactividad
                </label>
                <input
                  type="number"
                  min="1"
                  value={loyaltyConfig.inactivityDays}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, inactivityDays: parseInt(e.target.value) || 45 })}
                  className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loyaltyConfig.isActive}
                    onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-app-gray-300 text-app-mint focus:ring-app-mint"
                  />
                  <span className="text-xs font-bold text-app-text-primary">Fidelizacion activa</span>
                </label>
              </div>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] text-amber-700">
                Los clientes ganan <strong>{loyaltyConfig.pointsPerCurrencyUnit} punto(s)</strong> por cada{' '}
                <strong>{formatCOP(parseFloat(loyaltyConfig.currencyUnit))}</strong> gastados en servicios.
              </p>
            </div>
          </div>

          <div className="border-t border-app-gray-100 pt-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-app-mint" />
                <h4 className="text-sm font-extrabold text-app-text-primary uppercase tracking-wider">
                  Catalogo de Recompensas
                </h4>
              </div>
              <button
                onClick={() => handleOpenRewardModal()}
                className="flex items-center gap-1.5 px-3 py-2 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-[10px] font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            {rewards.length === 0 ? (
              <p className="text-xs text-app-gray-500 italic text-center py-6">
                No hay recompensas configuradas. Agrega la primera usando el boton "Agregar".
              </p>
            ) : (
              <div className="space-y-2">
                {rewards.map((reward) => {
                  const typeIcon = reward.type === 'discount_pct' ? Percent
                    : reward.type === 'discount_fixed' ? DollarSign
                    : Sparkles;
                  const valueLabel = reward.type === 'discount_pct'
                    ? `${reward.value}%`
                    : reward.type === 'discount_fixed'
                    ? formatCOP(parseFloat(reward.value))
                    : 'Servicio gratis';

                  return (
                    <div
                      key={reward.id}
                      className="flex items-center gap-3 p-3 bg-app-gray-50 border border-app-gray-150 rounded-xl hover:border-app-mint transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center shrink-0">
                        {React.createElement(typeIcon, { className: 'w-5 h-5' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-xs font-bold text-app-text-primary">{reward.name}</h6>
                        <p className="text-[10px] text-app-gray-500 mt-0.5">
                          {reward.description || REWARD_TYPE_LABELS[reward.type]}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-black text-amber-700">{reward.pointsCost}</span>
                        </div>
                        <span className="text-[10px] font-bold text-app-mint bg-app-mint-50 px-2 py-0.5 rounded-lg">
                          {valueLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenRewardModal(reward)}
                            className="p-1.5 text-app-gray-500 hover:text-app-mint hover:bg-app-mint-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => reward.id && handleDeleteReward(reward.id)}
                            className="p-1.5 text-app-gray-500 hover:text-app-pink hover:bg-app-pink-50 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 border-t border-app-gray-100 bg-app-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {configSuccessMsg && (
            <Badge variant="success">{configSuccessMsg}</Badge>
          )}
          <div className="sm:ml-auto">
            <Button
              onClick={handleSaveLoyaltyConfig}
              loading={savingConfig}
              icon={<Save />}
            >
              Guardar Configuracion
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        title={editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Nombre *</label>
            <input
              type="text"
              value={rewardForm.name}
              onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
              placeholder="Ej. 10% de descuento"
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Descripcion</label>
            <textarea
              value={rewardForm.description}
              onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
              placeholder="Describe el beneficio..."
              rows={2}
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Tipo de beneficio</label>
            <select
              value={rewardForm.type}
              onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as Reward['type'] })}
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
            >
              <option value="discount_pct">Porcentaje de descuento (%)</option>
              <option value="discount_fixed">Descuento fijo (monto)</option>
              <option value="free_service">Servicio gratis</option>
            </select>
          </div>

          {rewardForm.type === 'free_service' ? (
            <div>
              <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Servicio</label>
              <select
                value={rewardForm.serviceId}
                onChange={(e) => setRewardForm({ ...rewardForm, serviceId: e.target.value })}
                className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
              >
                <option value="">Seleccionar servicio...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">
                Valor {rewardForm.type === 'discount_pct' ? '(%)' : '(monto)'}
              </label>
              <input
                type="number"
                min="1"
                value={rewardForm.value || ''}
                onChange={(e) => setRewardForm({ ...rewardForm, value: e.target.value })}
                placeholder={rewardForm.type === 'discount_pct' ? 'Ej. 10' : 'Ej. 50000'}
                className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-app-gray-500 uppercase block mb-1">Puntos requeridos *</label>
            <input
              type="number"
              min="1"
              value={rewardForm.pointsCost || ''}
              onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-white outline-none focus:border-app-mint font-semibold"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setShowRewardModal(false)}
            className="flex-1 py-2.5 border border-app-gray-200 text-app-text-secondary rounded-xl text-xs font-bold hover:bg-app-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveReward}
            disabled={savingReward || !rewardForm.name || !rewardForm.pointsCost}
            className="flex-1 py-2.5 bg-app-mint hover:bg-app-mint-600 disabled:bg-app-gray-200 text-white disabled:text-app-gray-400 rounded-xl text-xs font-bold shadow-sm"
          >
            {savingReward ? 'Guardando...' : editingReward ? 'Actualizar' : 'Crear Recompensa'}
          </button>
        </div>
      </Modal>
      </>)}
    </div>
  );
};
