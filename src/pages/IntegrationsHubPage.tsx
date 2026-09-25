import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plug, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

type ApiKey = { id: string; name: string; keyPrefix: string; scopes: string[]; active: boolean; createdAt: string; lastUsedAt?: string | null };
type Webhook = { id: string; url: string; events: string[]; active: boolean; createdAt: string };

function getSessionToken() {
  try {
    const raw = localStorage.getItem('aura_session');
    return raw ? JSON.parse(raw).sessionToken || '' : '';
  } catch {
    localStorage.removeItem('aura_session');
    return '';
  }
}

export const IntegrationsHubPage = () => {
  const currentTenant = useAppStore((state) => state.currentTenant);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState('');
  const sessionToken = getSessionToken();
  const headers: Record<string, string> = sessionToken ? { 'x-session-token': sessionToken } : {};

  const loadKeys = async () => {
    if (!currentTenant) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/integration-admin', { headers });
      if (response.status === 401 || response.status === 403) {
        setLoadError('Tu sesión de administrador no es válida o ha vencido. Inicia sesión nuevamente.');
        return;
      }
      if (!response.ok) throw new Error('No fue posible cargar las API keys.');
      setKeys(await response.json());
      const hookResponse = await fetch('/api/integration-admin?resource=webhooks', { headers });
      if (!hookResponse.ok) throw new Error('No fue posible cargar los webhooks.');
      setWebhooks(await hookResponse.json());
    } catch (error: any) {
      setLoadError(error.message || 'No fue posible cargar la configuración del Hub.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadKeys(); }, [currentTenant?.id]);

  const createKey = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/integration-admin', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Hub de agentes' }) });
      if (response.ok) {
        const result = await response.json();
        setNewKey(result.apiKey);
        await loadKeys();
      } else alert('No fue posible crear la API key.');
    } finally { setCreating(false); }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('¿Revocar esta API key? El Hub dejará de autenticarse inmediatamente.')) return;
    const response = await fetch(`/api/integration-admin?id=${keyId}`, { method: 'DELETE', headers });
    if (response.ok) await loadKeys();
  };

  const createWebhook = async () => {
    if (!webhookUrl.startsWith('https://')) return alert('La URL debe comenzar con https://');
    const response = await fetch('/api/integration-admin', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'webhook', url: webhookUrl }) });
    if (response.ok) { const result = await response.json(); setWebhookSecret(result.secret); setWebhookUrl(''); await loadKeys(); }
    else alert('No fue posible crear el webhook.');
  };

  const revokeWebhook = async (id: string) => {
    if (!confirm('¿Desactivar este webhook?')) return;
    await fetch(`/api/integration-admin?resource=webhooks&id=${id}`, { method: 'DELETE', headers });
    await loadKeys();
  };

  const copyKey = async () => { await navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div className="space-y-6">
      <PageHeader icon={<Plug />} title="Hub de agentes" subtitle="Conecta tu centro con automatizaciones de WhatsApp e inteligencia artificial." />
      {loadError && <Card className="border-app-pink-200 bg-app-pink-50"><p className="text-sm font-bold text-app-pink">{loadError}</p></Card>}
      <Card className="border-app-mint-200 bg-app-mint-50/40">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-app-mint text-white flex items-center justify-center flex-shrink-0"><Plug className="w-5 h-5" /></div>
          <div><h2 className="font-extrabold text-app-text-primary">Integración lista para agendamiento</h2><p className="text-sm text-app-text-secondary mt-1">El Hub puede consultar servicios, profesionales, clientes y disponibilidad, además de crear, cancelar y reprogramar citas.</p><p className="text-xs text-app-text-secondary mt-3">Endpoint: <code className="font-bold">/api/v1</code> · Autenticación: API key</p></div>
        </div>
      </Card>

      {newKey && <Card className="border-app-peach-300 bg-app-peach-50"><div className="flex gap-3"><ShieldAlert className="w-5 h-5 text-app-peach-600 flex-shrink-0" /><div className="flex-1"><h3 className="font-extrabold text-app-text-primary">Copia esta clave ahora</h3><p className="text-xs text-app-text-secondary mt-1">Por seguridad no volverá a mostrarse completa.</p><div className="mt-3 flex gap-2"><code className="flex-1 bg-white rounded-xl border border-app-gray-200 px-3 py-2 text-xs break-all">{newKey}</code><Button size="sm" variant="secondary" icon={copied ? <Check /> : <Copy />} onClick={copyKey}>{copied ? 'Copiada' : 'Copiar'}</Button></div></div></div></Card>}

      <Card padding={false}><CardHeader icon={<KeyRound />} title="API keys" subtitle="Las claves permiten al Hub operar sobre este centro." actions={<Button size="sm" icon={<KeyRound />} loading={creating} onClick={createKey}>Crear API key</Button>} />
        {loading ? <div className="p-6 text-sm text-app-text-secondary">Cargando claves...</div> : keys.length === 0 ? <div className="p-8 text-center"><KeyRound className="w-8 h-8 mx-auto text-app-gray-400" /><p className="font-bold mt-3">No hay claves configuradas</p><p className="text-sm text-app-text-secondary mt-1">Crea una para conectar el Hub.</p></div> : <div className="divide-y divide-app-gray-100">{keys.map((key) => <div key={key.id} className="p-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-app-gray-100 flex items-center justify-center"><KeyRound className="w-4 h-4 text-app-gray-600" /></div><div><p className="font-bold text-sm">{key.name}</p><p className="text-xs text-app-text-secondary font-mono">{key.keyPrefix}••••••••</p><div className="flex gap-2 mt-1"><Badge variant={key.active ? 'success' : 'neutral'}>{key.active ? 'Activa' : 'Revocada'}</Badge><span className="text-[11px] text-app-text-secondary">Creada {new Date(key.createdAt).toLocaleDateString()}</span></div></div></div>{key.active && <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => revokeKey(key.id)}>Revocar</Button>}</div>)}</div>}
      </Card>

      <Card padding={false}><CardHeader icon={<RefreshCw />} title="Capacidades y documentación" /><div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-app-gray-50 p-4"><p className="font-bold">Flujo principal</p><p className="text-app-text-secondary mt-1">Disponibilidad → crear cita → cancelar o reprogramar.</p></div><div className="rounded-xl bg-app-gray-50 p-4"><p className="font-bold">Contrato OpenAPI</p><p className="text-app-text-secondary mt-1">Disponible en <code>openapi.yaml</code> para el equipo del Hub.</p></div></div></Card>
      <Card padding={false}><CardHeader icon={<RefreshCw />} title="Webhooks" subtitle="Recibe eventos de citas en el Hub." />
        <div className="p-5 space-y-4"><div className="flex flex-col sm:flex-row gap-2"><input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hub.example.com/webhooks" className="flex-1 rounded-xl border border-app-gray-200 px-3 py-2 text-sm" /><Button size="sm" onClick={createWebhook}>Agregar webhook</Button></div>
          {webhookSecret && <div className="rounded-xl bg-app-peach-50 border border-app-peach-200 p-3 text-xs"><b>Secreto, mostrar solo una vez:</b> <code className="break-all">{webhookSecret}</code></div>}
          {webhooks.map((hook) => <div key={hook.id} className="flex items-center justify-between gap-3 border-t border-app-gray-100 pt-3"><div><p className="text-sm font-bold break-all">{hook.url}</p><p className="text-xs text-app-text-secondary">{hook.events.join(', ')}</p></div><Button size="sm" variant="danger" onClick={() => revokeWebhook(hook.id)}>Desactivar</Button></div>)}
        </div>
      </Card>
    </div>
  );
};
