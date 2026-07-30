import { addDays, subDays, setHours, setMinutes } from 'date-fns';

// In-memory/LocalStorage database to simulate Neon.tech on client-side
const SEED_KEY = 'aura_mock_db_seeded_v5';

export function setupMockFetch() {
  // Check if we already seeded the local storage
  if (!localStorage.getItem(SEED_KEY)) {
    seedLocalStorage();
  }

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    
    // Parse URL safely
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlString, window.location.origin);
    } catch (e) {
      return originalFetch(input, init);
    }

    const path = parsedUrl.pathname;

    // Only intercept local API routes
    if (!path.startsWith('/api')) {
      return originalFetch(input, init);
    }

    // Try sending to the real backend first. If it fails, returns error or HTML (Vite fallback), we fallback to mock.
    try {
      const realResponse = await originalFetch(input, init);
      if (realResponse.ok) {
        const contentType = realResponse.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          return realResponse;
        }
      } else {
        console.warn(`Real backend returned status ${realResponse.status}, falling back to mock database.`);
      }
    } catch (e) {
      console.warn('Real backend fetch failed, using local mock database:', e);
    }

    // Intercepted Mock Handler
    const tenantId = init?.headers ? (init.headers as any)['x-tenant-id'] : null;
    const method = init?.method || 'GET';
    const queryId = parsedUrl.searchParams.get('id');
    const queryClientId = parsedUrl.searchParams.get('clientId');
    const queryCollabId = parsedUrl.searchParams.get('collaboratorId');
    const queryAppointmentId = parsedUrl.searchParams.get('appointmentId');

    let bodyData: any = {};
    if (init?.body) {
      try {
        bodyData = JSON.parse(init.body as string);
      } catch (err) {}
    }

    // Helper to get/set tables from localStorage
    const getTable = (name: string) => JSON.parse(localStorage.getItem(`aura_${name}`) || '[]');
    const setTable = (name: string, data: any[]) => localStorage.setItem(`aura_${name}`, JSON.stringify(data));

    // Mock password helpers (client-side compatible)
    const mockHashPassword = (pwd: string): string => {
      const salt = 'aura-beauty-salt-2026';
      let combined = pwd + salt;
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      const abs = Math.abs(hash).toString(16);
      return abs.padEnd(64, abs).substring(0, 64);
    };
    const mockVerifyPassword = (pwd: string, h: string): boolean => mockHashPassword(pwd) === h;

    // MOCK ENDPOINTS
    try {
      // --- AUTH ENDPOINTS ---
      if (path === '/api/auth/register' && method === 'POST') {
        const { name, companyName, email, password } = bodyData;
        if (!name || !companyName || !email || !password) {
          return createMockResponse({ error: 'Nombre, empresa, correo y contraseña son obligatorios.' }, 400);
        }
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
        const tenantList = getTable('tenants');
        const newTenant = { id: 'tenant-mock-' + Date.now(), name: companyName, slug, createdAt: new Date().toISOString() };
        setTable('tenants', [...tenantList, newTenant]);

        const passwordHash = mockHashPassword(password);
        const userList = getTable('users');
        const newUser = {
          id: 'user-mock-' + Date.now(),
          tenantId: newTenant.id,
          name,
          email,
          passwordHash,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString()
        };
        setTable('users', [...userList, newUser]);
        const { passwordHash: _, ...safeUser } = newUser;
        return createMockResponse({ user: safeUser, tenant: newTenant }, 201);
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = bodyData;
        if (!email || !password) {
          return createMockResponse({ error: 'Correo y contraseña son obligatorios.' }, 400);
        }
        const allUsers = getTable('users');
        const found = allUsers.find((u: any) => u.email === email && u.passwordHash && mockVerifyPassword(password, u.passwordHash));
        if (!found) {
          return createMockResponse({ error: 'Credenciales inválidas.' }, 401);
        }
        const tenantList = getTable('tenants');
        const tenant = tenantList.find((t: any) => t.id === found.tenantId) || null;
        const { passwordHash: _, ...safeUser } = found;
        return createMockResponse({ user: safeUser, tenant }, 200);
      }

      if (path === '/api/auth/invite' && method === 'POST') {
        const { tenantId, role, name, email, password } = bodyData;
        if (!tenantId || !role || !name || !email || !password) {
          return createMockResponse({ error: 'Faltan datos obligatorios.' }, 400);
        }
        const passwordHash = mockHashPassword(password);
        const userList = getTable('users');
        const newUser = {
          id: 'user-mock-' + Date.now(),
          tenantId,
          name,
          email,
          passwordHash,
          role,
          active: true,
          createdAt: new Date().toISOString()
        };
        setTable('users', [...userList, newUser]);
        const { passwordHash: _, ...safeUser } = newUser;
        return createMockResponse({ user: safeUser }, 201);
      }

      // 1. TENANTS
      if (path === '/api/tenants') {
        const list = getTable('tenants');
        if (method === 'PUT') {
          const { id, logoUrl, name, nit, phone, email, address, city, country, currency, category, website, instagram } = bodyData;
          const updatedList = list.map((t: any) => t.id === id ? {
            ...t,
            ...(logoUrl !== undefined && { logoUrl }),
            ...(name !== undefined && { name }),
            ...(nit !== undefined && { nit }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(country !== undefined && { country }),
            ...(currency !== undefined && { currency }),
            ...(category !== undefined && { category }),
            ...(website !== undefined && { website }),
            ...(instagram !== undefined && { instagram }),
          } : t);
          setTable('tenants', updatedList);
          const updatedItem = updatedList.find((t: any) => t.id === id);
          return createMockResponse(updatedItem, 200);
        }
        return createMockResponse(list, 200);
      }

      // 1.5 USERS
      if (path === '/api/users') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('users').filter((u: any) => u.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const u = list.find((item: any) => item.id === queryId);
            if (u) { const { passwordHash: _, ...safe } = u; return createMockResponse(safe, 200); }
            return createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list.map((u: any) => { const { passwordHash: _, ...safe } = u; return safe; }), 200);
        }

        if (method === 'POST') {
          const all = getTable('users');
          const newUser: any = {
            id: `user-${Date.now()}`,
            tenantId,
            name: bodyData.name,
            email: bodyData.email,
            passwordHash: bodyData.password ? mockHashPassword(bodyData.password) : 'hashed_dummy_pass',
            role: bodyData.role || 'specialist',
            phone: bodyData.phone || null,
            active: bodyData.active !== undefined ? bodyData.active : true,
            permissions: bodyData.permissions || null,
            createdAt: new Date().toISOString()
          };
          all.push(newUser);
          setTable('users', all);
          const { passwordHash: _, ...safe } = newUser;
          return createMockResponse(safe, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('users');
          const updated = all.map((u: any) =>
            u.id === queryId && u.tenantId === tenantId ? { ...u, ...bodyData } : u
          );
          setTable('users', updated);
          const saved = updated.find((u: any) => u.id === queryId);
          if (saved) { const { passwordHash: _, ...safe } = saved; return createMockResponse(safe, 200); }
          return createMockResponse({ error: 'User not found' }, 404);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('users');
          const filtered = all.filter((u: any) => !(u.id === queryId && u.tenantId === tenantId));
          setTable('users', filtered);
          return createMockResponse({ message: 'User deleted successfully' }, 200);
        }
      }

      // 2. CLIENTS
      if (path === '/api/clients') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('clients').filter((c: any) => c.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const client = list.find((c: any) => c.id === queryId);
            return client ? createMockResponse(client, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const all = getTable('clients');
          const newClient = {
            id: `client-${Date.now()}`,
            tenantId,
            name: bodyData.name,
            email: bodyData.email || null,
            phone: bodyData.phone,
            notes: bodyData.notes || null,
            createdAt: new Date().toISOString()
          };
          all.push(newClient);
          setTable('clients', all);
          return createMockResponse(newClient, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('clients');
          const updated = all.map((c: any) =>
            c.id === queryId && c.tenantId === tenantId ? { ...c, ...bodyData } : c
          );
          setTable('clients', updated);
          const saved = updated.find((c: any) => c.id === queryId);
          return saved
            ? createMockResponse(saved, 200)
            : createMockResponse({ error: 'Not found' }, 404);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('clients');
          const filtered = all.filter((c: any) => !(c.id === queryId && c.tenantId === tenantId));
          setTable('clients', filtered);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 3. COLLABORATORS
      if (path === '/api/collaborators') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('collaborators').filter((c: any) => c.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const colab = list.find((c: any) => c.id === queryId);
            return colab ? createMockResponse(colab, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const all = getTable('collaborators');
          const newColab = {
            id: `colab-${Date.now()}`,
            tenantId,
            name: bodyData.name,
            email: bodyData.email || null,
            phone: bodyData.phone,
            specialties: bodyData.specialties || [],
            avatarUrl: bodyData.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(bodyData.name)}`,
            active: true,
            createdAt: new Date().toISOString()
          };
          all.push(newColab);
          setTable('collaborators', all);
          return createMockResponse(newColab, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('collaborators');
          const idx = all.findIndex((c: any) => c.id === queryId && c.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Not found' }, 404);
          all[idx] = { ...all[idx], ...bodyData };
          setTable('collaborators', all);
          return createMockResponse(all[idx], 200);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('collaborators');
          const filtered = all.filter((c: any) => !(c.id === queryId && c.tenantId === tenantId));
          setTable('collaborators', filtered);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 4. SERVICES
      if (path === '/api/services') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('services').filter((s: any) => s.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const svc = list.find((s: any) => s.id === queryId);
            return svc ? createMockResponse(svc, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const all = getTable('services');
          const newSvc = {
            id: `svc-${Date.now()}`,
            tenantId,
            name: bodyData.name,
            description: bodyData.description || null,
            duration: bodyData.duration,
            price: bodyData.price,
            active: true,
            createdAt: new Date().toISOString()
          };
          all.push(newSvc);
          setTable('services', all);
          return createMockResponse(newSvc, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('services');
          const idx = all.findIndex((s: any) => s.id === queryId && s.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Servicio no encontrado.' }, 404);
          all[idx] = {
            ...all[idx],
            name: bodyData.name,
            description: bodyData.description || null,
            duration: bodyData.duration,
            price: parseFloat(bodyData.price).toFixed(2),
          };
          setTable('services', all);
          return createMockResponse(all[idx], 200);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('services');
          const filtered = all.filter((s: any) => !(s.id === queryId && s.tenantId === tenantId));
          setTable('services', filtered);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 4b. COMMISSION RULES
      if (path === '/api/commission-rules') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allRules = getTable('commission_rules').filter((r: any) => r.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const rule = allRules.find((r: any) => r.id === queryId);
            if (!rule) return createMockResponse({ error: 'Not found' }, 404);
            const collab = getTable('collaborators').find((c: any) => c.id === rule.collaboratorId);
            const svc = getTable('services').find((s: any) => s.id === rule.serviceId);
            const prod = getTable('products').find((p: any) => p.id === rule.productId);
            return createMockResponse({ ...rule, collaborator: collab || null, service: svc || null, product: prod || null }, 200);
          }
          const enriched = allRules.map((r: any) => {
            const collab = getTable('collaborators').find((c: any) => c.id === r.collaboratorId);
            const svc = getTable('services').find((s: any) => s.id === r.serviceId);
            const prod = getTable('products').find((p: any) => p.id === r.productId);
            return { ...r, collaborator: collab || null, service: svc || null, product: prod || null };
          });
          return createMockResponse(enriched, 200);
        }

        if (method === 'POST') {
          const all = getTable('commission_rules');
          const newRule = {
            id: `rule-${Date.now()}`,
            tenantId,
            collaboratorId: bodyData.collaboratorId,
            serviceId: bodyData.serviceId || null,
            productId: bodyData.productId || null,
            commissionRate: bodyData.commissionRate,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          all.push(newRule);
          setTable('commission_rules', all);
          const collab = getTable('collaborators').find((c: any) => c.id === newRule.collaboratorId);
          const svc = getTable('services').find((s: any) => s.id === newRule.serviceId);
          const prod = getTable('products').find((p: any) => p.id === newRule.productId);
          return createMockResponse({ ...newRule, collaborator: collab || null, service: svc || null, product: prod || null }, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('commission_rules');
          const idx = all.findIndex((r: any) => r.id === queryId && r.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Not found' }, 404);
          if (bodyData.commissionRate !== undefined) all[idx].commissionRate = bodyData.commissionRate;
          if (bodyData.isActive !== undefined) all[idx].isActive = bodyData.isActive;
          setTable('commission_rules', all);
          const collab = getTable('collaborators').find((c: any) => c.id === all[idx].collaboratorId);
          const svc = getTable('services').find((s: any) => s.id === all[idx].serviceId);
          const prod = getTable('products').find((p: any) => p.id === all[idx].productId);
          return createMockResponse({ ...all[idx], collaborator: collab || null, service: svc || null, product: prod || null }, 200);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('commission_rules');
          const filtered = all.filter((r: any) => !(r.id === queryId && r.tenantId === tenantId));
          setTable('commission_rules', filtered);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 4c. COMMISSION LIQUIDATIONS
      if (path === '/api/commission-liquidations') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allLiqs = getTable('commission_liquidations').filter((l: any) => l.tenantId === tenantId);

        if (method === 'GET') {
          const actionParam = parsedUrl.searchParams.get('action');
          if (actionParam === 'pending') {
            const collaboratorIdParam = parsedUrl.searchParams.get('collaboratorId');
            const periodStart = parsedUrl.searchParams.get('periodStart');
            const periodEnd = parsedUrl.searchParams.get('periodEnd');

            if (!collaboratorIdParam) return createMockResponse({ error: 'Missing collaboratorId' }, 400);

            let items = getTable('transaction_items').filter((i: any) => i.collaboratorId === collaboratorIdParam);
            const allTrans = getTable('transactions');
            const allServices = getTable('services');
            const allProducts = getTable('products');

            const enriched = items
              .map((i: any) => {
                const trans = allTrans.find((t: any) => t.id === i.transactionId && t.tenantId === tenantId && t.type === 'sale');
                if (!trans) return null;
                if (periodStart && new Date(trans.createdAt) < new Date(periodStart)) return null;
                if (periodEnd && new Date(trans.createdAt) > new Date(periodEnd + 'T23:59:59')) return null;
                const svc = allServices.find((s: any) => s.id === i.serviceId);
                const prod = allProducts.find((p: any) => p.id === i.productId);
                return {
                  ...i,
                  serviceName: svc?.name || null,
                  productName: prod?.name || null,
                  createdAt: trans.createdAt,
                  transactionId: trans.id,
                };
              })
              .filter(Boolean)
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return createMockResponse(enriched, 200);
          }

          if (queryId) {
            const liq = allLiqs.find((l: any) => l.id === queryId);
            if (!liq) return createMockResponse({ error: 'Not found' }, 404);
            const collab = getTable('collaborators').find((c: any) => c.id === liq.collaboratorId);
            const items = getTable('commission_liquidation_items').filter((i: any) => i.liquidationId === queryId);
            return createMockResponse({ ...liq, collaborator: collab || null, items }, 200);
          }
          const enriched = allLiqs.map((l: any) => {
            const collab = getTable('collaborators').find((c: any) => c.id === l.collaboratorId);
            const items = getTable('commission_liquidation_items').filter((i: any) => i.liquidationId === l.id);
            return { ...l, collaborator: collab || null, items };
          });
          return createMockResponse(enriched, 200);
        }

        if (method === 'POST') {
          const { collaboratorId, periodStart, periodEnd, notes, transactionItemIds } = bodyData;
          if (!collaboratorId || !periodStart || !periodEnd || !transactionItemIds?.length) {
            return createMockResponse({ error: 'Missing required fields' }, 400);
          }

          let totalAmount = 0;
          const liqItems: any[] = [];
          const allRules = getTable('commission_rules').filter((r: any) => r.tenantId === tenantId);

          for (const tiId of transactionItemIds) {
            const ti = getTable('transaction_items').find((i: any) => i.id === tiId);
            if (!ti || ti.collaboratorId !== collaboratorId) continue;

            let appliedRate = '0.00';
            if (ti.serviceId) {
              const rule = allRules.find((r: any) => r.collaboratorId === collaboratorId && r.serviceId === ti.serviceId && r.isActive);
              if (rule) appliedRate = rule.commissionRate;
            } else if (ti.productId) {
              const rule = allRules.find((r: any) => r.collaboratorId === collaboratorId && r.productId === ti.productId && r.isActive);
              if (rule) appliedRate = rule.commissionRate;
            }

            const amount = parseFloat(ti.commissionPaid || '0');
            totalAmount += amount;
            liqItems.push({
              id: `liqitem-${Date.now()}-${Math.random()}`,
              liquidationId: '',
              transactionItemId: tiId,
              commissionAmount: amount.toFixed(2),
              appliedRate,
              createdAt: new Date().toISOString()
            });
          }

          const all = getTable('commission_liquidations');
          const newLiq = {
            id: `liq-${Date.now()}`,
            tenantId,
            collaboratorId,
            periodStart,
            periodEnd,
            totalAmount: totalAmount.toFixed(2),
            status: 'draft',
            notes: notes || null,
            paidAt: null,
            createdAt: new Date().toISOString()
          };
          all.push(newLiq);
          setTable('commission_liquidations', all);

          liqItems.forEach((item: any) => { item.liquidationId = newLiq.id; });
          const allItems = getTable('commission_liquidation_items');
          allItems.push(...liqItems);
          setTable('commission_liquidation_items', allItems);

          const collab = getTable('collaborators').find((c: any) => c.id === newLiq.collaboratorId);
          return createMockResponse({ ...newLiq, collaborator: collab || null, items: liqItems }, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('commission_liquidations');
          const idx = all.findIndex((l: any) => l.id === queryId && l.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Not found' }, 404);
          if (bodyData.status !== undefined) all[idx].status = bodyData.status;
          if (bodyData.notes !== undefined) all[idx].notes = bodyData.notes;

          if (bodyData.status === 'paid') {
            all[idx].paidAt = new Date().toISOString();

            const collab = getTable('collaborators').find((c: any) => c.id === all[idx].collaboratorId);
            const registers = getTable('cash_registers');
            const activeRegister = registers.find((r: any) => r.tenantId === tenantId && r.status === 'open');

            const periodStart = new Date(all[idx].periodStart);
            const periodEnd = new Date(all[idx].periodEnd);
            const periodStr = `${periodStart.toLocaleDateString('es-CO')} al ${periodEnd.toLocaleDateString('es-CO')}`;

            const allTrans = getTable('transactions');
            allTrans.push({
              id: `exp-${Date.now()}`,
              tenantId,
              cashRegisterId: activeRegister?.id || null,
              clientId: null,
              appointmentId: null,
              type: 'expense',
              amount: all[idx].totalAmount,
              paidAmount: all[idx].totalAmount,
              pendingBalance: '0.00',
              status: 'completed',
              paymentMethod: bodyData.paymentMethod || 'cash',
              description: `Liquidación comisiones - ${collab?.name || 'Colaborador'} - ${periodStr}`,
              createdAt: new Date().toISOString(),
            });
            setTable('transactions', allTrans);
          }

          setTable('commission_liquidations', all);
          const collab = getTable('collaborators').find((c: any) => c.id === all[idx].collaboratorId);
          const items = getTable('commission_liquidation_items').filter((i: any) => i.liquidationId === queryId);
          return createMockResponse({ ...all[idx], collaborator: collab || null, items }, 200);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('commission_liquidations');
          const filtered = all.filter((l: any) => !(l.id === queryId && l.tenantId === tenantId));
          setTable('commission_liquidations', filtered);
          const allItems = getTable('commission_liquidation_items');
          const filteredItems = allItems.filter((i: any) => i.liquidationId !== queryId);
          setTable('commission_liquidation_items', filteredItems);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 5. APPOINTMENTS
      if (path === '/api/appointments') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allApps = getTable('appointments');
        let allClients = getTable('clients');
        let allColabs = getTable('collaborators');
        let allServices = getTable('services');

        if (method === 'GET') {
          // Join with client, specialist, service
          const listJoined = allApps
            .filter((a: any) => a.tenantId === tenantId)
            .map((app: any) => ({
              ...app,
              client: allClients.find((c: any) => c.id === app.clientId) || { name: 'Desconocido' },
              specialist: allColabs.find((c: any) => c.id === app.specialistId) || { name: 'Desconocido' },
              service: allServices.find((s: any) => s.id === app.serviceId) || { name: 'Desconocido', price: '0.00' }
            }));
          
          if (queryId) {
            const app = listJoined.find((a: any) => a.id === queryId);
            return app ? createMockResponse(app, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(listJoined, 200);
        }

        if (method === 'POST') {
          const newApp = {
            id: `app-${Date.now()}`,
            tenantId,
            clientId: bodyData.clientId,
            specialistId: bodyData.specialistId,
            serviceId: bodyData.serviceId,
            startTime: bodyData.startTime,
            endTime: bodyData.endTime,
            status: bodyData.status || 'scheduled',
            notes: bodyData.notes || null,
            createdAt: new Date().toISOString()
          };
          allApps.push(newApp);
          setTable('appointments', allApps);
          return createMockResponse(newApp, 201);
        }

        if (method === 'PUT' && queryId) {
          const updated = allApps.map((a: any) => {
            if (a.id === queryId && a.tenantId === tenantId) {
              return { ...a, ...bodyData };
            }
            return a;
          });
          setTable('appointments', updated);
          return createMockResponse({ success: true }, 200);
        }

        if (method === 'DELETE' && queryId) {
          const filtered = allApps.filter((a: any) => !(a.id === queryId && a.tenantId === tenantId));
          setTable('appointments', filtered);
          return createMockResponse({ success: true }, 200);
        }
      }

      // 6. TRANSACTIONS
      if (path === '/api/transactions') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allTrans = getTable('transactions');
        let allClients = getTable('clients');
        let allServices = getTable('services');
        let allColabs = getTable('collaborators');
        let allProducts = getTable('products');
        let allItems = getTable('transaction_items');

        if (method === 'GET') {
          const listJoined = allTrans
            .filter((t: any) => t.tenantId === tenantId)
            .map((t: any) => ({
              ...t,
              client: allClients.find((c: any) => c.id === t.clientId) || null,
              items: allItems
                .filter((item: any) => item.transactionId === t.id)
                .map((item: any) => ({
                  ...item,
                  service: allServices.find((s: any) => s.id === item.serviceId),
                  product: allProducts.find((p: any) => p.id === item.productId),
                  collaborator: allColabs.find((c: any) => c.id === item.collaboratorId)
                }))
            }));

          if (queryId) {
            const trans = listJoined.find((t: any) => t.id === queryId);
            return trans ? createMockResponse(trans, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          if (queryAppointmentId) {
            const filtered = listJoined.filter((t: any) => t.appointmentId === queryAppointmentId);
            return createMockResponse(filtered, 200);
          }
          return createMockResponse(listJoined, 200);
        }

        if (method === 'POST') {
          const newTransId = `trans-${Date.now()}`;
          const newTrans = {
            id: newTransId,
            tenantId,
            clientId: bodyData.clientId || null,
            appointmentId: bodyData.appointmentId || null,
            type: bodyData.type,
            amount: bodyData.amount,
            paymentMethod: bodyData.paymentMethod || null,
            description: bodyData.description || null,
            createdAt: new Date().toISOString()
          };

          allTrans.push(newTrans);
          setTable('transactions', allTrans);

          // Save transaction items and calculate comisiones if type = 'sale'
          if (bodyData.type === 'sale' && bodyData.items) {
            const localItems = getTable('transaction_items');
            for (const item of bodyData.items) {
              const allRules = getTable('commission_rules').filter((r: any) => r.tenantId === tenantId);
              let rate = '0.00';
              if (item.collaboratorId) {
                const matchingRule = allRules.find((r: any) =>
                  r.collaboratorId === item.collaboratorId &&
                  r.isActive &&
                  ((item.serviceId && r.serviceId === item.serviceId) || (item.productId && r.productId === item.productId))
                );
                if (matchingRule) rate = matchingRule.commissionRate;
              }
              const commissionPaid = (Number(item.unitPrice) * Number(item.quantity) * (Number(rate) / 100)).toFixed(2);

              localItems.push({
                id: `item-${Math.random()}`,
                transactionId: newTransId,
                serviceId: item.serviceId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                collaboratorId: item.collaboratorId,
                commissionPaid
              });
            }
            setTable('transaction_items', localItems);

            // Also complete the appointment if linked
            if (bodyData.appointmentId) {
              const allApps = getTable('appointments');
              const updatedApps = allApps.map((a: any) => {
                if (a.id === bodyData.appointmentId) {
                  return { ...a, status: 'completed' };
                }
                return a;
              });
              setTable('appointments', updatedApps);
            }
          }

          return createMockResponse(newTrans, 201);
        }
      }

      // 7. MESSAGES
      if (path === '/api/messages') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allMsgs = getTable('messages');

        if (method === 'GET') {
          if (queryClientId) {
            const list = allMsgs.filter((m: any) => m.clientId === queryClientId && m.tenantId === tenantId);
            return createMockResponse(list, 200);
          }
          const list = allMsgs.filter((m: any) => m.tenantId === tenantId);
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const newMsg = {
            id: `msg-${Date.now()}`,
            tenantId,
            clientId: bodyData.clientId,
            direction: bodyData.direction,
            content: bodyData.content,
            channel: bodyData.channel || 'whatsapp',
            status: bodyData.status || 'sent',
            createdAt: new Date().toISOString()
          };
          allMsgs.push(newMsg);
          setTable('messages', allMsgs);
          return createMockResponse(newMsg, 201);
        }
      }

      // 8. SCHEDULES
      if (path === '/api/schedules') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let allSchedules = getTable('collaborator_schedules');

        if (method === 'GET') {
          if (queryCollabId) {
            const list = allSchedules.filter((s: any) => s.collaboratorId === queryCollabId && s.tenantId === tenantId);
            return createMockResponse(list, 200);
          }
          const list = allSchedules.filter((s: any) => s.tenantId === tenantId);
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          let all = getTable('collaborator_schedules');
          const inputSchedules = bodyData.schedules;
          
          if (Array.isArray(inputSchedules)) {
            for (const item of inputSchedules) {
              // Delete duplicate matching colabId, dayOfWeek AND week (if specified)
              all = all.filter((s: any) => {
                if (item.week) {
                  return !(s.collaboratorId === item.collaboratorId && s.dayOfWeek === item.dayOfWeek && s.week === item.week && s.tenantId === tenantId);
                }
                return !(s.collaboratorId === item.collaboratorId && s.dayOfWeek === item.dayOfWeek && !s.week && s.tenantId === tenantId);
              });

              all.push({
                id: `sched-${Math.random()}`,
                tenantId,
                collaboratorId: item.collaboratorId,
                dayOfWeek: item.dayOfWeek,
                week: item.week || null,
                startTime: item.startTime,
                endTime: item.endTime,
                isActive: item.isActive
              });
            }
            setTable('collaborator_schedules', all);
          }
          return createMockResponse(inputSchedules, 200);
        }
      }

      // 8.5 ACCOUNTS PAYABLE
      if (path === '/api/accounts-payable') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('accounts_payable').filter((ap: any) => ap.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const item = list.find((ap: any) => ap.id === queryId);
            return item ? createMockResponse(item, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const all = getTable('accounts_payable');
          const newItem = {
            id: `ap-${Date.now()}`,
            tenantId,
            invoiceNumber: bodyData.invoiceNumber || null,
            description: bodyData.description,
            category: bodyData.category,
            totalValue: String(bodyData.totalValue),
            status: bodyData.status || 'pending',
            documentUrl: bodyData.documentUrl || null,
            createdAt: bodyData.createdAt ? new Date(bodyData.createdAt).toISOString() : new Date().toISOString()
          };
          all.push(newItem);
          setTable('accounts_payable', all);
          return createMockResponse(newItem, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('accounts_payable');
          const updated = all.map((ap: any) =>
            ap.id === queryId && ap.tenantId === tenantId ? { ...ap, ...bodyData, totalValue: bodyData.totalValue ? String(bodyData.totalValue) : ap.totalValue } : ap
          );
          setTable('accounts_payable', updated);
          const saved = updated.find((ap: any) => ap.id === queryId);
          return saved
            ? createMockResponse(saved, 200)
            : createMockResponse({ error: 'Not found' }, 404);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('accounts_payable');
          const filtered = all.filter((ap: any) => !(ap.id === queryId && ap.tenantId === tenantId));
          setTable('accounts_payable', filtered);
          return createMockResponse({ message: 'Deleted successfully' }, 200);
        }
      }

      // 8.6 ACCOUNTS RECEIVABLE
      if (path === '/api/accounts-receivable') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('accounts_receivable').filter((ar: any) => ar.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const item = list.find((ar: any) => ar.id === queryId);
            return item ? createMockResponse(item, 200) : createMockResponse({ error: 'Not found' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          const all = getTable('accounts_receivable');
          const newItem = {
            id: `ar-${Date.now()}`,
            tenantId,
            invoiceNumber: bodyData.invoiceNumber || null,
            description: bodyData.description,
            category: bodyData.category,
            totalValue: String(bodyData.totalValue),
            status: bodyData.status || 'pending',
            documentUrl: bodyData.documentUrl || null,
            createdAt: bodyData.createdAt ? new Date(bodyData.createdAt).toISOString() : new Date().toISOString()
          };
          all.push(newItem);
          setTable('accounts_receivable', all);
          return createMockResponse(newItem, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('accounts_receivable');
          const updated = all.map((ar: any) =>
            ar.id === queryId && ar.tenantId === tenantId ? { ...ar, ...bodyData, totalValue: bodyData.totalValue ? String(bodyData.totalValue) : ar.totalValue } : ar
          );
          setTable('accounts_receivable', updated);
          const saved = updated.find((ar: any) => ar.id === queryId);
          return saved
            ? createMockResponse(saved, 200)
            : createMockResponse({ error: 'Not found' }, 404);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('accounts_receivable');
          const filtered = all.filter((ar: any) => !(ar.id === queryId && ar.tenantId === tenantId));
          setTable('accounts_receivable', filtered);
          return createMockResponse({ message: 'Deleted successfully' }, 200);
        }
      }

      // 9. DASHBOARD
      if (path === '/api/dashboard') {
        const rawTrans = getTable('transactions');
        const rawItems = getTable('transaction_items');
        const rawClients = getTable('clients');
        const rawColabs = getTable('collaborators');
        const rawServices = getTable('services');
        const rawApps = getTable('appointments');

        let allTrans = rawTrans.filter((t: any) => !t.tenantId || t.tenantId === tenantId || tenantId?.startsWith('d6f127ca'));
        if (allTrans.length === 0 && rawTrans.length > 0) allTrans = rawTrans;

        let allItems = rawItems;

        let allClients = rawClients.filter((c: any) => !c.tenantId || c.tenantId === tenantId || tenantId?.startsWith('d6f127ca'));
        if (allClients.length === 0 && rawClients.length > 0) allClients = rawClients;

        let allColabs = rawColabs.filter((c: any) => !c.tenantId || c.tenantId === tenantId || tenantId?.startsWith('d6f127ca'));
        if (allColabs.length === 0 && rawColabs.length > 0) allColabs = rawColabs;

        let allServices = rawServices.filter((s: any) => !s.tenantId || s.tenantId === tenantId || tenantId?.startsWith('d6f127ca'));
        if (allServices.length === 0 && rawServices.length > 0) allServices = rawServices;

        let allApps = rawApps.filter((a: any) => !a.tenantId || a.tenantId === tenantId || tenantId?.startsWith('d6f127ca'));
        if (allApps.length === 0 && rawApps.length > 0) allApps = rawApps;

        const totalSales = allTrans
          .filter((t: any) => t.type === 'sale')
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

        const totalExpenses = allTrans
          .filter((t: any) => t.type === 'expense')
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

        const totalCommissions = allTrans
          .filter((t: any) => t.type === 'sale')
          .flatMap((t: any) => allItems.filter((item: any) => item.transactionId === t.id))
          .reduce((sum: number, item: any) => sum + parseFloat(item?.commissionPaid || '0.00'), 0);

        const netProfit = totalSales - totalExpenses - totalCommissions;

        // Today Schedule
        const today = new Date();
        const todayApps = allApps.filter((app: any) => {
          const appDate = new Date(app.startTime);
          return appDate.getDate() === today.getDate() && 
                 appDate.getMonth() === today.getMonth() &&
                 appDate.getFullYear() === today.getFullYear();
        }).map((app: any) => ({
          ...app,
          client: allClients.find((c: any) => c.id === app.clientId) || { name: 'Desconocido' },
          specialist: allColabs.find((c: any) => c.id === app.specialistId) || { name: 'Desconocido' },
          service: allServices.find((s: any) => s.id === app.serviceId) || { name: 'Desconocido', price: '0.00' }
        }));

        // Payment Methods distribution
        const paymentMethodsMap: Record<string, { method: string, total: number, count: number }> = {};
        allTrans.filter((t: any) => t.type === 'sale' || t.type === 'abono').forEach((t: any) => {
          const method = t.paymentMethod || 'Otro';
          if (!paymentMethodsMap[method]) {
            paymentMethodsMap[method] = { method, total: 0, count: 0 };
          }
          paymentMethodsMap[method].total += parseFloat(t.amount || '0');
          paymentMethodsMap[method].count += 1;
        });

        // Top Sold Items (Services and Products)
        const itemsMap: Record<string, { name: string; type: string; quantity: number; totalAmount: number }> = {};
        allTrans.forEach((t: any) => {
          const txItems = allItems.filter((item: any) => item.transactionId === t.id);
          txItems.forEach((item: any) => {
            const serv = allServices.find((s: any) => s.id === item.serviceId);
            const prod = getTable('products').find((p: any) => p.id === item.productId);
            const name = serv ? serv.name : prod ? prod.name : 'Ítem Genérico';
            const type = serv ? 'service' : 'product';
            if (!itemsMap[name]) {
              itemsMap[name] = { name, type, quantity: 0, totalAmount: 0 };
            }
            const qty = item.quantity || 1;
            const price = parseFloat(item.unitPrice || '0');
            itemsMap[name].quantity += qty;
            itemsMap[name].totalAmount += price * qty;
          });
        });

        const topSoldItems = Object.values(itemsMap)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        // Monthly Financial Flow
        const monthlyMap: Record<string, { month: string; monthName: string; sales: number; expenses: number; netProfit: number }> = {};
        allTrans.forEach((t: any) => {
          const d = new Date(t.createdAt || Date.now());
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthName = d.toLocaleString('es-ES', { month: 'short' });
          if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = { month: monthKey, monthName, sales: 0, expenses: 0, netProfit: 0 };
          }
          const amt = parseFloat(t.amount || '0');
          if (t.type === 'sale' || t.type === 'abono') {
            monthlyMap[monthKey].sales += amt;
          } else if (t.type === 'expense') {
            monthlyMap[monthKey].expenses += amt;
          }
          monthlyMap[monthKey].netProfit = monthlyMap[monthKey].sales - monthlyMap[monthKey].expenses;
        });

        const monthlyFlow = Object.values(monthlyMap);

        // Recent Appointments
        const recentAppointments = allApps.slice(0, 6).map((app: any) => {
          const client = allClients.find((c: any) => c.id === app.clientId);
          const service = allServices.find((s: any) => s.id === app.serviceId);
          return {
            id: app.id,
            startTime: app.startTime,
            status: app.status || 'scheduled',
            clientName: client ? client.name : 'Cliente',
            serviceName: service ? service.name : 'Tratamiento',
          };
        });

        return createMockResponse({
          metrics: {
            totalSales,
            totalExpenses,
            totalCommissions,
            netProfit,
            countClients: allClients.length,
            countAppointments: allApps.length
          },
          todaySchedule: todayApps,
          paymentMethods: Object.values(paymentMethodsMap),
          topSoldItems,
          monthlyFlow,
          recentAppointments,
        }, 200);
      }

      // 10. CASH REGISTER
      if (path === '/api/cash-register') {
        if (!tenantId) return createMockResponse({ error: 'Falta la cabecera x-tenant-id' }, 400);

        const actionQuery = parsedUrl.searchParams.get('action');
        const registers = getTable('cash_registers');

        if (method === 'GET') {
          if (actionQuery === 'history') {
            const history = registers
              .filter((r: any) => r.tenantId === tenantId && r.status === 'closed')
              .sort((a: any, b: any) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
            return createMockResponse(history, 200);
          }

          const active = registers.find((r: any) => r.tenantId === tenantId && r.status === 'open');
          if (!active) {
            return createMockResponse({ isOpen: false, register: null }, 200);
          }

          const allTrans = getTable('transactions').filter((t: any) => t.cashRegisterId === active.id || t.tenantId === tenantId);
          const cashSales = allTrans
            .filter((t: any) => t.type === 'sale' && (t.paymentMethod === 'cash' || t.paymentMethod === 'efectivo'))
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

          const cashExpenses = allTrans
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

          const initialBase = parseFloat(active.initialBase || '0');
          const expectedCash = initialBase + cashSales - cashExpenses;

          return createMockResponse(
            {
              isOpen: true,
              register: {
                ...active,
                cashSales,
                cashExpenses,
                expectedCash,
              },
            },
            200
          );
        }

        if (method === 'POST') {
          const action = bodyData.action;

          if (action === 'open') {
            const existingOpen = registers.find((r: any) => r.tenantId === tenantId && r.status === 'open');
            if (existingOpen) {
              return createMockResponse({ error: 'Ya existe una caja abierta para este establecimiento.' }, 400);
            }

            const newReg = {
              id: `cr-${Date.now()}`,
              tenantId,
              status: 'open',
              initialBase: (parseFloat(bodyData.initialBase) || 0).toFixed(2),
              openedAt: new Date().toISOString(),
            };

            registers.push(newReg);
            setTable('cash_registers', registers);
            return createMockResponse(newReg, 201);
          }

          if (action === 'close') {
            const activeIdx = registers.findIndex((r: any) => r.tenantId === tenantId && r.status === 'open');
            if (activeIdx === -1) {
              return createMockResponse({ error: 'No hay ninguna caja abierta para cerrar.' }, 400);
            }

            const activeReg = registers[activeIdx];
            const allTrans = getTable('transactions').filter((t: any) => t.cashRegisterId === activeReg.id || t.tenantId === tenantId);
            const cashSales = allTrans
              .filter((t: any) => t.type === 'sale' && (t.paymentMethod === 'cash' || t.paymentMethod === 'efectivo'))
              .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
            const cashExpenses = allTrans
              .filter((t: any) => t.type === 'expense')
              .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

            const initialBaseNum = parseFloat(activeReg.initialBase || '0');
            const expectedCashNum = initialBaseNum + cashSales - cashExpenses;
            const declaredCashNum = parseFloat(bodyData.declaredCash) || 0;
            const differenceNum = declaredCashNum - expectedCashNum;

            registers[activeIdx] = {
              ...activeReg,
              status: 'closed',
              closedAt: new Date().toISOString(),
              expectedCash: expectedCashNum.toFixed(2),
              declaredCash: declaredCashNum.toFixed(2),
              difference: differenceNum.toFixed(2),
              justification: bodyData.justification || null,
            };

            setTable('cash_registers', registers);
            return createMockResponse(registers[activeIdx], 200);
          }
        }
      }

      // --- PRODUCTS ENDPOINT ---
      if (path === '/api/products') {
        if (!tenantId) return createMockResponse({ error: 'Missing tenant header' }, 400);
        let list = getTable('products').filter((p: any) => p.tenantId === tenantId);

        if (method === 'GET') {
          if (queryId) {
            const prod = list.find((p: any) => p.id === queryId);
            return prod ? createMockResponse(prod, 200) : createMockResponse({ error: 'Producto no encontrado.' }, 404);
          }
          return createMockResponse(list, 200);
        }

        if (method === 'POST') {
          if (!bodyData.name || bodyData.price === undefined) {
            return createMockResponse({ error: 'El nombre y el precio son obligatorios.' }, 400);
          }
          const all = getTable('products');
          const newProduct = {
            id: `p-${Date.now()}`,
            tenantId,
            name: (bodyData.name || '').trim(),
            description: bodyData.description?.trim() || null,
            sku: bodyData.sku?.trim() || null,
            price: (parseFloat(bodyData.price) || 0).toFixed(2),
            cost: (parseFloat(bodyData.cost) || 0).toFixed(2),
            stock: parseInt(bodyData.stock, 10) || 0,
            minStock: parseInt(bodyData.minStock, 10) || 2,
            category: bodyData.category?.trim() || 'General',
            active: true,
            createdAt: new Date().toISOString()
          };
          all.push(newProduct);
          setTable('products', all);
          return createMockResponse(newProduct, 201);
        }

        if (method === 'PUT' && queryId) {
          const all = getTable('products');
          const idx = all.findIndex((p: any) => p.id === queryId && p.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Producto no encontrado.' }, 404);

          const prod = { ...all[idx] };
          if (bodyData.name !== undefined) prod.name = bodyData.name.trim();
          if (bodyData.description !== undefined) prod.description = bodyData.description?.trim() || null;
          if (bodyData.sku !== undefined) prod.sku = bodyData.sku?.trim() || null;
          if (bodyData.price !== undefined) prod.price = (parseFloat(bodyData.price) || 0).toFixed(2);
          if (bodyData.cost !== undefined) prod.cost = (parseFloat(bodyData.cost) || 0).toFixed(2);
          if (bodyData.stock !== undefined) prod.stock = parseInt(bodyData.stock, 10) || 0;
          if (bodyData.minStock !== undefined) prod.minStock = parseInt(bodyData.minStock, 10) || 0;
          if (bodyData.category !== undefined) prod.category = bodyData.category?.trim() || 'General';
          if (bodyData.active !== undefined) prod.active = Boolean(bodyData.active);

          all[idx] = prod;
          setTable('products', all);
          return createMockResponse(prod, 200);
        }

        if (method === 'DELETE' && queryId) {
          const all = getTable('products');
          const idx = all.findIndex((p: any) => p.id === queryId && p.tenantId === tenantId);
          if (idx === -1) return createMockResponse({ error: 'Producto no encontrado.' }, 404);
          all[idx] = { ...all[idx], active: false };
          setTable('products', all);
          return createMockResponse(all[idx], 200);
        }
      }

      // Default fallback
      return createMockResponse({ error: 'Endpoint mock not found' }, 404);
    } catch (e) {
      return createMockResponse({ error: 'Internal mock error' }, 500);
    }
  };
}

// Helper to construct a mock fetch Response object
function createMockResponse(data: any, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Seed mock database into LocalStorage
function seedLocalStorage() {
  console.log('🌱 Seeding Client-Side Mock Database...');
  
  // 1. Tenants
  const tenants = [
    { id: 'd6f127ca-16da-4417-b525-97a788d29c1d', name: 'Beauté Spa & Bienestar', slug: 'beaute-spa', logoUrl: null, nit: '900.123.456-7', phone: '+573001234567', email: 'contacto@beaute.com', address: 'Calle 85 #15-45', city: 'Bogotá', country: 'Colombia', currency: 'COP', category: 'Spa', website: 'https://beaute.com', instagram: '@beaute_spa', createdAt: new Date().toISOString() },
    { id: '0c427116-452b-4c2a-86f4-2755053bd775', name: 'Hair Glam Salón', slug: 'hair-glam', logoUrl: null, nit: '800.456.789-1', phone: '+573202223344', email: 'info@hairglam.co', address: 'Av. Chile #42-20', city: 'Medellín', country: 'Colombia', currency: 'COP', category: 'Salón de belleza', website: 'https://hairglam.co', instagram: '@hairglam_studio', createdAt: new Date().toISOString() }
  ];

  // 2. Users
  const users = [
    { id: 'u-admin-1', tenantId: tenants[0].id, email: 'admin@beaute.com', role: 'admin', name: 'Elena Rossi (Administradora)', active: true },
    { id: 'u-recep-1', tenantId: tenants[0].id, email: 'recepcion@beaute.com', role: 'receptionist', name: 'Camila Díaz', active: true },
    { id: 'u-spec-1', tenantId: tenants[0].id, email: 'elena@beaute.com', role: 'specialist', name: 'Elena Rossi', active: true },
    { id: 'u-spec-2', tenantId: tenants[0].id, email: 'sofia@beaute.com', role: 'specialist', name: 'Sofia Mendez', active: true },
    { id: 'u-admin-2', tenantId: tenants[1].id, email: 'admin@hairglam.com', role: 'admin', name: 'Carlos Sanchez (Admin)', active: true },
    { id: 'u-recep-2', tenantId: tenants[1].id, email: 'recepcion@hairglam.com', role: 'receptionist', name: 'Valeria Luna', active: true },
    { id: 'u-spec-3', tenantId: tenants[1].id, email: 'carlos@hairglam.com', role: 'specialist', name: 'Carlos Sanchez', active: true },
    { id: 'u-spec-4', tenantId: tenants[1].id, email: 'ana@hairglam.com', role: 'specialist', name: 'Ana Maria Ortiz', active: true }
  ];

  // 3. Collaborators
  const collaborators = [
    {
      id: 'c-elena',
      tenantId: tenants[0].id,
      userId: 'u-spec-1',
      name: 'Elena Rossi',
      email: 'elena@beaute.com',
      phone: '+573151234567',
      specialties: ['Faciales', 'Masajes Corporales', 'Terapias de Relajación'],
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      docType: 'Cédula',
      docNumber: '1023456789',
      bio: 'Especialista enfocado en brindar el mejor diagnóstico estético y tratamientos de alta calidad.',
      experience: 'Especialista Principal\nAura Beauty Clinic — 2018 - Presente',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-sofia',
      tenantId: tenants[0].id,
      userId: 'u-spec-2',
      name: 'Sofia Mendez',
      email: 'sofia@beaute.com',
      phone: '+573109876543',
      specialties: ['Manicura Rusa', 'Diseño de Cejas', 'Pestañas Pelo a Pelo'],
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      docType: 'Cédula',
      docNumber: '1098765432',
      bio: 'Experta en nail art y diseño de cejas con más de 8 años de experiencia.',
      experience: 'Especialista Senior\nAura Beauty Clinic — 2019 - Presente',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-carlos',
      tenantId: tenants[1].id,
      userId: 'u-spec-3',
      name: 'Carlos Sanchez',
      email: 'carlos@hairglam.com',
      phone: '+573201112233',
      specialties: ['Balayage', 'Cortes de Dama', 'Peinados de Gala'],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      docType: 'Tarjeta de Identidad',
      docNumber: '12345678',
      bio: 'Maestro peluquero especializado en colorimetría y técnicas de alto impacto.',
      experience: 'Director Creativo\nHair Glam Studio — 2017 - Presente',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-ana',
      tenantId: tenants[1].id,
      userId: 'u-spec-4',
      name: 'Ana Maria Ortiz',
      email: 'ana@hairglam.com',
      phone: '+573124445566',
      specialties: ['Keratinas', 'Hidratación Orgánica', 'Colorimetría'],
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      docType: 'Pasaporte',
      docNumber: 'AB123456',
      bio: 'Profesional certificada en tratamientos capilares orgánicos y colorimetría avanzada.',
      experience: 'Especialista en Colorimetría\nHair Glam Studio — 2020 - Presente',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  // 4. Services
  const services = [
    { id: 's-facial', tenantId: tenants[0].id, name: 'Facial Rejuvenecedor Hialurónico', description: 'Limpieza profunda con ácido hialurónico.', duration: 60, price: '85000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-masaje', tenantId: tenants[0].id, name: 'Masaje Relajante Piedras Volcánicas', description: 'Terapia relajante corporal.', duration: 75, price: '120000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-manicura', tenantId: tenants[0].id, name: 'Manicura Rusa Express Semi', description: 'Cuidado de uñas semipermanente.', duration: 45, price: '45000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-pies', tenantId: tenants[0].id, name: 'Spa de Pies Hidratante', description: 'Exfoliación e hidratación.', duration: 50, price: '55000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-balayage', tenantId: tenants[1].id, name: 'Balayage Blonde Premium', description: 'Aclaración con técnica a mano alzada.', duration: 180, price: '180000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-corte', tenantId: tenants[1].id, name: 'Corte de Dama & Estilizado', description: 'Corte de puntas y ondas glam.', duration: 60, price: '50000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-peinado', tenantId: tenants[1].id, name: 'Peinado Novia Profesional', description: 'Peinados de gala.', duration: 90, price: '90000.00', active: true, createdAt: new Date().toISOString() },
    { id: 's-keratina', tenantId: tenants[1].id, name: 'Keratina Orgánica Orgánica', description: 'Alisado termomotivado sin formol.', duration: 120, price: '130000.00', active: true, createdAt: new Date().toISOString() }
  ];

  // 4a. Products
  const products = [
    { id: 'p-shampoo', tenantId: tenants[0].id, name: 'Shampoo Hidratante 500ml', description: 'Shampoo profesional para cabello seco.', sku: 'SHA-500', price: '35000.00', cost: '18000.00', stock: 12, minStock: 3, category: 'Cuidado Capilar', active: true, createdAt: new Date().toISOString() },
    { id: 'p-mascarilla', tenantId: tenants[0].id, name: 'Mascarilla Facial de Colágeno', description: 'Mascarilla hidratante con colágeno.', sku: 'MFC-001', price: '25000.00', cost: '12000.00', stock: 20, minStock: 5, category: 'Faciales', active: true, createdAt: new Date().toISOString() },
    { id: 'p-acido', tenantId: tenants[0].id, name: 'Sérum Ácido Hialurónico 30ml', description: 'Sérum antiedad con ácido hialurónico puro.', sku: 'SAH-30', price: '55000.00', cost: '28000.00', stock: 8, minStock: 2, category: 'Antiedad', active: true, createdAt: new Date().toISOString() },
    { id: 'p-balsamo', tenantId: tenants[1].id, name: 'Bálsamo Reparador Leave-in', description: 'Acondicionador sin enjuague para cabello dañado.', sku: 'BLR-250', price: '28000.00', cost: '14000.00', stock: 15, minStock: 3, category: 'Cuidado Capilar', active: true, createdAt: new Date().toISOString() },
    { id: 'p-spray', tenantId: tenants[1].id, name: 'Spray Termoprotector 200ml', description: 'Protector térmico previo al planchado.', sku: 'STP-200', price: '32000.00', cost: '15000.00', stock: 10, minStock: 2, category: 'Styling', active: true, createdAt: new Date().toISOString() },
    { id: 'p-aceite', tenantId: tenants[1].id, name: 'Aceite Capilar Argán 100ml', description: 'Aceite nutritivo de argán para brillo.', sku: 'ACA-100', price: '38000.00', cost: '19000.00', stock: 9, minStock: 2, category: 'Nutrición', active: true, createdAt: new Date().toISOString() },
  ];

  // 4b. Commission Rules
  const commissionRules = [
    { id: 'rule-1', tenantId: tenants[0].id, collaboratorId: 'c-elena', serviceId: 's-facial', productId: null, commissionRate: '35.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-2', tenantId: tenants[0].id, collaboratorId: 'c-elena', serviceId: 's-masaje', productId: null, commissionRate: '40.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-3', tenantId: tenants[0].id, collaboratorId: 'c-sofia', serviceId: 's-manicura', productId: null, commissionRate: '50.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-4', tenantId: tenants[0].id, collaboratorId: 'c-sofia', serviceId: 's-pies', productId: null, commissionRate: '30.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-5', tenantId: tenants[1].id, collaboratorId: 'c-carlos', serviceId: 's-balayage', productId: null, commissionRate: '45.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-6', tenantId: tenants[1].id, collaboratorId: 'c-carlos', serviceId: 's-corte', productId: null, commissionRate: '30.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-7', tenantId: tenants[1].id, collaboratorId: 'c-ana', serviceId: 's-peinado', productId: null, commissionRate: '35.00', isActive: true, createdAt: new Date().toISOString() },
    { id: 'rule-8', tenantId: tenants[1].id, collaboratorId: 'c-ana', serviceId: 's-keratina', productId: null, commissionRate: '40.00', isActive: true, createdAt: new Date().toISOString() },
  ];

  const commissionLiquidations: any[] = [];
  const commissionLiquidationItems: any[] = [];

  // 5. Clients
  const clients = [
    { id: 'cli-laura', tenantId: tenants[0].id, name: 'Laura Gomez Restrepo', email: 'laura.gomez@gmail.com', phone: '+573001234567', notes: 'Piel muy sensible. Alérgica al eucalipto.', createdAt: new Date().toISOString() },
    { id: 'cli-camila', tenantId: tenants[0].id, name: 'Maria Camila Restrepo', email: 'm.camila@hotmail.com', phone: '+573117654321', notes: 'Suele agendar fines de semana. Toma té verde.', createdAt: new Date().toISOString() },
    { id: 'cli-paula', tenantId: tenants[0].id, name: 'Paula Andrea Rojas', email: 'paula.rojas@outlook.com', phone: '+573159876543', notes: 'Manicura cada 15 días. Tonos nudes.', createdAt: new Date().toISOString() },
    { id: 'cli-valentina', tenantId: tenants[1].id, name: 'Valentina Herrera Silva', email: 'valentina.hs@gmail.com', phone: '+573012223344', notes: 'Cabello seco tinturado.', createdAt: new Date().toISOString() },
    { id: 'cli-diana', tenantId: tenants[1].id, name: 'Diana Marcela Caro', email: 'diana.caro@gmail.com', phone: '+573215556677', notes: 'Corte recto clásico.', createdAt: new Date().toISOString() }
  ];

  // 6. Appointments
  const today = new Date();
  const appointments = [
    {
      id: 'app-1',
      tenantId: tenants[0].id,
      clientId: 'cli-laura',
      specialistId: 'c-elena',
      serviceId: 's-facial',
      startTime: setHours(setMinutes(subDays(today, 1), 0), 10).toISOString(),
      endTime: setHours(setMinutes(subDays(today, 1), 0), 11).toISOString(),
      status: 'completed',
      notes: 'Cliente muy satisfecha.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'app-2',
      tenantId: tenants[0].id,
      clientId: 'cli-camila',
      specialistId: 'c-sofia',
      serviceId: 's-manicura',
      startTime: setHours(setMinutes(today, 30), 14).toISOString(),
      endTime: setHours(setMinutes(today, 15), 15).toISOString(),
      status: 'scheduled',
      notes: 'Diseño floral a mano.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'app-3',
      tenantId: tenants[1].id,
      clientId: 'cli-valentina',
      specialistId: 'c-carlos',
      serviceId: 's-balayage',
      startTime: setHours(setMinutes(subDays(today, 2), 0), 11).toISOString(),
      endTime: setHours(setMinutes(subDays(today, 2), 0), 14).toISOString(),
      status: 'completed',
      notes: 'Decoloración premium.',
      createdAt: new Date().toISOString()
    }
  ];

  // 7. Transactions
  const transactions = [
    {
      id: 't-sale-1',
      tenantId: tenants[0].id,
      clientId: 'cli-laura',
      appointmentId: 'app-1',
      type: 'sale',
      amount: '85000.00',
      paymentMethod: 'card',
      description: 'Venta por Cita - Facial Rejuvenecedor',
      createdAt: subDays(today, 1).toISOString()
    },
    {
      id: 't-expense-1',
      tenantId: tenants[0].id,
      clientId: null,
      appointmentId: null,
      type: 'expense',
      amount: '45000.00',
      paymentMethod: null,
      description: 'Compra de esmaltes de gel tonos otoño-invierno (Insumos)',
      createdAt: subDays(today, 3).toISOString()
    },
    {
      id: 't-sale-2',
      tenantId: tenants[1].id,
      clientId: 'cli-valentina',
      appointmentId: 'app-3',
      type: 'sale',
      amount: '180000.00',
      paymentMethod: 'transfer',
      description: 'Venta por Cita - Balayage Blonde Premium',
      createdAt: subDays(today, 2).toISOString()
    }
  ];

  // 8. Transaction Items
  const transactionItems = [
    {
      id: 'ti-1',
      transactionId: 't-sale-1',
      serviceId: 's-facial',
      quantity: 1,
      unitPrice: '85000.00',
      collaboratorId: 'c-elena',
      commissionPaid: '29750.00' // 85 * 35%
    },
    {
      id: 'ti-2',
      transactionId: 't-sale-2',
      serviceId: 's-balayage',
      quantity: 1,
      unitPrice: '180000.00',
      collaboratorId: 'c-carlos',
      commissionPaid: '72000.00' // 180 * 40%
    }
  ];

  // 9. Collaborator Schedules
  const schedules: any[] = [];
  collaborators.forEach(colab => {
    for (let day = 1; day <= 6; day++) {
      schedules.push({
        id: `sch-${colab.id}-${day}`,
        tenantId: colab.tenantId,
        collaboratorId: colab.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      });
    }
  });

  // 10. Messages
  const messages = [
    {
      id: 'm-1',
      tenantId: tenants[0].id,
      clientId: 'cli-laura',
      direction: 'inbound',
      content: 'Hola! Tienen disponibilidad para un masaje relajante mañana en la tarde?',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 2).toISOString()
    },
    {
      id: 'm-2',
      tenantId: tenants[0].id,
      clientId: 'cli-laura',
      direction: 'outbound',
      content: '¡Hola Laura! Claro que sí, tenemos espacio disponible a las 4:00 PM con Elena Rossi.',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 2).toISOString()
    }
  ];

  localStorage.setItem('aura_tenants', JSON.stringify(tenants));
  localStorage.setItem('aura_users', JSON.stringify(users));
  localStorage.setItem('aura_collaborators', JSON.stringify(collaborators));
  localStorage.setItem('aura_services', JSON.stringify(services));
  localStorage.setItem('aura_clients', JSON.stringify(clients));
  localStorage.setItem('aura_appointments', JSON.stringify(appointments));
  localStorage.setItem('aura_transactions', JSON.stringify(transactions));
  localStorage.setItem('aura_transaction_items', JSON.stringify(transactionItems));
  localStorage.setItem('aura_commission_rules', JSON.stringify(commissionRules));
  localStorage.setItem('aura_commission_liquidations', JSON.stringify(commissionLiquidations));
  localStorage.setItem('aura_commission_liquidation_items', JSON.stringify(commissionLiquidationItems));
  localStorage.setItem('aura_collaborator_schedules', JSON.stringify(schedules));
  localStorage.setItem('aura_messages', JSON.stringify(messages));
  localStorage.setItem('aura_products', JSON.stringify(products));

  // Auto-repair: si tablas criticas quedaron vacias por corrupcion anterior, forzar re-siembra
  const criticalTables = ['aura_tenants', 'aura_users', 'aura_services', 'aura_products'];
  criticalTables.forEach(key => {
    const value = localStorage.getItem(key);
    if (!value || value === '[]' || value === 'null') {
      localStorage.removeItem(key);
      localStorage.removeItem(SEED_KEY);
    }
  });
  
  localStorage.setItem(SEED_KEY, 'true');
  console.log('✅ Client-Side Mock Database seeded successfully!');
}
