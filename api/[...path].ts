import accountsPayableHandler from '../src/handlers/accounts-payable.js';
import accountsReceivableHandler from '../src/handlers/accounts-receivable.js';
import appointmentsHandler from '../src/handlers/appointments.js';
import cashRegisterHandler from '../src/handlers/cash-register.js';
import clientActivityHandler from '../src/handlers/client-activity.js';
import clientsHandler from '../src/handlers/clients.js';
import collaboratorsHandler from '../src/handlers/collaborators.js';
import commissionLiquidationsHandler from '../src/handlers/commission-liquidations.js';
import commissionRulesHandler from '../src/handlers/commission-rules.js';
import dashboardHandler from '../src/handlers/dashboard.js';
import loyaltyRewardsHandler from '../src/handlers/loyalty-rewards.js';
import loyaltyHandler from '../src/handlers/loyalty.js';
import messagesHandler from '../src/handlers/messages.js';
import productsHandler from '../src/handlers/products.js';
import schedulesHandler from '../src/handlers/schedules.js';
import servicesHandler from '../src/handlers/services.js';
import tenantsHandler from '../src/handlers/tenants.js';
import transactionsHandler from '../src/handlers/transactions.js';
import usersHandler from '../src/handlers/users.js';
import loginHandler from '../src/handlers/auth/login.js';
import registerHandler from '../src/handlers/auth/register.js';
import inviteHandler from '../src/handlers/auth/invite.js';

const routes: Record<string, any> = {
  'accounts-payable': accountsPayableHandler,
  'accounts-receivable': accountsReceivableHandler,
  appointments: appointmentsHandler,
  'cash-register': cashRegisterHandler,
  'client-activity': clientActivityHandler,
  clients: clientsHandler,
  collaborators: collaboratorsHandler,
  'commission-liquidations': commissionLiquidationsHandler,
  'commission-rules': commissionRulesHandler,
  dashboard: dashboardHandler,
  'loyalty-rewards': loyaltyRewardsHandler,
  loyalty: loyaltyHandler,
  messages: messagesHandler,
  products: productsHandler,
  schedules: schedulesHandler,
  services: servicesHandler,
  tenants: tenantsHandler,
  transactions: transactionsHandler,
  users: usersHandler,
  'auth/login': loginHandler,
  'auth/register': registerHandler,
  'auth/invite': inviteHandler,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  let route = Array.isArray(path) ? path.join('/') : path || '';

  // Fallback: parse from URL if query path is not available (Vercel production)
  if (!route && req.url) {
    const urlPath = req.url.replace('/api/', '').split('?')[0];
    route = urlPath || '';
  }

  const routeHandler = routes[route];

  if (!routeHandler) {
    return res.status(404).json({ error: `Ruta /api/${route} no encontrada` });
  }

  return routeHandler(req, res);
}
