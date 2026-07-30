import { create } from 'zustand';
import { canAccessTab } from '../utils/permissions';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  nit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  category?: string | null;
  website?: string | null;
  instagram?: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'admin' | 'receptionist' | 'specialist' | 'accountant';
  active: boolean;
  phone?: string;
  permissions?: any;
}

interface AppStore {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  users: User[];
  currentUser: User | null;
  currentTab: string;
  isLoading: boolean;
  isProfileModalOpen: boolean;
  
  pendingPOSItem: { clientId?: string; serviceId?: string; collaboratorId?: string; appointmentId?: string } | null;
  setPendingPOSItem: (item: { clientId?: string; serviceId?: string; collaboratorId?: string; appointmentId?: string } | null) => void;

  appointmentTxFilter: string | null;
  setAppointmentTxFilter: (id: string | null) => void;

  pendingAppointmentDetail: string | null;
  setPendingAppointmentDetail: (id: string | null) => void;

  // Triggers for refreshing data
  refreshTrigger: number;
  triggerRefresh: () => void;

  setTenants: (tenants: Tenant[]) => void;
  setCurrentTenant: (tenant: Tenant) => Promise<void>;
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentTab: (tab: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;

  // Initial load helper
  initialize: () => Promise<void>;

  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; companyName: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  acceptInvite: (data: { tenantId: string; role: string; name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginDemo: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  tenants: [],
  currentTenant: null,
  users: [],
  currentUser: null,
  currentTab: 'dashboard',
  isLoading: false,
  isProfileModalOpen: false,
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  pendingPOSItem: null,
  setPendingPOSItem: (item) => set({ pendingPOSItem: item }),
  appointmentTxFilter: null,
  setAppointmentTxFilter: (id) => set({ appointmentTxFilter: id }),
  pendingAppointmentDetail: null,
  setPendingAppointmentDetail: (id) => set({ pendingAppointmentDetail: id }),
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  setTenants: (tenants) => set({ tenants }),
  setCurrentTenant: async (tenant) => {
    set({ currentTenant: tenant, currentTab: 'dashboard' });

    try {
      const res = await fetch('/api/users', {
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          set({ users: list, currentUser: list[0] });
          get().triggerRefresh();
          return;
        }
      }
    } catch (e) {}

    // Default Fallback
    const mockUsers: User[] = [
      {
        id: tenant.slug === 'beaute-spa' ? 'ddc58106-9842-412b-89f5-4c954b8002a1' : 'c90a6853-2a1d-4dcc-915c-a3e5ceff6c00',
        tenantId: tenant.id,
        name: tenant.slug === 'beaute-spa' ? 'Elena Rossi (Administradora)' : 'Carlos Sanchez (Admin)',
        email: tenant.slug === 'beaute-spa' ? 'admin@beaute.com' : 'admin@hairglam.com',
        role: 'admin',
        active: true
      },
      {
        id: tenant.slug === 'beaute-spa' ? '36b4b074-1196-4b37-9a27-f74b81f8b94c' : '2538166d-7d2c-446b-b30d-172bec05fe48',
        tenantId: tenant.id,
        name: tenant.slug === 'beaute-spa' ? 'Camila Díaz' : 'Valeria Luna',
        email: tenant.slug === 'beaute-spa' ? 'recepcion@beaute.com' : 'recepcion@hairglam.com',
        role: 'receptionist',
        active: true
      },
      {
        id: tenant.slug === 'beaute-spa' ? '9b01627b-2840-46d9-a592-83bca9ddbbcb' : 'c99fd68f-6219-4885-a3fc-ebd7fe757f02',
        tenantId: tenant.id,
        name: tenant.slug === 'beaute-spa' ? 'Elena Rossi' : 'Carlos Sanchez',
        email: tenant.slug === 'beaute-spa' ? 'elena@beaute.com' : 'carlos@hairglam.com',
        role: 'specialist',
        active: true
      },
      {
        id: tenant.slug === 'beaute-spa' ? 'dbdb4be7-0231-4ab7-a1e4-cb546b13c943' : '056477cd-c424-4f12-89db-fef2cc88e376',
        tenantId: tenant.id,
        name: tenant.slug === 'beaute-spa' ? 'Sofia Mendez' : 'Ana Maria Ortiz',
        email: tenant.slug === 'beaute-spa' ? 'sofia@beaute.com' : 'ana@hairglam.com',
        role: 'specialist',
        active: true
      }
    ];

    set({ 
      users: mockUsers, 
      currentUser: mockUsers[0] 
    });
    
    get().triggerRefresh();
  },
  setUsers: (users) => {
    set({ users });
    const current = get().currentUser;
    if (current) {
      const updatedCurrent = users.find(u => u.id === current.id);
      if (updatedCurrent) {
        set({ currentUser: updatedCurrent });
      }
    }
  },
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user && !canAccessTab(user, get().currentTab)) {
      set({ currentTab: 'dashboard' });
    }
  },
  setCurrentTab: (tab) => {
    const user = get().currentUser;
    if (!user || canAccessTab(user, tab)) {
      set({ currentTab: tab });
    } else {
      set({ currentTab: 'dashboard' });
    }
  },
  setIsLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    const savedSession = localStorage.getItem('aura_session');
    if (savedSession) {
      try {
        const { userId, tenantId } = JSON.parse(savedSession);
        set({ isLoading: true });
        const usersRes = await fetch('/api/users', {
          headers: { 'x-tenant-id': tenantId }
        });
        if (usersRes.ok) {
          const userList = await usersRes.json();
          const found = userList.find((u: any) => u.id === userId);
          if (found) {
            const tenantsRes = await fetch('/api/tenants');
            if (tenantsRes.ok) {
              const tenantList = await tenantsRes.json();
              const tenant = tenantList.find((t: any) => t.id === tenantId);
              set({ tenants: tenantList, currentTenant: tenant || null, users: userList, currentUser: found, isLoading: false });
              get().triggerRefresh();
              return;
            }
          }
        }
      } catch (e) {
        localStorage.removeItem('aura_session');
      }
    }

    // Default init (demo fallback)
    set({ isLoading: true });
    try {
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Error al cargar salones');
      const tenantList = await response.json();
      set({ tenants: tenantList });
      if (tenantList.length > 0) {
        const defaultTenant = tenantList[0];
        get().setCurrentTenant(defaultTenant);
      }
    } catch (error) {
      console.error('Error al inicializar app store:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const err = await res.json(); return { success: false, error: err.error || 'Credenciales inválidas.' }; }
      const data = await res.json();
      set({ currentTenant: data.tenant, currentUser: data.user });
      localStorage.setItem('aura_session', JSON.stringify({ userId: data.user.id, tenantId: data.tenant?.id }));
      get().triggerRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  register: async (data) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); return { success: false, error: err.error || 'Error al registrar.' }; }
      const result = await res.json();
      set({ currentTenant: result.tenant, currentUser: result.user, tenants: [result.tenant] });
      localStorage.setItem('aura_session', JSON.stringify({ userId: result.user.id, tenantId: result.tenant.id }));
      get().triggerRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  acceptInvite: async (data) => {
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); return { success: false, error: err.error || 'Error al aceptar invitación.' }; }
      const result = await res.json();
      set({ currentUser: result.user });
      localStorage.setItem('aura_session', JSON.stringify({ userId: result.user.id, tenantId: data.tenantId }));
      get().triggerRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  loginDemo: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/tenants');
      if (response.ok) {
        const tenantList = await response.json();
        const demoTenant = tenantList.find((t: any) => t.slug === 'beaute-spa') || tenantList[0];
        if (demoTenant) {
          get().setCurrentTenant(demoTenant);
          localStorage.setItem('aura_session', JSON.stringify({
            userId: demoTenant.slug === 'beaute-spa' ? 'ddc58106-9842-412b-89f5-4c954b8002a1' : 'demo-user',
            tenantId: demoTenant.id,
            isDemo: true,
          }));
          set({ isLoading: false });
          return;
        }
      }
      console.error('No se encontraron tenants en el backend. Verifica DATABASE_URL.');
    } catch (error) {
      console.error('Error al cargar demo. Verifica que el backend esté funcionando:', error);
    }
    set({ isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('aura_session');
    set({ currentTenant: null, currentUser: null, users: [], tenants: [] });
  },
}));
