import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2Off, Loader2, QrCode, Smartphone } from 'lucide-react';
import { Button, Card, Input, PageHeader } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

type Instance = { id: string; evolutionName: string; label: string; phoneNumber: string | null; active: boolean; createdAt: string };

function sessionHeaders() {
  let token = '';
  try { token = JSON.parse(localStorage.getItem('aura_session') || '{}').sessionToken || ''; } catch { /* no session */ }
  return { 'x-session-token': token };
}

export const WhatsAppSettingsPage = () => {
  const tenantId = useAppStore((state) => state.currentTenant?.id);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [agentApiUrl, setAgentApiUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [label, setLabel] = useState('');
  const [evolutionName, setEvolutionName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/whatsapp/settings', { headers: sessionHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No fue posible cargar WhatsApp.');
      setInstances(result.instances || []);
      setWebhookUrl(result.evolutionWebhookUrl || '');
      setAgentApiUrl(result.agentApiUrl || '');
    } catch (cause: any) { setError(cause.message || 'No fue posible cargar WhatsApp.'); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'POST', headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instance', evolutionName, label, phoneNumber }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No fue posible registrar la instancia.');
      setInstances((items) => [...items, result]);
      setEvolutionName(''); setLabel(''); setPhoneNumber('');
      setSuccess('Instancia registrada. Configura Evolution con la URL del webhook indicada.');
    } catch (cause: any) { setError(cause.message || 'No fue posible registrar la instancia.'); }
    finally { setSaving(false); }
  };

  const toggle = async (instance: Instance) => {
    setBusyId(instance.id); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'PUT', headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instance', id: instance.id, active: !instance.active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No fue posible cambiar el estado.');
      setInstances((items) => items.map((item) => item.id === instance.id ? result : item));
      setSuccess(`Instancia ${result.active ? 'activada' : 'pausada'}.`);
    } catch (cause: any) { setError(cause.message || 'No fue posible cambiar el estado.'); }
    finally { setBusyId(''); }
  };

  const unlink = async (instance: Instance) => {
    if (!window.confirm(`Desvincular “${instance.label}” (${instance.evolutionName})? Se conservará el historial y podrás registrar este nombre en otro tenant.`)) return;
    setBusyId(instance.id); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'POST', headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instance', action: 'unlink', id: instance.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No fue posible desvincular la instancia.');
      setInstances((items) => items.filter((item) => item.id !== instance.id));
      setSuccess('Instancia desvinculada. Su conversación queda en el archivo y el nombre vuelve a estar disponible.');
    } catch (cause: any) { setError(cause.message || 'No fue posible desvincular la instancia.'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<Smartphone />} title="WhatsApp y n8n" subtitle="Conecta Evolution directamente al workflow multi-tenant de Miesbe." />
      {error && <Card className="border-app-pink-200 bg-app-pink-50"><p role="alert" className="text-sm font-bold text-app-pink">{error}</p></Card>}
      {success && <Card className="border-app-mint-200 bg-app-mint-50"><p className="text-sm font-bold text-app-mint">{success}</p></Card>}

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center"><QrCode className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold">Webhook de Evolution</h2>
            <p className="text-sm text-app-text-secondary mt-1">Usa esta URL para los eventos entrantes de mensajes. El workflow identifica el tenant mediante el nombre de instancia registrado aquí.</p>
            {webhookUrl ? <div className="mt-3 flex flex-col sm:flex-row gap-2"><code className="flex-1 break-all rounded-xl border border-app-gray-200 bg-app-gray-50 p-3 text-xs">{webhookUrl}</code><Button variant="secondary" icon={copied ? <Check /> : <Copy />} onClick={async () => { await navigator.clipboard.writeText(webhookUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>{copied ? 'Copiada' : 'Copiar'}</Button></div> : <p className="mt-3 text-xs text-app-peach-700">Configura N8N_EVOLUTION_WEBHOOK_URL en el entorno del backend para mostrar aquí la URL.</p>}
            <p className="text-xs text-app-text-secondary mt-3">En Evolution habilita `messages.upsert` y configura el header `x-n8n-webhook-secret` con el mismo secreto de la credencial del trigger inbound en n8n. No incluyas la API key dentro del payload del webhook.</p>
          </div>
        </div>
      </Card>

      <Card className="border-app-sky-100 bg-app-sky-50/50">
        <h2 className="font-extrabold">API segura para n8n</h2>
        <p className="text-sm text-app-text-secondary mt-1">n8n usa una credencial Bearer fija de servidor; Miesbe resuelve el tenant a partir de la instancia registrada. No compartas la Neon connection string ni envíes tenantId como autoridad.</p>
        {agentApiUrl && <code className="block mt-3 rounded-xl bg-white border border-app-sky-100 p-3 text-xs break-all">{agentApiUrl}</code>}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-extrabold">Instancias Evolution</h2><p className="text-sm text-app-text-secondary mt-1">Cada instancia queda asociada a este tenant y conserva su historial al desvincularse.</p></div><Button size="sm" variant="secondary" onClick={() => void load()}>Actualizar</Button></div>
        {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-app-mint" /></div> : instances.length === 0 ? <p className="py-5 text-sm text-app-text-secondary">No hay instancias registradas.</p> : <div className="divide-y divide-app-gray-100">
          {instances.map((instance) => <div key={instance.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-bold truncate">{instance.label}</p><p className="text-xs font-mono text-app-text-secondary mt-1 truncate">{instance.evolutionName}</p><p className="text-xs text-app-text-secondary mt-1">{instance.phoneNumber || 'Teléfono sin registrar'}</p></div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant={instance.active ? 'secondary' : 'primary'} disabled={busyId !== ''} loading={busyId === instance.id} onClick={() => void toggle(instance)}>{instance.active ? 'Pausar' : 'Activar'}</Button>
              <Button size="sm" variant="danger" icon={<Link2Off className="w-4 h-4" />} disabled={busyId !== ''} loading={busyId === instance.id} onClick={() => void unlink(instance)}>Desvincular</Button>
            </div>
          </div>)}
        </div>}
      </Card>

      <Card>
        <h2 className="font-extrabold">Registrar instancia</h2>
        <form onSubmit={(event) => void submit(event)} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre exacto en Evolution" required value={evolutionName} onChange={(event) => setEvolutionName(event.target.value)} placeholder="beauty_main" />
          <Input label="Etiqueta para el inbox" required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="WhatsApp principal" />
          <Input label="Número asociado (opcional)" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+57 300 000 0000" />
          <div className="md:col-span-2"><Button type="submit" loading={saving} icon={<Smartphone className="w-4 h-4" />}>Registrar instancia</Button></div>
        </form>
      </Card>

      <Card className="border-app-sky-100 bg-app-sky-50/50"><h3 className="font-bold">Credenciales de servidor</h3><p className="text-sm text-app-text-secondary mt-1">Configura MIESBE_N8N_API_KEY en el backend y la credencial Bearer correspondiente en n8n. La API key de Evolution se guarda solo en las credenciales n8n; no se muestra ni se almacena en el navegador de Miesbe.</p></Card>
    </div>
  );
};
