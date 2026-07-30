import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Search,
  Plus,
  ShieldAlert,
  Mail,
  User as UserIcon,
  Loader2,
  ChevronDown,
  ChevronRight,
  Save,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { Button, IconButton, Badge, PageHeader, Card, Input } from '../components/ui';

const MODULOS_CLINICA = [
  { id: 'citas', label: 'Agenda y Citas' },
  { id: 'clientes', label: 'CRM Clientes' },
  { id: 'pos_caja', label: 'POS / Caja y Pagos' },
  { id: 'tratamientos', label: 'Tratamientos y Servicios' },
  { id: 'colaboradores', label: 'Colaboradores y Horarios' },
  { id: 'finanzas', label: 'Finanzas e Informes' },
];

const ACCIONES = ['leer', 'crear', 'editar', 'borrar'] as const;

export const UsersPage: React.FC = () => {
  const { currentTenant, currentUser, users: storeUsers, setUsers: setStoreUsers } = useAppStore();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [localPermisos, setLocalPermisos] = useState<any>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 4;

  useEffect(() => {
    fetchUsers();
  }, [currentTenant]);

  useEffect(() => {
    setUsersPage(1);
  }, [searchTerm]);

  const fetchUsers = async () => {
    if (!currentTenant) return;
    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        headers: { 'x-tenant-id': currentTenant.id }
      });

      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
        setStoreUsers(data);
      } else {
        // Fallback to store users if backend fails
        setUsersList(storeUsers);
      }
    } catch (err) {
      console.warn('Error fetching users, using store:', err);
      setUsersList(storeUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetId: string, currentRole: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Solo los administradores pueden cambiar roles.');
      return;
    }

    const rolesList = ['admin', 'receptionist', 'specialist'];
    const currentIndex = rolesList.indexOf(currentRole);
    const newRole = rolesList[(currentIndex + 1) % rolesList.length];

    if (window.confirm(`¿Deseas cambiar el rol de este usuario a "${newRole === 'admin' ? 'Administrador' : newRole === 'receptionist' ? 'Recepción' : 'Especialista'}"?`)) {
      try {
        const response = await fetch(`/api/users?id=${targetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': currentTenant?.id || '',
          },
          body: JSON.stringify({ role: newRole }),
        });

        if (response.ok) {
          setUsersList(usersList.map(u => u.id === targetId ? { ...u, role: newRole } : u));
        } else {
          setUsersList(usersList.map(u => u.id === targetId ? { ...u, role: newRole } : u));
        }
      } catch (err) {
        setUsersList(usersList.map(u => u.id === targetId ? { ...u, role: newRole } : u));
      }
    }
  };

  const handleDelete = async (targetId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Solo los administradores pueden eliminar usuarios.');
      return;
    }

    if (window.confirm('¿Seguro que deseas desvincular a este usuario de la clínica?')) {
      try {
        await fetch(`/api/users?id=${targetId}`, {
          method: 'DELETE',
          headers: { 'x-tenant-id': currentTenant?.id || '' },
        });
      } catch (err) {}
      setUsersList(usersList.filter(u => u.id !== targetId));
    }
  };

  const toggleExpand = (u: any) => {
    if (expandedUserId === u.id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(u.id);
      const p = u.permissions || {};
      const fullPerms: any = {};
      MODULOS_CLINICA.forEach(mod => {
        fullPerms[mod.id] = p[mod.id] || { leer: true, crear: false, editar: false, borrar: false };
      });
      setLocalPermisos(fullPerms);
    }
  };

  const handleTogglePermission = (moduloId: string, accion: string) => {
    setLocalPermisos((prev: any) => ({
      ...prev,
      [moduloId]: {
        ...prev[moduloId],
        [accion]: !prev[moduloId]?.[accion]
      }
    }));
  };

  const handleSavePermissions = async (targetId: string) => {
    setSavingPermissions(true);
    try {
      const response = await fetch(`/api/users?id=${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant?.id || '',
        },
        body: JSON.stringify({ permissions: localPermisos }),
      });

      if (response.ok) {
        setUsersList(usersList.map(u => u.id === targetId ? { ...u, permissions: localPermisos } : u));
        setExpandedUserId(null);
      } else {
        setUsersList(usersList.map(u => u.id === targetId ? { ...u, permissions: localPermisos } : u));
        setExpandedUserId(null);
      }
    } catch (err) {
      setUsersList(usersList.map(u => u.id === targetId ? { ...u, permissions: localPermisos } : u));
      setExpandedUserId(null);
    } finally {
      setSavingPermissions(false);
    }
  };

  const filteredUsers = usersList.filter((u) =>
    (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldCheck />}
        title="Equipo y Permisos"
        subtitle="Administra los accesos, roles y matriz de permisos por módulo en tu clínica."
        actions={
          currentUser?.role === 'admin' ? (
            <Button icon={<Plus />} onClick={() => setIsInviteOpen(true)}>
              Invitar Miembro
            </Button>
          ) : undefined
        }
      />

      {/* Main Table Card */}
      <Card padding={false}>

        {/* Search & Stats Filter */}
        <div className="p-4 sm:p-5 border-b border-app-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-app-gray-50/50">
          <div className="w-full sm:w-80">
            <Input
              icon={<Search />}
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="neutral">Total Colaboradores: {usersList.length}</Badge>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-app-gray-50 text-2xs font-extrabold uppercase tracking-wider text-app-text-secondary border-b border-app-gray-100">
                <th className="px-6 py-3.5">Usuario</th>
                <th className="px-6 py-3.5 hidden md:table-cell">Contacto</th>
                <th className="px-6 py-3.5">Rol</th>
                <th className="px-6 py-3.5 hidden sm:table-cell">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-gray-100 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-app-mint mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-app-gray-500">
                    No se encontraron usuarios o colaboradores registrados.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const roleLabel = u.role === 'admin'
                    ? 'Administrador'
                    : u.role === 'receptionist'
                    ? 'Recepción'
                    : u.role === 'accountant'
                    ? 'Contabilidad'
                    : 'Especialista';

                  const roleVariant: 'admin' | 'info' | 'success' | 'warning' =
                    u.role === 'admin'
                      ? 'admin'
                      : u.role === 'receptionist'
                      ? 'info'
                      : u.role === 'accountant'
                      ? 'warning'
                      : 'success';

  const paginatedUsers = filteredUsers.slice(0, usersPage * USERS_PER_PAGE);
  const hasMoreUsers = paginatedUsers.length < filteredUsers.length;

  return (
                    <tr key={u.id} className="hover:bg-app-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleExpand(u)}
                              className="p-1 hover:bg-app-gray-200 rounded-lg transition-colors text-app-gray-500"
                              title="Configurar matriz de permisos"
                            >
                              {expandedUserId === u.id ? <ChevronDown className="w-4 h-4 text-app-mint" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <div className="w-9 h-9 rounded-full bg-app-mint-100 text-app-mint flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                              {(u.name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-app-text-primary">{u.name || 'Sin Nombre'}</p>
                              <p className="text-[11px] text-app-gray-500 font-medium md:hidden">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 hidden md:table-cell text-app-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-app-gray-500" />
                            <span>{u.email}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={roleVariant} icon={u.role === 'admin' ? <ShieldAlert /> : <UserIcon />}>
                            {roleLabel}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 hidden sm:table-cell">
                          <Badge variant={u.active !== false ? 'success' : 'danger'} dot>
                            {u.active !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {currentUser?.role === 'admin' && u.id !== currentUser.id && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRoleChange(u.id, u.role)}
                              >
                                Cambiar Rol
                              </Button>
                              <IconButton
                                variant="delete"
                                label="Eliminar Colaborador"
                                onClick={() => handleDelete(u.id)}
                              />
                            </div>
                          )}
                          {u.id === currentUser?.id && (
                            <span className="text-xs font-bold text-app-mint italic">Tú (Sesión Actual)</span>
                          )}
                        </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasMoreUsers && (
          <div className="px-5 pb-5 pt-2 flex justify-center">
            <button
              onClick={() => setUsersPage(p => p + 1)}
              className="px-5 py-2.5 bg-app-mint hover:bg-app-mint-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              Ver más ({filteredUsers.length - paginatedUsers.length} restantes)
            </button>
          </div>
        )}

        {/* Expandable Permissions Matrix (fuera de la tabla para evitar overflow-x en mobile) */}
        {expandedUserId && localPermisos && (() => {
          const u = filteredUsers.find(user => user.id === expandedUserId);
          if (!u) return null;
          return (
            <div className="p-5 border-t-2 border-app-mint-100 bg-app-mint-50/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-bold text-app-text-primary text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-app-mint" />
                    Matriz de Permisos por Módulo ({u.name})
                  </h4>
                  <p className="text-sm text-app-text-secondary mt-1">
                    Define qué acciones específicas puede realizar este colaborador en la clínica.
                  </p>
                </div>

                <Button
                  size="sm"
                  icon={<Save />}
                  loading={savingPermissions}
                  onClick={() => handleSavePermissions(u.id)}
                >
                  Guardar Permisos
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULOS_CLINICA.map(mod => (
                  <div key={mod.id} className="bg-white p-4 rounded-xl shadow-xs border border-app-gray-200">
                    <h5 className="font-bold text-app-text-primary text-sm pb-2 border-b border-app-gray-100">
                      {mod.label}
                    </h5>
                    <div className="space-y-2.5 mt-3">
                      {ACCIONES.map(acc => (
                        <label key={acc} className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-medium text-app-text-secondary group-hover:text-app-text-primary">
                            {acc === 'leer' ? 'Ver / Consultar' : acc === 'crear' ? 'Crear Nuevos' : acc === 'editar' ? 'Modificar' : 'Eliminar'}
                          </span>
                          <input
                            type="checkbox"
                            checked={localPermisos[mod.id]?.[acc] || false}
                            onChange={() => handleTogglePermission(mod.id, acc)}
                            className="w-4 h-4 text-app-mint rounded border-app-gray-300 focus:ring-app-mint cursor-pointer accent-emerald-700"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Modal Invitar Miembro */}
      <CreateUserModal 
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
