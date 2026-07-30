import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import { setHours, setMinutes } from 'date-fns';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8wW5PetGcpiE@ep-sparkling-darkness-atab8ji5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = neon(connectionString);
const db = drizzle(client, { schema });

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'beaute-spa';
const JULY_BASE = new Date('2026-07-01T09:00:00');
const day = (d: number) => new Date(JULY_BASE.getTime() + (d - 1) * 86400000);

async function main() {
  console.log('🌱 Iniciando siembra de datos julio 2026 para demo...\n');

  // =========================================================
  // 1. BUSCAR TENANT
  // =========================================================
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, TENANT_SLUG),
  });

  if (!tenant) {
    console.error(`❌ Tenant '${TENANT_SLUG}' no encontrado.`);
    process.exit(1);
  }
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // =========================================================
  // 2. SERVICIOS (verificar / crear si no existen)
  // =========================================================
  let services = await db.query.services.findMany({
    where: eq(schema.services.tenantId, tenant.id),
  });

  if (services.length === 0) {
    console.log('💅 Creando servicios...');
    services = await db.insert(schema.services).values([
      { tenantId: tenant.id, name: 'Facial Rejuvenecedor Hialurónico', description: 'Limpieza profunda con ácido hialurónico.', duration: 60, price: '85000.00' },
      { tenantId: tenant.id, name: 'Masaje Relajante Piedras Volcánicas', description: 'Terapia relajante corporal con piedras calientes.', duration: 75, price: '120000.00' },
      { tenantId: tenant.id, name: 'Manicura Rusa Express Semi', description: 'Cuidado de uñas semipermanente premium.', duration: 45, price: '45000.00' },
      { tenantId: tenant.id, name: 'Spa de Pies Hidratante', description: 'Exfoliación e hidratación profunda.', duration: 50, price: '55000.00' },
    ]).returning();
    console.log(`   ${services.length} servicios creados.`);
  } else {
    console.log(`ℹ️  ${services.length} servicios existentes.`);
  }

  // =========================================================
  // 3. PRODUCTOS (verificar / crear)
  // =========================================================
  let products = await db.query.products.findMany({
    where: eq(schema.products.tenantId, tenant.id),
  });

  if (products.length === 0) {
    console.log('🧴 Creando productos...');
    products = await db.insert(schema.products).values([
      { tenantId: tenant.id, name: 'Shampoo Hidratante 500ml', description: 'Shampoo profesional para cabello seco.', sku: 'SHA-500', price: '35000.00', cost: '18000.00', stock: 12, minStock: 3, category: 'Cuidado Capilar', active: true },
      { tenantId: tenant.id, name: 'Mascarilla Facial de Colágeno', description: 'Mascarilla hidratante con colágeno.', sku: 'MFC-001', price: '25000.00', cost: '12000.00', stock: 20, minStock: 5, category: 'Faciales', active: true },
      { tenantId: tenant.id, name: 'Sérum Ácido Hialurónico 30ml', description: 'Sérum antiedad con ácido hialurónico puro.', sku: 'SAH-30', price: '55000.00', cost: '28000.00', stock: 8, minStock: 2, category: 'Antiedad', active: true },
    ]).returning();
    console.log(`   ${products.length} productos creados.`);
  } else {
    console.log(`ℹ️  ${products.length} productos existentes.`);
  }

  // =========================================================
  // 4. USUARIOS (verificar / crear - julio 3)
  // =========================================================
  let users = await db.query.users.findMany({
    where: eq(schema.users.tenantId, tenant.id),
  });

  if (users.length === 0) {
    console.log('👥 Creando usuarios (julio 3)...');
    users = await db.insert(schema.users).values([
      { tenantId: tenant.id, email: 'admin@beaute.com', passwordHash: 'admin123', role: 'admin', name: 'Elena Rossi (Administradora)', createdAt: day(3) },
      { tenantId: tenant.id, email: 'recepcion@beaute.com', passwordHash: 'recep123', role: 'receptionist', name: 'Camila Díaz', createdAt: day(3) },
      { tenantId: tenant.id, email: 'elena@beaute.com', passwordHash: 'elena123', role: 'specialist', name: 'Elena Rossi', createdAt: day(3) },
      { tenantId: tenant.id, email: 'sofia@beaute.com', passwordHash: 'sofia123', role: 'specialist', name: 'Sofia Mendez', createdAt: day(3) },
    ]).returning();
    console.log(`   ${users.length} usuarios creados.`);
  } else {
    console.log(`ℹ️  ${users.length} usuarios existentes.`);
  }

  // =========================================================
  // 5. COLABORADORES (verificar / crear)
  // =========================================================
  let collaborators = await db.query.collaborators.findMany({
    where: eq(schema.collaborators.tenantId, tenant.id),
  });

  if (collaborators.length === 0) {
    console.log('💆 Creando colaboradores...');
    const specUsers = users.filter(u => u.role === 'specialist');
    collaborators = await db.insert(schema.collaborators).values([
      {
        tenantId: tenant.id,
        userId: specUsers[0]?.id,
        name: 'Elena Rossi',
        email: 'elena@beaute.com',
        phone: '+573151234567',
        specialties: ['Faciales', 'Masajes Corporales', 'Terapias de Relajación'],
        bio: 'Especialista enfocada en brindar el mejor diagnóstico estético.',
        docType: 'Cédula',
        docNumber: '1023456789',
        createdAt: day(3),
      },
      {
        tenantId: tenant.id,
        userId: specUsers[1]?.id,
        name: 'Sofia Mendez',
        email: 'sofia@beaute.com',
        phone: '+573109876543',
        specialties: ['Manicura Rusa', 'Diseño de Cejas', 'Pestañas Pelo a Pelo'],
        bio: 'Experta en nail art y diseño de cejas con más de 8 años.',
        docType: 'Cédula',
        docNumber: '1098765432',
        createdAt: day(3),
      },
    ]).returning();
    console.log(`   ${collaborators.length} colaboradores creados.`);
  } else {
    console.log(`ℹ️  ${collaborators.length} colaboradores existentes.`);
  }

  // =========================================================
  // 6. CLIENTES (verificar / crear - julio 3-7)
  // =========================================================
  let clients = await db.query.clients.findMany({
    where: eq(schema.clients.tenantId, tenant.id),
  });

  if (clients.length === 0) {
    console.log('📁 Creando clientes...');
    clients = await db.insert(schema.clients).values([
      { tenantId: tenant.id, name: 'Laura Gomez Restrepo', email: 'laura.gomez@gmail.com', phone: '+573001234567', notes: 'Piel muy sensible. Alérgica al eucalipto.', createdAt: day(3) },
      { tenantId: tenant.id, name: 'Maria Camila Restrepo', email: 'm.camila@hotmail.com', phone: '+573117654321', notes: 'Suele agendar fines de semana.', createdAt: day(4) },
      { tenantId: tenant.id, name: 'Paula Andrea Rojas', email: 'paula.rojas@outlook.com', phone: '+573159876543', notes: 'Manicura cada 15 días. Tonos nudes.', createdAt: day(5) },
      { tenantId: tenant.id, name: 'Natalia Vargas Lozano', email: 'natalia.vargas@gmail.com', phone: '+573045678901', notes: 'Busca tratamientos antiedad.', createdAt: day(6) },
      { tenantId: tenant.id, name: 'Carolina Osorio Marin', email: 'caro.osorio@gmail.com', phone: '+573112223344', notes: 'Cliente regular. Prefiere masajes corporales.', createdAt: day(7) },
      { tenantId: tenant.id, name: 'Daniela Suarez Pineda', email: 'daniela.suarez@gmail.com', phone: '+573134445566', notes: 'Primera visita - referida por Laura.', createdAt: day(7) },
    ]).returning();
    console.log(`   ${clients.length} clientes creados.`);
  } else {
    console.log(`ℹ️  ${clients.length} clientes existentes.`);
  }

  // =========================================================
  // 7. REGLAS DE COMISIÓN (verificar / crear)
  // =========================================================
  const existingRules = await db.query.commissionRules.findMany({
    where: eq(schema.commissionRules.tenantId, tenant.id),
  });

  if (existingRules.length === 0) {
    console.log('💰 Creando reglas de comisión...');
    await db.insert(schema.commissionRules).values([
      { tenantId: tenant.id, collaboratorId: collaborators[0].id, serviceId: services[0].id, commissionRate: '35.00' },
      { tenantId: tenant.id, collaboratorId: collaborators[0].id, serviceId: services[1].id, commissionRate: '40.00' },
      { tenantId: tenant.id, collaboratorId: collaborators[1].id, serviceId: services[2].id, commissionRate: '50.00' },
      { tenantId: tenant.id, collaboratorId: collaborators[1].id, serviceId: services[3].id, commissionRate: '30.00' },
    ]);
    console.log('   4 reglas de comisión creadas.');
  } else {
    console.log(`ℹ️  ${existingRules.length} reglas de comisión existentes.`);
  }

  // =========================================================
  // 8. HORARIOS DE COLABORADORES (verificar / crear)
  // =========================================================
  const existingSchedules = await db.query.collaboratorSchedules.findMany({
    where: eq(schema.collaboratorSchedules.tenantId, tenant.id),
  });

  if (existingSchedules.length === 0) {
    console.log('⏰ Creando horarios...');
    const schedulesData: any[] = [];
    for (const colab of collaborators) {
      for (let d = 1; d <= 6; d++) {
        schedulesData.push({
          tenantId: tenant.id,
          collaboratorId: colab.id,
          dayOfWeek: d,
          startTime: '09:00',
          endTime: '18:00',
          isActive: true,
        });
      }
    }
    await db.insert(schema.collaboratorSchedules).values(schedulesData);
    console.log(`   ${schedulesData.length} horarios creados.`);
  } else {
    console.log(`ℹ️  ${existingSchedules.length} horarios existentes.`);
  }

  // =========================================================
  // 9. FIDELIZACIÓN (verificar / crear)
  // =========================================================
  const existingLoyaltyConfig = await db.query.loyaltyConfig.findFirst({
    where: eq(schema.loyaltyConfig.tenantId, tenant.id),
  });

  if (!existingLoyaltyConfig) {
    console.log('⭐ Creando configuración de fidelización...');
    await db.insert(schema.loyaltyConfig).values({
      tenantId: tenant.id,
      pointsPerCurrencyUnit: 1,
      currencyUnit: '10000',
      inactivityDays: 45,
      isActive: true,
    });
    console.log('   Configuración de fidelización creada.');
  } else {
    console.log('ℹ️  Configuración de fidelización existente.');
  }

  const existingRewards = await db.query.loyaltyRewards.findMany({
    where: eq(schema.loyaltyRewards.tenantId, tenant.id),
  });

  if (existingRewards.length === 0) {
    console.log('🎁 Creando recompensas...');
    await db.insert(schema.loyaltyRewards).values([
      { tenantId: tenant.id, name: '10% Descuento', description: 'Descuento del 10% en tu próximo servicio', pointsCost: 50, type: 'discount_pct', value: '10', active: true },
      { tenantId: tenant.id, name: '20% Descuento', description: 'Descuento del 20% en tu próximo servicio', pointsCost: 100, type: 'discount_pct', value: '20', active: true },
      { tenantId: tenant.id, name: 'Servicio Gratis $50.000', description: 'Un servicio de hasta $50.000 completamente gratis', pointsCost: 200, type: 'discount_fixed', value: '50000', active: true },
      { tenantId: tenant.id, name: 'Manicure Básica Gratis', description: 'Manicure básica sin costo', pointsCost: 150, type: 'free_service', serviceId: services[2].id, active: true },
    ]);
    console.log('   4 recompensas creadas.');
  } else {
    console.log(`ℹ️  ${existingRewards.length} recompensas existentes.`);
  }

  // =========================================================
  // 10. VERIFICAR DATOS EXISTENTES DE JULIO
  // =========================================================
  const existingAppointments = await db.query.appointments.findMany({
    where: eq(schema.appointments.tenantId, tenant.id),
  });

  const FORCE_RESEED = process.env.FORCE === 'true';

  if (existingAppointments.length > 0) {
    if (FORCE_RESEED) {
      console.log(`\n🗑️  FORCE=true: Eliminando ${existingAppointments.length} citas y datos relacionados...\n`);

      await db.delete(schema.clientActivityLog)
        .where(eq(schema.clientActivityLog.tenantId, tenant.id));
      await db.delete(schema.loyaltyPoints)
        .where(eq(schema.loyaltyPoints.tenantId, tenant.id));

      const salesTxs = await db.query.transactions.findMany({
        where: and(
          eq(schema.transactions.tenantId, tenant.id),
          eq(schema.transactions.type, 'sale')
        ),
      });

      for (const tx of salesTxs) {
        await db.delete(schema.transactionItems)
          .where(eq(schema.transactionItems.transactionId, tx.id));
      }

      await db.delete(schema.transactions)
        .where(and(
          eq(schema.transactions.tenantId, tenant.id),
          eq(schema.transactions.type, 'sale')
        ));

      await db.delete(schema.appointments)
        .where(eq(schema.appointments.tenantId, tenant.id));

      console.log('   Datos eliminados correctamente.\n');
    } else {
      console.log(`\n⚠️  Ya existen ${existingAppointments.length} citas.`);
      console.log('   Para forzar re-ejecución usa: $env:FORCE="true"\n');
      console.log('   Ejemplo: $env:SEED_TENANT_SLUG="beaute-spa"; $env:FORCE="true"; npx tsx src/db/seed-july.ts\n');
      process.exit(0);
    }
  }

  // =========================================================
  // 11. BUCLE DIARIO: CITAS Y VENTAS (JULIO 1-30)
  // =========================================================
  console.log('\n📅 Generando citas y ventas diarias de julio...\n');

  const svcIds = services.map(s => s.id);
  const cliIds = clients.map(c => c.id);
  const colIds = collaborators.map(c => c.id);
  const commissionBaseRates = [0.35, 0.40, 0.50, 0.30]; // matching the 4 services
  const paymentMethods = ['cash', 'card', 'transfer'];
  const hours = [9, 10, 11, 14, 15, 16]; // varied start times
  const STATUS_SCHEDULED = 'scheduled';
  const STATUS_COMPLETED = 'completed';
  const STATUS_CANCELLED = 'cancelled';

  let totalSales = 0;
  let totalPoints = 0;

  for (let d = 1; d <= 30; d++) {
    const currentDay = day(d);
    const svcIdx = (d - 1) % svcIds.length;
    const cliIdx = (d - 1) % cliIds.length;
    const colIdx = (d - 1) % colIds.length;
    const hourIdx = (d - 1) % hours.length;

    // Determinamos el estado de la cita
    // Cancelada: 1 de cada 6 días
    const isCancelled = d % 6 === 0;
    // Completada: días pasados (1-29) o si no fue cancelada
    const isCompleted = d < 30 && !isCancelled;

    const status = isCancelled ? STATUS_CANCELLED
      : isCompleted ? STATUS_COMPLETED
      : STATUS_SCHEDULED;

    const service = services[svcIdx];
    const startHour = hours[hourIdx];
    const startTime = setHours(setMinutes(currentDay, 0), startHour);
    const endTime = setHours(setMinutes(currentDay, 0), startHour + 1);

    const [appointment] = await db.insert(schema.appointments).values({
      tenantId: tenant.id,
      clientId: cliIds[cliIdx],
      specialistId: colIds[colIdx],
      serviceId: svcIds[svcIdx],
      startTime,
      endTime,
      status,
      notes: status === STATUS_CANCELLED ? 'Cancelada con anticipación.' : null,
    }).returning();

    // Si la cita está completada, generamos transacción
    if (isCompleted) {
      const amount = parseFloat(service.price);
      const commissionRate = commissionBaseRates[svcIdx];
      const commissionAmount = amount * commissionRate;
      const method = paymentMethods[d % 3];

      const txDate = new Date(currentDay);
      txDate.setHours(txDate.getHours() + 1); // La venta ocurre 1 hora después de iniciada

      const [transaction] = await db.insert(schema.transactions).values({
        tenantId: tenant.id,
        clientId: cliIds[cliIdx],
        appointmentId: appointment.id,
        type: 'sale',
        amount: amount.toFixed(2),
        paymentMethod: method,
        description: `Venta por Cita - ${service.name}`,
        createdAt: txDate,
      }).returning();

      await db.insert(schema.transactionItems).values({
        transactionId: transaction.id,
        serviceId: svcIds[svcIdx],
        quantity: 1,
        unitPrice: service.price,
        collaboratorId: colIds[colIdx],
        commissionPaid: commissionAmount.toFixed(2),
      });

      // Puntos de fidelidad: 1 punto por cada $10.000 COP
      const points = Math.floor(amount / 10000);
      if (points > 0) {
        totalPoints += points;
        await db.insert(schema.loyaltyPoints).values({
          tenantId: tenant.id,
          clientId: cliIds[cliIdx],
          points,
          type: 'earned',
          referenceType: 'sale',
          description: `Puntos por compra: ${service.name}`,
          balanceAfter: totalPoints,
        });
      }

      totalSales++;
    }

    if (d % 5 === 0) {
      console.log(`   Día ${d}: ${status === STATUS_COMPLETED ? '✔ Completado' : status === STATUS_CANCELLED ? '✘ Cancelado' : '○ Agendado'} | ${service.name}`);
    }
  }

  console.log(`\n   Total: ${totalSales} ventas generadas, ${totalPoints} puntos de fidelidad acumulados.\n`);

  // =========================================================
  // 12. GASTOS (días específicos de julio)
  // =========================================================
  console.log('💸 Registrando gastos operativos...');
  const expenses = [
    { day: 2, amount: '45000.00', desc: 'Compra de esmaltes gel tonos otoño-invierno' },
    { day: 5, amount: '120000.00', desc: 'Mantenimiento preventivo autoclave esterilizador' },
    { day: 8, amount: '80000.00', desc: 'Insumos: Decolorante y aguas oxigenadas' },
    { day: 12, amount: '150000.00', desc: 'Servicio de luz y energía eléctrica' },
    { day: 15, amount: '95000.00', desc: 'Productos de limpieza y desinfección' },
    { day: 18, amount: '60000.00', desc: 'Insumos desechables (guantes, algodón, mascarillas)' },
    { day: 22, amount: '180000.00', desc: 'Compra de productos de belleza para reventa' },
    { day: 25, amount: '75000.00', desc: 'Mantenimiento equipos de estética y renovación de licencias' },
    { day: 28, amount: '110000.00', desc: 'Marketing digital y publicidad en redes sociales' },
  ];

  for (const exp of expenses) {
    await db.insert(schema.transactions).values({
      tenantId: tenant.id,
      type: 'expense',
      amount: exp.amount,
      paymentMethod: 'transfer',
      description: exp.desc,
      createdAt: day(exp.day),
    });
  }
  console.log(`   ${expenses.length} gastos registrados.\n`);

  // =========================================================
  // 13. MENSAJES CRM (días específicos)
  // =========================================================
  console.log('💬 Creando conversaciones CRM...');
  const messageConversations = [
    {
      day: 4,
      messages: [
        { direction: 'inbound', content: 'Hola! Tienen disponibilidad para un masaje relajante mañana?', status: 'read' },
        { direction: 'outbound', content: '¡Hola Laura! Claro que sí, tenemos cupo mañana a las 3:00 PM con Elena Rossi. ¿Te agendo?', status: 'read' },
        { direction: 'inbound', content: 'Sí, por favor! Me sirve ese horario.', status: 'read' },
      ],
      clientIdx: 0,
    },
    {
      day: 10,
      messages: [
        { direction: 'inbound', content: 'Buenos días! Quería saber si tienen faciales disponibles esta semana.', status: 'read' },
        { direction: 'outbound', content: '¡Claro Camila! Tenemos el Facial Rejuvenecedor Hialurónico disponible jueves y viernes.', status: 'delivered' },
      ],
      clientIdx: 1,
    },
    {
      day: 18,
      messages: [
        { direction: 'inbound', content: 'Hola, me gustaría agendar una manicura para el sábado.', status: 'read' },
        { direction: 'outbound', content: '¡Por supuesto Paula! Tengo espacio a las 11:00 AM con Sofia. ¿Te funciona?', status: 'read' },
        { direction: 'inbound', content: 'Perfecto, agéndame por favor. Gracias!', status: 'read' },
      ],
      clientIdx: 2,
    },
    {
      day: 25,
      messages: [
        { direction: 'inbound', content: 'Tienen promociones para clientes nuevos? Me recomendó Laura.', status: 'read' },
        { direction: 'outbound', content: '¡Bienvenida Daniela! Para nuevos clientes ofrecemos 15% de descuento en tu primer servicio.', status: 'read' },
        { direction: 'inbound', content: 'Qué bueno! Quiero agendar un masaje relajante.', status: 'read' },
      ],
      clientIdx: 5,
    },
  ];

  for (const conv of messageConversations) {
    for (let i = 0; i < conv.messages.length; i++) {
      const msg = conv.messages[i];
      await db.insert(schema.messages).values({
        tenantId: tenant.id,
        clientId: cliIds[conv.clientIdx],
        direction: msg.direction as 'inbound' | 'outbound',
        content: msg.content,
        channel: 'whatsapp',
        status: msg.status,
        createdAt: new Date(day(conv.day).getTime() + i * 3600000), // spaced by 1 hour each
      });
    }
  }
  console.log('   4 conversaciones (10 mensajes) creadas.\n');

  // =========================================================
  // 14. ACTIVIDAD DE CLIENTES (CRM)
  // =========================================================
  console.log('📋 Creando actividad de clientes...');
  const activities = [
    { day: 5, clientIdx: 0, action: 'note', desc: 'Cliente mencionó interés en tratamiento de acné para próxima visita.' },
    { day: 12, clientIdx: 0, action: 'reactivation_attempt', desc: 'Se contactó por WhatsApp para ofrecer promoción de regreso.' },
    { day: 8, clientIdx: 1, action: 'note', desc: 'Solicitó muestras de esmaltes nuevos para su próxima manicura.' },
    { day: 20, clientIdx: 3, action: 'note', desc: 'Muy satisfecha con el resultado del tratamiento. Quiere programa mensual.' },
    { day: 27, clientIdx: 4, action: 'reactivation_attempt', desc: 'Se envió recordatorio por correo de su cita recurrente.' },
  ];

  for (const act of activities) {
    await db.insert(schema.clientActivityLog).values({
      tenantId: tenant.id,
      clientId: cliIds[act.clientIdx],
      action: act.action,
      description: act.desc,
    });
  }
  console.log(`   ${activities.length} eventos de actividad creados.\n`);

  // =========================================================
  // 15. APERTURAS Y CIERRES DE CAJA
  // =========================================================
  console.log('🏦 Creando registros de caja...');
  const cashRegisterDays = [1, 8, 15, 22]; // cada lunes de julio (aprox)

  for (const d of cashRegisterDays) {
    const baseAmount = 100000 + d * 5000;
    const salesForDay = 50000 + d * 15000;

    // Apertura
    await db.insert(schema.cashRegisters).values({
      tenantId: tenant.id,
      openedByUserId: users[0]?.id,
      status: 'closed',
      initialBase: baseAmount.toFixed(2),
      openedAt: setHours(setMinutes(day(d), 0), 8),
      closedAt: setHours(setMinutes(day(d), 0), 18),
      expectedCash: (baseAmount + salesForDay).toFixed(2),
      declaredCash: (baseAmount + salesForDay + Math.floor(Math.random() * 5000)).toFixed(2),
      difference: (Math.floor(Math.random() * 5000)).toFixed(2),
      justification: 'Cierre normal de turno semanal.',
    });
  }
  console.log(`   ${cashRegisterDays.length} cierres de caja registrados.\n`);

  // =========================================================
  // FIN
  // =========================================================
  console.log('═══════════════════════════════════════');
  console.log('🎉 Siembra de julio 2026 completada!');
  console.log('═══════════════════════════════════════');
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Período: Julio 1-30, 2026`);
  console.log(`   Ventas generadas: ${totalSales}`);
  console.log(`   Gastos registrados: ${expenses.length}`);
  console.log(`   Citas creadas: 30`);
  console.log(`   Puntos fidelidad acumulados: ${totalPoints}`);
  console.log('═══════════════════════════════════════\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error durante la siembra:', err);
  process.exit(1);
});
