import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { canAccessTab } from '../utils/permissions';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  UserCheck,
  Clock,
  ShoppingBag,
  Receipt,
  MessageSquare,
  DollarSign,
  Menu,
  X,
  Search,
  Bell,
  Sparkle,
  Store,
  Building2,
  User,
  Package,
  Camera,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Badge, IconButton } from '../components/ui';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const {
    tenants,
    currentTenant,
    currentUser,
    currentTab,
    users,
    setCurrentTenant,
    setCurrentUser,
    setCurrentTab,
    setProfileModalOpen,
    logout,
    isLoading,
  } = useAppStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentTenant) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/tenants', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: currentTenant.id,
              logoUrl: base64,
            }),
          });
          if (res.ok) {
            const updated = await res.json();
            useAppStore.setState({ currentTenant: updated });
          } else {
            alert('Error al guardar el logo de la marca.');
          }
        } catch (err) {
          console.error(err);
          alert('Error de conexión al guardar el logo.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Lista de todos los ítems de navegación
  const allMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', name: 'POS / Caja', icon: ShoppingBag },
    { id: 'calendar', name: 'Citas', icon: Calendar },
    { id: 'crm', name: 'Clientes', icon: Users },
    { id: 'messages', name: 'Mensajes', icon: MessageSquare, badge: 6 },
    { id: 'schedule', name: 'Horarios', icon: Clock },
    { id: 'collaborators', name: 'Colaboradores', icon: UserCheck },
    { id: 'treatments', name: 'Tratamientos', icon: Sparkles },
    { id: 'inventory', name: 'Productos', icon: Package },
    { id: 'history', name: 'Pagos / Facturas', icon: Receipt },
    { id: 'finance', name: 'Finanzas', icon: DollarSign },
    { id: 'users', name: 'Usuarios y Accesos', icon: ShieldCheck },
    { id: 'company', name: 'Configuración', icon: Building2 },
  ];

  // Filtrar menú visible estrictamente según el usuario actual (rol + matriz de permisos)
  const menuItems = allMenuItems.filter((item) => canAccessTab(currentUser, item.id));

  // Mobile navigation shortcuts (first 4 items)
  const mobileShortcuts = menuItems.slice(0, 4);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg">
      {/* 1. SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-app-gray-200 flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-[80px]' : 'w-[210px]'
      }`}>
        {/* Brand Logo & Toggle Header (Height matches app header at 70px) */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 h-[70px] border-b border-app-gray-100 flex-shrink-0`}>
          {!isCollapsed ? (
            <>
              <div className="relative group flex items-center gap-2 max-w-[130px] overflow-hidden">
                {currentTenant?.logoUrl ? (
                  <img
                    src={currentTenant.logoUrl}
                    alt={currentTenant.name}
                    className="max-h-9 object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-app-mint-100 text-app-mint flex items-center justify-center flex-shrink-0">
                      <Sparkle className="w-4 h-4 fill-current" />
                    </div>
                    <h1 className="text-[17px] font-extrabold tracking-tight text-app-text-primary font-sans flex items-center gap-0.5">
                      byutie <span className="text-[9px] text-app-mint font-bold px-1 py-0.2 bg-app-mint-100 rounded-md">Aura</span>
                    </h1>
                  </div>
                )}
                
                {currentUser?.role === 'admin' && (
                  <label
                    htmlFor="tenant-logo-file-input"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg cursor-pointer transition-opacity duration-200 text-white"
                    title="Subir logo de la marca (formato horizontal)"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      id="tenant-logo-file-input"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-app-gray-100 text-app-gray-550 transition-colors ml-auto"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
            </>
          ) : (
            // Only show hamburger icon centered when collapsed
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-app-gray-100 text-app-gray-550 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isCollapsed ? item.name : undefined}
                className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-app-mint-100 text-app-mint'
                    : 'text-app-gray-500 hover:bg-app-gray-50 hover:text-app-text-primary'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-app-mint' : 'text-app-gray-550'}`} />
                  {!isCollapsed && <span className="truncate whitespace-nowrap">{item.name}</span>}
                </div>
                
                {/* Badges */}
                {!isCollapsed && item.badge && (
                  <Badge variant="danger">{String(item.badge)}</Badge>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-app-pink-250 border border-white" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* 2. HEADER TOP */}
        <header className="bg-white border-b border-app-gray-200 h-[70px] flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-app-gray-700 hover:bg-app-gray-50 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <h2 className="text-lg font-extrabold text-app-text-primary font-sans tracking-tight">
              {menuItems.find(item => item.id === currentTab)?.name || 'Dashboard'}
            </h2>
          </div>

          {/* SIMULATION HUB (MULTI-TENANT CONTROL PANEL) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-app-gray-50 px-3 py-1.5 rounded-xl border border-app-gray-200 shadow-sm">
              <Store className="w-3.5 h-3.5 text-app-mint shrink-0" />
              <select
                value={currentTenant?.id || ''}
                onChange={(e) => {
                  const tenant = tenants.find(t => t.id === e.target.value);
                  if (tenant) setCurrentTenant(tenant);
                }}
                className="bg-transparent text-[11px] font-bold text-app-text-primary outline-none cursor-pointer max-w-[160px] truncate"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-app-gray-50 px-3 py-1.5 rounded-xl border border-app-gray-200 shadow-sm">
              <User className="w-3.5 h-3.5 text-app-mint shrink-0" />
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value);
                  if (user) setCurrentUser(user);
                }}
                className="bg-transparent text-[11px] font-bold text-app-text-primary outline-none cursor-pointer max-w-[160px] truncate"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'receptionist' ? 'Recep' : u.role === 'specialist' ? 'Espec' : u.role === 'accountant' ? 'Conta' : u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Circular Buttons: Search & Notifications */}
            <div className="hidden sm:flex items-center gap-1.5">
              <IconButton variant="neutral" icon={Search} label="Buscar" />
              <div className="relative">
                <IconButton variant="neutral" icon={Bell} label="Notificaciones" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-app-pink" />
              </div>
            </div>

            <div className="h-6 w-px bg-app-gray-200 hidden sm:block" />

            {/* Profile Widget */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 hover:bg-app-gray-100 rounded-xl p-1.5 transition-colors cursor-pointer text-left"
              title="Ver Perfil"
            >
              <div className="w-9 h-9 rounded-full bg-app-mint-100 text-app-mint font-bold flex items-center justify-center text-xs shadow-sm">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <h4 className="text-xs font-bold text-app-text-primary">{currentUser?.name || 'Elena Rossi'}</h4>
                <span className="text-[10px] text-app-gray-500 font-semibold uppercase">{currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'receptionist' ? 'Recepción' : 'Especialista'}</span>
              </div>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-2 text-app-gray-500 hover:text-app-pink hover:bg-app-pink-50 rounded-lg transition-colors hidden sm:block"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 3. CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6 relative bg-app-bg">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
                <span className="text-xs font-semibold text-app-text-secondary">Cargando datos aislados...</span>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* 4. MOBILE BOTTOM NAV */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-app-gray-200 flex items-center justify-around h-16 px-2 z-20 shadow-lg">
          {mobileShortcuts.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${
                  isActive ? 'text-app-mint' : 'text-app-gray-500'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">{item.name.split(' ')[0]}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-app-gray-550"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Más</span>
          </button>
        </nav>
      </div>

      {/* 5. MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end md:hidden">
          <div className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full flex flex-col z-10 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-app-gray-200 bg-app-gray-50">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-app-mint fill-current" />
                <span className="font-bold text-app-text-primary">Menú byutie</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-app-gray-550 hover:bg-app-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-app-mint-100 text-app-mint'
                        : 'text-app-gray-500 hover:bg-app-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-app-mint' : 'text-app-gray-500'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
