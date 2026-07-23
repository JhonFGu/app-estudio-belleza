import type { User } from '../store/useAppStore';

/**
 * Mapeo de pestañas (tabs) de la aplicación con los IDs de módulos de la matriz de permisos.
 */
export const TAB_TO_MODULE: Record<string, string> = {
  dashboard: 'dashboard',
  pos: 'pos_caja',
  calendar: 'citas',
  crm: 'clientes',
  messages: 'clientes',
  schedule: 'colaboradores',
  collaborators: 'colaboradores',
  users: 'colaboradores', // Usuarios y Accesos
  treatments: 'tratamientos',
  inventory: 'tratamientos',
  history: 'finanzas',
  finance: 'finanzas',
  company: 'configuracion', // Configuración de Empresa
};

/**
 * Verifica si un usuario tiene acceso a una pestaña/módulo según su rol y matriz de permisos.
 */
export function canAccessTab(user: User | null, tabId: string): boolean {
  if (!user) return false;

  // 1. El Administrador tiene acceso total a todos los módulos
  if (user.role === 'admin') return true;

  // 2. Dashboard siempre es visible para cualquier usuario autenticado
  if (tabId === 'dashboard') return true;

  const moduloId = TAB_TO_MODULE[tabId] || tabId;

  // 3. Si el usuario tiene una matriz de permisos personalizada guardada
  if (user.permissions && user.permissions[moduloId]) {
    const modPerms = user.permissions[moduloId];
    if (typeof modPerms.leer === 'boolean') {
      return modPerms.leer;
    }
  }

  // 4. Reglas por defecto según el rol del usuario si no hay override en permissions
  switch (user.role) {
    case 'receptionist':
      // La recepcionista NO tiene acceso a finanzas, historial, gestión de usuarios ni configuración de empresa por defecto
      if (tabId === 'finance' || tabId === 'history' || tabId === 'users' || tabId === 'company') {
        return false;
      }
      return true;

    case 'specialist':
      // El especialista solo ve agenda, clientes, tratamientos, mensajes y su horario
      if (tabId === 'finance' || tabId === 'history' || tabId === 'users' || tabId === 'pos' || tabId === 'collaborators' || tabId === 'company') {
        return false;
      }
      return true;

    case 'accountant':
      // El contador ve finanzas, historial, POS, dashboard y configuración de empresa
      if (tabId === 'calendar' || tabId === 'crm' || tabId === 'treatments' || tabId === 'collaborators' || tabId === 'schedule' || tabId === 'users') {
        return false;
      }
      return true;

    default:
      return false;
  }
}
