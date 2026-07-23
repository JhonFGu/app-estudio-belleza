import { pgTable, uuid, text, timestamp, boolean, decimal, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Tenants (Centros de Belleza / Inquilinos)
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // ej. "beaute-spa", "hair-glam"
  logoUrl: text('logo_url'), // Logo de la marca (en formato horizontal)
  nit: text('nit'), // NIT / ID fiscal
  phone: text('phone'), // Teléfono / WhatsApp comercial
  email: text('email'), // Email de contacto
  address: text('address'), // Dirección física
  city: text('city'), // Ciudad
  country: text('country').default('Colombia'), // País
  currency: text('currency').default('COP'), // Tipo de moneda
  category: text('category'), // Categoria del negocio
  website: text('website'), // Sitio web
  instagram: text('instagram'), // Instagram
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  collaborators: many(collaborators),
  clients: many(clients),
  services: many(services),
  appointments: many(appointments),
  transactions: many(transactions),
  cashRegisters: many(cashRegisters),
  schedules: many(collaboratorSchedules),
  messages: many(messages),
  loyaltyConfigs: many(loyaltyConfig),
  loyaltyPoints: many(loyaltyPoints),
  loyaltyRewards: many(loyaltyRewards),
  clientActivities: many(clientActivityLog),
}));

// 2. Users (Usuarios de la App - Credenciales y Roles)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(), // Para simulacion o JWT
  role: text('role').notNull().default('specialist'), // 'admin' | 'receptionist' | 'specialist' | 'accountant'
  name: text('name').notNull(),
  phone: text('phone'),
  active: boolean('active').default(true).notNull(),
  permissions: jsonb('permissions'), // Matriz de permisos por modulo: { citas: { leer: true, crear: true, ... } }
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('users_tenant_idx').on(table.tenantId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  collaboratorProfile: one(collaborators, {
    fields: [users.id],
    references: [collaborators.userId],
  }),
}));

// 3. Collaborators (Especialistas / Estilistas - Información operativa y comisiones)
export const collaborators = pgTable('collaborators', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Vinculado a usuario si tiene acceso a la app
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  specialties: text('specialties').array(), // Ej. ['Manicura', 'Pedicura', 'Balayage']
  avatarUrl: text('avatar_url'),
  bio: text('bio'), // Descripción del colaborador
  experience: text('experience'), // Experiencia profesional (separado por saltos de línea)
  docType: text('doc_type').default('Cédula'), // Tipo de documento de identidad
  docNumber: text('doc_number'), // Número de documento de identidad
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('collaborators_tenant_idx').on(table.tenantId),
}));

export const collaboratorsRelations = relations(collaborators, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [collaborators.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [collaborators.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  schedules: many(collaboratorSchedules),
  transactionItems: many(transactionItems),
  commissionRules: many(commissionRules),
  commissionLiquidations: many(commissionLiquidations),
}));

// 4. Clients (CRM Clientes)
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  notes: text('notes'), // Preferencias, historial de alergias, tipo de piel/cabello
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('clients_tenant_idx').on(table.tenantId),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
  transactions: many(transactions),
  messages: many(messages),
  loyaltyPoints: many(loyaltyPoints),
  activities: many(clientActivityLog),
}));

// 5. Services (Tratamientos / Servicios)
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // Duracion en minutos
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('services_tenant_idx').on(table.tenantId),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
  transactionItems: many(transactionItems),
}));

// 6. Appointments (Calendario de Citas)
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  specialistId: uuid('specialist_id').references(() => collaborators.id).notNull(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: text('status').notNull().default('scheduled'), // 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('appointments_tenant_idx').on(table.tenantId),
  timeRangeIdx: index('appointments_time_range_idx').on(table.tenantId, table.startTime, table.endTime),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  specialist: one(collaborators, {
    fields: [appointments.specialistId],
    references: [collaborators.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

// 7. Transactions (POS e Historial / Finanzas - Gastos y Ventas)
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  cashRegisterId: uuid('cash_register_id').references(() => cashRegisters.id), // Vinculado a la sesión de caja activa
  clientId: uuid('client_id').references(() => clients.id), // Nullable si es venta rapida
  appointmentId: uuid('appointment_id').references(() => appointments.id), // Nullable si es compra directa sin cita
  type: text('type').notNull(), // 'sale' (ingreso POS) | 'expense' (gasto operativo) | 'abono' (abono a deuda)
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }),
  pendingBalance: decimal('pending_balance', { precision: 10, scale: 2 }),
  status: text('status').default('completed').notNull(), // 'completed' | 'partial' | 'pending'
  paymentMethod: text('payment_method'), // 'cash' | 'card' | 'transfer' | 'credit' | 'split'
  description: text('description'), // ej: "Pago ticket #120" o "Compra de toallas y champús"
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('transactions_tenant_idx').on(table.tenantId),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  cashRegister: one(cashRegisters, {
    fields: [transactions.cashRegisterId],
    references: [cashRegisters.id],
  }),
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
  appointment: one(appointments, {
    fields: [transactions.appointmentId],
    references: [appointments.id],
  }),
  items: many(transactionItems),
}));

// 7b. Cash Registers (Ciclo de Caja y Arqueo)
export const cashRegisters = pgTable('cash_registers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  openedByUserId: uuid('opened_by_user_id').references(() => users.id),
  closedByUserId: uuid('closed_by_user_id').references(() => users.id),
  status: text('status').notNull().default('open'), // 'open' | 'closed'
  openedAt: timestamp('opened_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  initialBase: decimal('initial_base', { precision: 10, scale: 2 }).notNull().default('0.00'),
  expectedCash: decimal('expected_cash', { precision: 10, scale: 2 }),
  declaredCash: decimal('declared_cash', { precision: 10, scale: 2 }),
  difference: decimal('difference', { precision: 10, scale: 2 }),
  justification: text('justification'),
}, (table) => ({
  tenantIdx: index('cash_registers_tenant_idx').on(table.tenantId),
}));

export const cashRegistersRelations = relations(cashRegisters, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cashRegisters.tenantId],
    references: [tenants.id],
  }),
  openedByUser: one(users, {
    fields: [cashRegisters.openedByUserId],
    references: [users.id],
  }),
  closedByUser: one(users, {
    fields: [cashRegisters.closedByUserId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));


// 8. Products (Productos Físicos de Venta / Inventario)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0.00'),
  stock: integer('stock').default(0).notNull(),
  minStock: integer('min_stock').default(2).notNull(),
  category: text('category').default('General'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('products_tenant_idx').on(table.tenantId),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  transactionItems: many(transactionItems),
}));

// 9. Transaction Items (Detalle de Citas Facturadas, Productos y Comisiones del POS)
export const transactionItems = pgTable('transaction_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id), // Nullable si es venta de producto físico
  productId: uuid('product_id').references(() => products.id), // Nullable si es servicio
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id), // Quien hizo el trabajo
  commissionPaid: decimal('commission_paid', { precision: 10, scale: 2 }).default('0.00').notNull(), // Comision neta calculada
});

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  service: one(services, {
    fields: [transactionItems.serviceId],
    references: [services.id],
  }),
  product: one(products, {
    fields: [transactionItems.productId],
    references: [products.id],
  }),
  collaborator: one(collaborators, {
    fields: [transactionItems.collaboratorId],
    references: [collaborators.id],
  }),
}));

// 9. Commission Rules (Reglas Dinámicas de Comisión por Colaborador + Servicio/Producto)
export const commissionRules = pgTable('commission_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('commission_rules_tenant_idx').on(table.tenantId),
  collaboratorIdx: index('commission_rules_collaborator_idx').on(table.collaboratorId),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [commissionRules.tenantId],
    references: [tenants.id],
  }),
  collaborator: one(collaborators, {
    fields: [commissionRules.collaboratorId],
    references: [collaborators.id],
  }),
  service: one(services, {
    fields: [commissionRules.serviceId],
    references: [services.id],
  }),
  product: one(products, {
    fields: [commissionRules.productId],
    references: [products.id],
  }),
}));

// 10. Commission Liquidations (Períodos de Liquidación por Colaborador)
export const commissionLiquidations = pgTable('commission_liquidations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'cascade' }).notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('commission_liquidations_tenant_idx').on(table.tenantId),
  collaboratorIdx: index('commission_liquidations_collaborator_idx').on(table.collaboratorId),
}));

export const commissionLiquidationsRelations = relations(commissionLiquidations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [commissionLiquidations.tenantId],
    references: [tenants.id],
  }),
  collaborator: one(collaborators, {
    fields: [commissionLiquidations.collaboratorId],
    references: [collaborators.id],
  }),
  items: many(commissionLiquidationItems),
}));

// 11. Commission Liquidation Items (Detalle de cada transacción en una liquidación)
export const commissionLiquidationItems = pgTable('commission_liquidation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  liquidationId: uuid('liquidation_id').references(() => commissionLiquidations.id, { onDelete: 'cascade' }).notNull(),
  transactionItemId: uuid('transaction_item_id').references(() => transactionItems.id).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
  appliedRate: decimal('applied_rate', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  liquidationIdx: index('liquidation_items_liquidation_idx').on(table.liquidationId),
}));

export const commissionLiquidationItemsRelations = relations(commissionLiquidationItems, ({ one }) => ({
  liquidation: one(commissionLiquidations, {
    fields: [commissionLiquidationItems.liquidationId],
    references: [commissionLiquidations.id],
  }),
  transactionItem: one(transactionItems, {
    fields: [commissionLiquidationItems.transactionItemId],
    references: [transactionItems.id],
  }),
}));

// 12. Collaborator Schedules (Horarios de Equipo - Disponibilidad Semanal)
export const collaboratorSchedules = pgTable('collaborator_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 (Domingo) a 6 (Sábado)
  week: text('week'), // "2026-W30" (específico por semana)
  startTime: text('start_time').notNull(), // "09:00"
  endTime: text('end_time').notNull(), // "18:00"
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  tenantIdx: index('schedules_tenant_idx').on(table.tenantId),
}));

export const collaboratorSchedulesRelations = relations(collaboratorSchedules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [collaboratorSchedules.tenantId],
    references: [tenants.id],
  }),
  collaborator: one(collaborators, {
    fields: [collaboratorSchedules.collaboratorId],
    references: [collaborators.id],
  }),
}));

// 10. Messages (CRM Conversacional)
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  content: text('content').notNull(),
  channel: text('channel').notNull().default('whatsapp'), // 'whatsapp' | 'sms' | 'chat'
  status: text('status').notNull().default('sent'), // 'sent' | 'delivered' | 'read'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('messages_tenant_idx').on(table.tenantId),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [messages.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id],
  }),
}));

// 11. Accounts Payable (Cuentas por pagar)
export const accountsPayable = pgTable('accounts_payable', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number'), // id o número de factura u orden de compra
  description: text('description').notNull(), // producto/servicio/descripción
  category: text('category').notNull(), // categoria
  totalValue: decimal('total_value', { precision: 10, scale: 2 }).notNull(), // valor total
  status: text('status').default('pending').notNull(), // estado de pago: 'pending' | 'paid'
  documentUrl: text('document_url'), // archivo subido (base64 o link)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('accounts_payable_tenant_idx').on(table.tenantId),
}));

export const accountsPayableRelations = relations(accountsPayable, ({ one }) => ({
  tenant: one(tenants, {
    fields: [accountsPayable.tenantId],
    references: [tenants.id],
  }),
}));

// 12. Accounts Receivable (Cuentas por cobrar)
export const accountsReceivable = pgTable('accounts_receivable', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number'), // id o número de factura / ticket
  description: text('description').notNull(), // Tratamiento/Productos
  category: text('category').notNull(), // Tratamientos, Productos
  totalValue: decimal('total_value', { precision: 10, scale: 2 }).notNull(), // valor total
  status: text('status').default('pending').notNull(), // estado de pago: 'pending' | 'paid'
  documentUrl: text('document_url'), // archivo subido (tirilla de factura)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('accounts_receivable_tenant_idx').on(table.tenantId),
}));

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  tenant: one(tenants, {
    fields: [accountsReceivable.tenantId],
    references: [tenants.id],
  }),
}));

// 13. Loyalty Config (Configuracion de Fidelizacion por Tenant)
export const loyaltyConfig = pgTable('loyalty_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  pointsPerCurrencyUnit: integer('points_per_currency_unit').notNull().default(1),
  currencyUnit: decimal('currency_unit', { precision: 10, scale: 2 }).notNull().default('10000'),
  inactivityDays: integer('inactivity_days').notNull().default(45),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('loyalty_config_tenant_idx').on(table.tenantId),
}));

export const loyaltyConfigRelations = relations(loyaltyConfig, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loyaltyConfig.tenantId],
    references: [tenants.id],
  }),
}));

// 14. Loyalty Points (Ledger de Puntos de Fidelizacion)
export const loyaltyPoints = pgTable('loyalty_points', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  points: integer('points').notNull(),
  type: text('type').notNull(),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  description: text('description'),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('loyalty_points_tenant_idx').on(table.tenantId),
  clientIdx: index('loyalty_points_client_idx').on(table.clientId),
}));

export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loyaltyPoints.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [loyaltyPoints.clientId],
    references: [clients.id],
  }),
}));

// 15. Loyalty Rewards (Catalogo de Recompensas)
export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }),
  serviceId: uuid('service_id').references(() => services.id),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('loyalty_rewards_tenant_idx').on(table.tenantId),
}));

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loyaltyRewards.tenantId],
    references: [tenants.id],
  }),
  service: one(services, {
    fields: [loyaltyRewards.serviceId],
    references: [services.id],
  }),
}));

// 16. Client Activity Log (Historial de Acciones CRM)
export const clientActivityLog = pgTable('client_activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('client_activity_log_tenant_idx').on(table.tenantId),
  clientIdx: index('client_activity_log_client_idx').on(table.clientId),
}));

export const clientActivityLogRelations = relations(clientActivityLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [clientActivityLog.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [clientActivityLog.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientActivityLog.userId],
    references: [users.id],
  }),
}));
