import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Archive, Bot, CalendarDays, CircleUserRound, Hand, MessageSquare, RefreshCw, Search, Send, UserRound } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Badge, Button, EmptyState, Input } from '../components/ui';

type Conversation = {
  id: string;
  clientId: string;
  remoteJid: string;
  phoneNumber: string;
  displayName: string | null;
  status: string;
  handlingMode: 'bot' | 'human';
  assignedUserId: string | null;
  assignedUserName?: string | null;
  handoffReason: string | null;
  lastMessageAt: string | null;
  client: { id: string; name: string; phone: string };
  instance: { name: string; label: string };
  lastMessage: Message | null;
};

type Message = {
  id: string;
  direction: 'inbound' | 'outbound';
  authorType: string;
  content: string;
  deliveryStatus: string;
  messageType: string;
  createdAt: string;
};

type ArchiveConversation = {
  id: string;
  hubConversationId: string;
  contactName: string | null;
  contactPhone: string | null;
  status: string;
  handlingMode: string;
  lastMessageAt: string | null;
};

function getSessionToken() {
  try { return JSON.parse(localStorage.getItem('aura_session') || '{}').sessionToken || ''; }
  catch { return ''; }
}

export const WhatsAppMessagesPage: React.FC = () => {
  const { currentTenant, currentUser } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [archiveMode, setArchiveMode] = useState(false);
  const [archiveConversations, setArchiveConversations] = useState<ArchiveConversation[]>([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState('');
  const [archiveData, setArchiveData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const headers = useCallback(() => ({ 'x-session-token': getSessionToken() }), []);
  const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.mensajes?.crear === true;

  const loadConversations = useCallback(async () => {
    if (!currentTenant || archiveMode) return;
    setLoading(true);
    try {
      const result = await fetch('/api/whatsapp/inbox', { headers: headers() }).then((res) => res.json());
      if (!result || result.error) throw new Error(result.error?.message || 'No se pudo cargar el inbox.');
      const list = result.conversations || [];
      setConversations(list);
      setSelectedId((previous) => list.some((item: Conversation) => item.id === previous) ? previous : list[0]?.id || '');
      setError('');
    } catch (cause: any) {
      setError(cause.message || 'No se pudo cargar el inbox.');
    } finally { setLoading(false); }
  }, [currentTenant, archiveMode, headers]);

  const loadArchive = useCallback(async () => {
    if (!currentTenant || !archiveMode) return;
    setLoading(true);
    try {
      const result = await fetch('/api/whatsapp/inbox?source=hub_archive', { headers: headers() }).then((res) => res.json());
      if (!result || result.error) throw new Error(result.error?.message || 'No se pudo cargar el archivo Hub.');
      const list = result.conversations || [];
      setArchiveConversations(list);
      setSelectedArchiveId((previous) => list.some((item: ArchiveConversation) => item.hubConversationId === previous) ? previous : list[0]?.hubConversationId || '');
      setError('');
    } catch (cause: any) {
      setError(cause.message || 'No se pudo cargar el archivo Hub.');
    } finally { setLoading(false); }
  }, [currentTenant, archiveMode, headers]);

  const loadSelected = useCallback(async () => {
    const id = archiveMode ? selectedArchiveId : selectedId;
    if (!id) { setSelectedData(null); setArchiveData(null); return; }
    const query = new URLSearchParams({ conversationId: id });
    if (archiveMode) query.set('source', 'hub_archive');
    try {
      const result = await fetch(`/api/whatsapp/inbox?${query}`, { headers: headers() }).then((res) => res.json());
      if (!result || result.error) throw new Error(result.error?.message || 'No se pudo cargar el historial.');
      if (archiveMode) setArchiveData(result);
      else setSelectedData(result);
    } catch (cause: any) {
      setError(cause.message || 'No se pudo cargar el historial.');
    }
  }, [archiveMode, selectedArchiveId, selectedId, headers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadConversations(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadArchive(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadArchive]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSelected(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSelected]);
  useEffect(() => {
    if (!currentTenant || archiveMode) return;
    const timer = window.setInterval(() => { void loadConversations(); }, 15000);
    return () => window.clearInterval(timer);
  }, [currentTenant, archiveMode, loadConversations]);

  const filteredConversations = useMemo(() => conversations.filter((item) =>
    `${item.client?.name || ''} ${item.phoneNumber || ''} ${item.instance?.label || ''}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const filteredArchive = useMemo(() => archiveConversations.filter((item) =>
    `${item.contactName || ''} ${item.contactPhone || ''}`.toLowerCase().includes(search.toLowerCase())), [archiveConversations, search]);
  const selected = conversations.find((item) => item.id === selectedId) || null;
  const messages: Message[] = selectedData?.messages || [];

  const changeMode = async (action: 'takeover_start' | 'takeover_release') => {
    if (!selected) return;
    setError('');
    const result = await fetch('/api/whatsapp/inbox', {
      method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, conversationId: selected.id }),
    }).then(async (res) => ({ ok: res.ok, data: await res.json() }));
    if (!result.ok) { setError(result.data.error?.message || 'No se pudo cambiar el modo de atención.'); return; }
    await loadConversations();
    await loadSelected();
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    const content = draft.trim();
    const storageKey = `miesbe-wa:${selected.id}:${content}`;
    let idempotencyKey = '';
    try { idempotencyKey = sessionStorage.getItem(storageKey) || ''; } catch { /* storage may be disabled */ }
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      try { sessionStorage.setItem(storageKey, idempotencyKey); } catch { /* the server still deduplicates within this request */ }
    }
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/whatsapp/inbox', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ action: 'reply', conversationId: selected.id, content }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(result.error?.message || 'No se pudo enviar el mensaje.');
      setDraft('');
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
      if (result.error) setError(result.error.message || 'El resultado de envío está pendiente de confirmación.');
      await loadSelected();
      await loadConversations();
    } catch (cause: any) { setError(cause.message || 'No se pudo enviar el mensaje.'); }
    finally { setSending(false); }
  };

  const archiveMessages = archiveData?.messages || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-app-text-primary">Mensajes de WhatsApp</h1>
          <p className="text-sm text-app-text-secondary mt-1">Conversaciones de tus clientes, agente IA y recepción en un solo lugar.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={!archiveMode ? 'primary' : 'secondary'} onClick={() => { setArchiveMode(false); setSearch(''); }}>Inbox actual</Button>
          <Button size="sm" variant={archiveMode ? 'primary' : 'secondary'} icon={<Archive />} onClick={() => { setArchiveMode(true); setSearch(''); }}>Archivo Hub</Button>
        </div>
      </div>

      {archiveMode && <div className="rounded-xl border border-app-peach-200 bg-app-peach-50 p-3 text-sm text-app-text-secondary">Historial anterior del Hub, solo lectura y sujeto a la retención existente. Las conversaciones nuevas llegan al inbox nativo.</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="h-[calc(100vh-235px)] min-h-[520px] grid grid-cols-1 lg:grid-cols-12 bg-white border border-app-gray-200 rounded-[24px] shadow-sm overflow-hidden">
        <aside className="lg:col-span-3 border-r border-app-gray-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-app-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-app-mint" />{archiveMode ? 'Archivo' : 'Conversaciones'}</h2>
              <button type="button" aria-label="Actualizar" onClick={() => void (archiveMode ? loadArchive() : loadConversations())} className="p-2 rounded-lg hover:bg-app-gray-100"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <Input icon={<Search />} placeholder="Buscar nombre o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading && <p className="p-4 text-sm text-app-gray-500">Cargando conversaciones…</p>}
            {!loading && !archiveMode && filteredConversations.length === 0 && <EmptyState icon={<MessageSquare />} title="Sin conversaciones" message="Los mensajes nuevos de WhatsApp aparecerán aquí." />}
            {!loading && archiveMode && filteredArchive.length === 0 && <EmptyState icon={<Archive />} title="Sin conversaciones archivadas" message="El historial previo del Hub se conserva aquí si existe." />}
            {!archiveMode && filteredConversations.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full text-left rounded-xl p-3 mb-1 ${selectedId === item.id ? 'bg-app-mint-100' : 'hover:bg-app-gray-50'}`}>
                <div className="flex justify-between gap-2"><span className="font-bold text-sm truncate">{item.displayName || item.client?.name || item.phoneNumber}</span><span className="text-[10px] text-app-gray-500">{item.lastMessageAt ? format(new Date(item.lastMessageAt), 'HH:mm') : ''}</span></div>
                <p className="text-xs text-app-gray-500 truncate mt-1">{item.lastMessage?.content || item.phoneNumber}</p>
                <div className="flex gap-2 mt-2"><Badge variant={item.handlingMode === 'human' ? 'warning' : 'success'}>{item.handlingMode === 'human' ? 'Recepción' : 'Agente IA'}</Badge><span className="text-[10px] text-app-gray-400 truncate">{item.instance?.label}</span></div>
              </button>
            ))}
            {archiveMode && filteredArchive.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedArchiveId(item.hubConversationId)} className={`w-full text-left rounded-xl p-3 mb-1 ${selectedArchiveId === item.hubConversationId ? 'bg-app-mint-100' : 'hover:bg-app-gray-50'}`}>
                <div className="flex justify-between gap-2"><span className="font-bold text-sm truncate">{item.contactName || item.contactPhone || 'Contacto archivado'}</span><span className="text-[10px] text-app-gray-500">{item.lastMessageAt ? format(new Date(item.lastMessageAt), 'HH:mm') : ''}</span></div>
                <p className="text-xs text-app-gray-500 mt-1">Conversación anterior del Hub · solo lectura</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-6 flex flex-col min-h-0 bg-[#faf9f6]">
          {archiveMode ? archiveData ? <>
            <header className="bg-white px-5 py-4 border-b border-app-gray-150"><h3 className="font-bold">{archiveData.conversation?.contactName || archiveData.conversation?.contactPhone || 'Contacto archivado'}</h3><p className="text-xs text-app-gray-500">Archivo histórico del Hub · solo lectura</p></header>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {(archiveMessages as any[]).map((message) => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.direction === 'outbound' ? 'bg-app-mint text-white' : 'bg-white border border-app-gray-200'}`}><p className="whitespace-pre-wrap">{message.content || 'Mensaje eliminado'}</p><p className="text-[10px] opacity-70 text-right mt-1">{format(new Date(message.createdAtHub), 'dd MMM · HH:mm', { locale: es })}</p></div></div>)}
            </div>
          </> : <div className="m-auto text-sm text-app-gray-500">Selecciona una conversación archivada.</div> : selected ? <>
            <header className="bg-white px-5 py-3 border-b border-app-gray-150 flex justify-between items-center gap-3">
              <div className="min-w-0"><h3 className="font-bold text-sm truncate">{selected.displayName || selected.client?.name || selected.phoneNumber}</h3><p className="text-xs text-app-gray-500">{selected.phoneNumber} · {selected.instance?.label}</p></div>
              <div className="flex gap-2 shrink-0">
                {selected.handlingMode === 'bot'
                  ? <Button size="sm" variant="secondary" disabled={!canWrite || sending} onClick={() => void changeMode('takeover_start')}><Hand className="w-4 h-4" />Tomar</Button>
                  : <Button size="sm" variant="secondary" disabled={!canWrite || sending} onClick={() => void changeMode('takeover_release')}><Bot className="w-4 h-4" />Devolver a IA</Button>}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map((message) => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.direction === 'outbound' ? 'bg-app-mint text-white' : 'bg-white border border-app-gray-200'}`}>
                <div className="text-[10px] opacity-75 flex items-center gap-1 mb-1"><UserRound className="w-3 h-3" />{message.authorType === 'agent' ? 'Agente IA' : message.authorType === 'user' ? 'Equipo' : message.authorType === 'client' ? 'Cliente' : 'Sistema'}</div>
                <p className="whitespace-pre-wrap">{message.content || `[${message.messageType}]`}</p>
                <div className="text-[10px] opacity-70 text-right mt-1">{format(new Date(message.createdAt), 'dd MMM · HH:mm', { locale: es })} · {message.deliveryStatus}</div>
              </div></div>)}
              {!messages.length && <EmptyState icon={<MessageSquare />} title="Sin mensajes" message="Los mensajes aparecerán aquí." />}
            </div>
            <form onSubmit={(e) => void sendReply(e)} className="bg-white p-3 border-t border-app-gray-150 flex gap-2">
              <Input placeholder={selected.handlingMode === 'human' ? 'Escribe una respuesta…' : 'Toma la conversación para responder'} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!canWrite || sending || selected.handlingMode !== 'human'} className="flex-1" />
              <Button type="submit" disabled={!canWrite || sending || !draft.trim() || selected.handlingMode !== 'human'} loading={sending} aria-label="Enviar respuesta"><Send className="w-4 h-4" /></Button>
            </form>
          </> : <div className="m-auto text-center text-sm text-app-gray-500"><MessageSquare className="w-8 h-8 mx-auto mb-2" />Selecciona una conversación.</div>}
        </section>

        <aside className="hidden lg:flex lg:col-span-3 border-l border-app-gray-200 bg-white flex-col min-h-0 overflow-y-auto">
          {archiveMode ? <div className="p-5"><Badge variant="neutral">Solo lectura</Badge><p className="text-sm text-app-gray-500 mt-3">Este historial pertenece al Hub anterior. Las nuevas conversaciones se almacenan en Miesbe.</p></div> : selectedData ? <>
            <div className="p-5 border-b border-app-gray-100"><div className="w-12 h-12 rounded-2xl bg-app-mint-100 text-app-mint flex items-center justify-center"><CircleUserRound className="w-6 h-6" /></div><h3 className="font-extrabold mt-3">{selectedData.client?.name || selected?.displayName || 'Cliente WhatsApp'}</h3><p className="text-sm text-app-gray-500">{selectedData.client?.phone || selected?.phoneNumber}</p><Badge className="mt-3" variant={selectedData.conversation?.handlingMode === 'human' ? 'warning' : 'success'}>{selectedData.conversation?.handlingMode === 'human' ? 'Atención humana' : 'Agente IA'}</Badge></div>
            <div className="p-5 space-y-5">
              <section><h4 className="font-bold text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" />Citas</h4>{(selectedData.appointments || []).length ? (selectedData.appointments as any[]).map((appointment) => <div key={appointment.id} className="mt-2 rounded-xl bg-app-gray-50 p-3 text-xs"><p className="font-bold">{appointment.serviceName}</p><p className="text-app-gray-500 mt-1">{format(new Date(appointment.startTime), 'dd MMM yyyy · HH:mm', { locale: es })}</p><p className="text-app-gray-500">{appointment.professionalName} · {appointment.status}</p></div>) : <p className="text-xs text-app-gray-500 mt-2">Sin citas registradas.</p>}</section>
              <section><h4 className="font-bold text-sm">Cotizaciones</h4>{(selectedData.quotes || []).length ? (selectedData.quotes as any[]).map((quote) => <div key={quote.id} className="mt-2 rounded-xl bg-app-gray-50 p-3 text-xs"><p className="font-bold">{quote.status} · {quote.currency} {quote.total}</p>{(quote.itemSnapshot || []).map((item: any, index: number) => <p key={`${quote.id}-${index}`} className="text-app-gray-500 mt-1">{item.quantity} × {item.name}</p>)}</div>) : <p className="text-xs text-app-gray-500 mt-2">Sin cotizaciones.</p>}</section>
              {selectedData.conversation?.handoffReason && <section><h4 className="font-bold text-sm">Motivo de traspaso</h4><p className="text-xs text-app-gray-600 mt-2">{selectedData.conversation.handoffReason}</p><p className="text-xs text-app-gray-500 mt-1">Asignado a: {selectedData.assignedUser?.name || 'Recepción pendiente'}</p></section>}
            </div>
          </> : <div className="p-5 text-sm text-app-gray-500">Elige una conversación para ver cliente, citas y cotizaciones.</div>}
        </aside>
      </div>
    </div>
  );
};
