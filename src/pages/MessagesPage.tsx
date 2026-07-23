import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Smile,
  CheckCheck,
  Phone,
  Video,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { Input, IconButton, EmptyState } from '../components/ui';

export const MessagesPage: React.FC = () => {
  const { currentTenant, refreshTrigger } = useAppStore();

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chatInput, setChatInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const response = await fetch('/api/clients', {
          headers: { 'x-tenant-id': currentTenant.id }
        });
        if (response.ok) {
          const list = await response.json();
          setClients(list);
          if (list.length > 0 && !selectedClient) {
            setSelectedClient(list[0]);
          }
        }
      } catch (err) {
        console.error('Error al cargar contactos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [currentTenant, refreshTrigger]);

  useEffect(() => {
    const fetchChat = async () => {
      if (!selectedClient || !currentTenant) return;
      try {
        const response = await fetch(`/api/messages?clientId=${selectedClient.id}`, {
          headers: { 'x-tenant-id': currentTenant.id }
        });
        if (response.ok) {
          setMessages(await response.json());
        }
      } catch (err) {
        console.error('Error al cargar chat:', err);
      }
    };

    fetchChat();
  }, [selectedClient, currentTenant]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedClient || !currentTenant) return;

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
        setMessages(prev => [...prev, newMsg]);

        // Auto replies
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
                content: '¡Perfecto! Nos vemos pronto en el salón.',
                channel: 'whatsapp',
                status: 'read'
              })
            });
            const refreshChatRes = await fetch(`/api/messages?clientId=${selectedClient.id}`, {
              headers: { 'x-tenant-id': currentTenant.id }
            });
            if (refreshChatRes.ok) {
              setMessages(await refreshChatRes.json());
            }
          } catch (error) {}
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-app-gray-200 rounded-[28px] shadow-sm overflow-hidden h-[calc(100vh-180px)]">
      
      {/* 1. LEFT PANEL: CONVERSATION LIST */}
      <div className="md:col-span-1 border-r border-app-gray-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-app-gray-100 flex-shrink-0 space-y-3">
          <h4 className="text-sm font-extrabold text-app-text-primary font-sans flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-app-mint" />
            Chats Recientes
          </h4>
          
          {/* Search Contacts */}
          <Input
            icon={<Search />}
            placeholder="Buscar conversación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Contact List items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredClients.map((client) => {
            const isSelected = selectedClient?.id === client.id;
            return (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                  isSelected
                    ? 'bg-app-mint-100/70 border border-app-mint-250/20'
                    : 'hover:bg-app-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-2xl bg-app-mint-100 text-app-mint font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm border border-app-mint-250/15">
                    {client.name.charAt(0)}
                  </div>
                  <div className="leading-tight overflow-hidden">
                    <h6 className={`text-xs font-bold text-app-text-primary ${isSelected ? 'text-app-mint' : ''}`}>
                      {client.name}
                    </h6>
                    <span className="text-[10px] text-app-gray-500 truncate block mt-0.5 max-w-[140px]">
                      Haga clic para ver el chat de WhatsApp
                    </span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[8px] text-app-gray-500 font-bold">10:24 AM</span>
                  {!isSelected && (
                    <span className="w-4 h-4 rounded-full bg-app-pink-250 text-app-pink text-[8px] font-black flex items-center justify-center">
                      1
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RIGHT PANEL: CHATBOX WORKSPACE */}
      <div className="md:col-span-2 flex flex-col h-full bg-[#faf9f6]">
        {selectedClient ? (
          <>
            {/* Header info */}
            <div className="bg-white px-5 py-3 border-b border-app-gray-150 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-app-mint-100 text-app-mint font-bold text-xs flex items-center justify-center">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h5 className="text-xs font-extrabold text-app-text-primary font-sans leading-tight">
                    {selectedClient.name}
                  </h5>
                  <span className="text-[9px] text-emerald-650 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Línea (WhatsApp Web)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-app-gray-500">
                <IconButton variant="neutral" icon={Phone} label="Llamar" />
                <IconButton variant="neutral" icon={Video} label="Video llamada" />
                <IconButton variant="neutral" icon={Info} label="Información" />
              </div>
            </div>

            {/* Conversational timeline */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-sm relative ${
                      isOutbound
                        ? 'bg-app-mint text-white rounded-br-none'
                        : 'bg-white border border-app-gray-200 text-app-text-primary rounded-bl-none'
                    }`}>
                      <p>{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1.5 opacity-75">
                        <span className="text-[8px] block">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                        {isOutbound && <CheckCheck className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-app-gray-150 flex items-center gap-3.5 flex-shrink-0">
              <IconButton variant="neutral" icon={Paperclip} label="Adjuntar" />
              
              <Input
                placeholder="Escribe un mensaje de WhatsApp..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1"
              />

              <IconButton variant="neutral" icon={Smile} label="Emoji" />

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 bg-app-mint hover:bg-app-mint-600 disabled:opacity-50 text-white rounded-xl shadow-md transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <EmptyState
            icon={<MessageSquare />}
            title="Sin conversación seleccionada"
            message="Seleccione una conversación para iniciar."
          />
        )}
      </div>

    </div>
  );
};
