import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { addDays, subDays, setHours, setMinutes } from 'date-fns';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8wW5PetGcpiE@ep-sparkling-darkness-atab8ji5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = neon(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log('🌱 Iniciando siembra de base de datos...');

  // 1. Limpiar base de datos
  console.log('🧹 Limpiando tablas existentes...');
  await db.delete(schema.commissionLiquidationItems);
  await db.delete(schema.transactionItems);
  await db.delete(schema.commissionLiquidations);
  await db.delete(schema.commissionRules);
  await db.delete(schema.transactions);
  await db.delete(schema.appointments);
  await db.delete(schema.cashRegisters);
  await db.delete(schema.clientActivityLog);
  await db.delete(schema.loyaltyPoints);
  await db.delete(schema.loyaltyRewards);
  await db.delete(schema.loyaltyConfig);
  await db.delete(schema.messages);
  await db.delete(schema.collaboratorSchedules);
  await db.delete(schema.accountsPayable);
  await db.delete(schema.accountsReceivable);
  await db.delete(schema.services);
  await db.delete(schema.products);
  await db.delete(schema.clients);
  await db.delete(schema.collaborators);
  await db.delete(schema.users);
  await db.delete(schema.tenants);

  console.log('✅ Base de datos limpia.');

  // 2. Insertar Tenants
  console.log('🏢 Creando Inquilinos (Tenants)...');
  const [tenantSpa, tenantGlam] = await db.insert(schema.tenants).values([
    { name: 'Beauté Spa & Bienestar', slug: 'beaute-spa', nit: '900.123.456-7', phone: '+573001234567', email: 'contacto@beaute.com', address: 'Calle 85 #15-45', city: 'Bogotá', country: 'Colombia', currency: 'COP', category: 'Spa', website: 'https://beaute.com', instagram: '@beaute_spa' },
    { name: 'Hair Glam Salón', slug: 'hair-glam', nit: '800.456.789-1', phone: '+573202223344', email: 'info@hairglam.co', address: 'Av. Chile #42-20', city: 'Medellín', country: 'Colombia', currency: 'COP', category: 'Salón de belleza', website: 'https://hairglam.co', instagram: '@hairglam_studio' },
  ]).returning();

  console.log(`- Creado: ${tenantSpa.name} (${tenantSpa.id})`);
  console.log(`- Creado: ${tenantGlam.name} (${tenantGlam.id})`);

  // 3. Insertar Usuarios
  console.log('👥 Creando Cuentas de Usuarios de la App...');
  
  // Usuarios de Beauté Spa
  const [spaAdmin, spaReception, spaSpecialist1, spaSpecialist2] = await db.insert(schema.users).values([
    {
      tenantId: tenantSpa.id,
      email: 'admin@beaute.com',
      passwordHash: 'admin123', // En un entorno real se encriptaría
      role: 'admin',
      name: 'Elena Rossi (Administradora)',
    },
    {
      tenantId: tenantSpa.id,
      email: 'recepcion@beaute.com',
      passwordHash: 'recep123',
      role: 'receptionist',
      name: 'Camila Díaz',
    },
    {
      tenantId: tenantSpa.id,
      email: 'elena@beaute.com',
      passwordHash: 'elena123',
      role: 'specialist',
      name: 'Elena Rossi',
    },
    {
      tenantId: tenantSpa.id,
      email: 'sofia@beaute.com',
      passwordHash: 'sofia123',
      role: 'specialist',
      name: 'Sofia Mendez',
    }
  ]).returning();

  // Usuarios de Hair Glam
  const [glamAdmin, glamReception, glamSpecialist1, glamSpecialist2] = await db.insert(schema.users).values([
    {
      tenantId: tenantGlam.id,
      email: 'admin@hairglam.com',
      passwordHash: 'admin123',
      role: 'admin',
      name: 'Carlos Sanchez (Admin)',
    },
    {
      tenantId: tenantGlam.id,
      email: 'recepcion@hairglam.com',
      passwordHash: 'recep123',
      role: 'receptionist',
      name: 'Valeria Luna',
    },
    {
      tenantId: tenantGlam.id,
      email: 'carlos@hairglam.com',
      passwordHash: 'carlos123',
      role: 'specialist',
      name: 'Carlos Sanchez',
    },
    {
      tenantId: tenantGlam.id,
      email: 'ana@hairglam.com',
      passwordHash: 'ana123',
      role: 'specialist',
      name: 'Ana Maria Ortiz',
    }
  ]).returning();

  // 4. Insertar Colaboradores (Especialistas)
  console.log('💆 Creando Colaboradores / Especialistas...');
  const [colabElena, colabSofia] = await db.insert(schema.collaborators).values([
    {
      tenantId: tenantSpa.id,
      userId: spaSpecialist1.id,
      name: 'Elena Rossi',
      email: 'elena@beaute.com',
      phone: '+573151234567',
      specialties: ['Faciales', 'Masajes Corporales', 'Terapias de Relajación'],
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      bio: 'Especialista enfocado en brindar el mejor diagnóstico estético y tratamientos de alta calidad.',
      experience: 'Especialista Principal\nAura Beauty Clinic — 2018 - Presente',
      docType: 'Cédula',
      docNumber: '1023456789',
    },
    {
      tenantId: tenantSpa.id,
      userId: spaSpecialist2.id,
      name: 'Sofia Mendez',
      email: 'sofia@beaute.com',
      phone: '+573109876543',
      specialties: ['Manicura Rusa', 'Diseño de Cejas', 'Pestañas Pelo a Pelo'],
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      bio: 'Experta en nail art y diseño de cejas con más de 8 años de experiencia.',
      experience: 'Especialista Senior\nAura Beauty Clinic — 2019 - Presente',
      docType: 'Cédula',
      docNumber: '1098765432',
    }
  ]).returning();

  const [colabCarlos, colabAna] = await db.insert(schema.collaborators).values([
    {
      tenantId: tenantGlam.id,
      userId: glamSpecialist1.id,
      name: 'Carlos Sanchez',
      email: 'carlos@hairglam.com',
      phone: '+573201112233',
      specialties: ['Balayage', 'Cortes de Dama', 'Peinados de Gala'],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Maestro peluquero especializado en colorimetría y técnicas de alto impacto.',
      experience: 'Director Creativo\nHair Glam Studio — 2017 - Presente',
      docType: 'Tarjeta de Identidad',
      docNumber: '12345678',
    },
    {
      tenantId: tenantGlam.id,
      userId: glamSpecialist2.id,
      name: 'Ana Maria Ortiz',
      email: 'ana@hairglam.com',
      phone: '+573124445566',
      specialties: ['Keratinas', 'Hidratación Orgánica', 'Colorimetría'],
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      bio: 'Profesional certificada en tratamientos capilares orgánicos y colorimetría avanzada.',
      experience: 'Especialista en Colorimetría\nHair Glam Studio — 2020 - Presente',
      docType: 'Pasaporte',
      docNumber: 'AB123456',
    }
  ]).returning();

  // 5. Insertar Servicios / Tratamientos
  console.log('💅 Creando Servicios y Tratamientos...');
  const [spaFacial, spaMasaje, spaManicura, spaPies] = await db.insert(schema.services).values([
    {
      tenantId: tenantSpa.id,
      name: 'Facial Rejuvenecedor con Ácido Hialurónico',
      description: 'Limpieza profunda, exfoliación, vaporización, extracción y mascarilla de colágeno.',
      duration: 60,
      price: '85.00',
    },
    {
      tenantId: tenantSpa.id,
      name: 'Masaje Relajante de Piedras Volcánicas',
      description: 'Terapia con piedras de basalto calientes aplicadas en puntos clave del cuerpo para aliviar tensión.',
      duration: 75,
      price: '120.00',
    },
    {
      tenantId: tenantSpa.id,
      name: 'Manicura Rusa Express + Esmaltado Semi',
      description: 'Limpieza profunda de cutículas con torno e hidratación con aceites aromáticos.',
      duration: 45,
      price: '45.00',
    },
    {
      tenantId: tenantSpa.id,
      name: 'Spa de Pies Hidratante y Exfoliante',
      description: 'Tinas de hidromasaje, exfoliación de sales marinas, mascarilla de barro y masaje relajante.',
      duration: 50,
      price: '55.00',
    }
  ]).returning();

  const [glamBalayage, glamCorte, glamPeinado, glamKeratina] = await db.insert(schema.services).values([
    {
      tenantId: tenantGlam.id,
      name: 'Balayage Blonde Premium',
      description: 'Aclaración de medios a puntas con técnica mano alzada, matizante hidratante y cepillado.',
      duration: 180,
      price: '180.00',
    },
    {
      tenantId: tenantGlam.id,
      name: 'Corte de Dama & Estilizado con Ondas',
      description: 'Corte personalizado según morfología del rostro, lavado, secado y ondas glam.',
      duration: 60,
      price: '50.00',
    },
    {
      tenantId: tenantGlam.id,
      name: 'Peinado Profesional para Gala o Novia',
      description: 'Recogidos, trenzas estructuradas o peinado suelto con fijadores premium de larga duración.',
      duration: 90,
      price: '90.00',
    },
    {
      tenantId: tenantGlam.id,
      name: 'Tratamiento de Keratina Orgánica e Hidratación',
      description: 'Alisado termomotivado libre de formol, ideal para control de frizz y brillo espejo.',
      duration: 120,
      price: '130.00',
    }
  ]).returning();

  // 5b. Insertar Reglas de Comisión
  console.log('💰 Creando Reglas de Comisión Dinámicas...');
  await db.insert(schema.commissionRules).values([
    { tenantId: tenantSpa.id, collaboratorId: colabElena.id, serviceId: spaFacial.id, commissionRate: '35.00' },
    { tenantId: tenantSpa.id, collaboratorId: colabElena.id, serviceId: spaMasaje.id, commissionRate: '40.00' },
    { tenantId: tenantSpa.id, collaboratorId: colabSofia.id, serviceId: spaManicura.id, commissionRate: '50.00' },
    { tenantId: tenantSpa.id, collaboratorId: colabSofia.id, serviceId: spaPies.id, commissionRate: '30.00' },
    { tenantId: tenantGlam.id, collaboratorId: colabCarlos.id, serviceId: glamBalayage.id, commissionRate: '45.00' },
    { tenantId: tenantGlam.id, collaboratorId: colabCarlos.id, serviceId: glamCorte.id, commissionRate: '30.00' },
    { tenantId: tenantGlam.id, collaboratorId: colabAna.id, serviceId: glamPeinado.id, commissionRate: '35.00' },
    { tenantId: tenantGlam.id, collaboratorId: colabAna.id, serviceId: glamKeratina.id, commissionRate: '40.00' },
  ]);

  // 6. Insertar Clientes
  console.log('📁 Creando Clientes para el CRM...');
  
  // Clientes de Spa
  const [spaClient1, spaClient2, spaClient3] = await db.insert(schema.clients).values([
    {
      tenantId: tenantSpa.id,
      name: 'Laura Gomez Restrepo',
      email: 'laura.gomez@gmail.com',
      phone: '+573001234567',
      notes: 'Piel muy sensible. Prefiere masajes de intensidad suave. Alérgica al eucalipto.',
    },
    {
      tenantId: tenantSpa.id,
      name: 'Maria Camila Restrepo',
      email: 'm.camila@hotmail.com',
      phone: '+573117654321',
      notes: 'Suele agendar los fines de semana. Fanática del té verde durante sus tratamientos.',
    },
    {
      tenantId: tenantSpa.id,
      name: 'Paula Andrea Rojas',
      email: 'paula.rojas@outlook.com',
      phone: '+573159876543',
      notes: 'Realiza manicura cada 15 días. Tonos favoritos: Nudes y Terracotas.',
    }
  ]).returning();

  // Clientes de Hair Glam
  const [glamClient1, glamClient2, glamClient3] = await db.insert(schema.clients).values([
    {
      tenantId: tenantGlam.id,
      name: 'Valentina Herrera Silva',
      email: 'valentina.hs@gmail.com',
      phone: '+573012223344',
      notes: 'Cabello seco tinturado. Último Balayage fue hace 6 meses. Necesita hidratación extrema.',
    },
    {
      tenantId: tenantGlam.id,
      name: 'Diana Marcela Caro',
      email: 'diana.caro@gmail.com',
      phone: '+573215556677',
      notes: 'Corte recto clásico. Asiste mensualmente para cepillado y ondas.',
    },
    {
      tenantId: tenantGlam.id,
      name: 'Carolina Giraldo',
      email: 'carogiraldo@gmail.com',
      phone: '+573189998877',
      notes: 'Realiza tratamiento de Keratina cada 4 meses.',
    }
  ]).returning();

  // 7. Insertar Citas (Semana actual)
  console.log('📅 Creando Citas (Calendario)...');
  const today = new Date();
  
  const [app1, app2, app3, app4] = await db.insert(schema.appointments).values([
    // Cita Pasada (Beauté Spa) - Completada
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      specialistId: colabElena.id,
      serviceId: spaFacial.id,
      startTime: setHours(setMinutes(subDays(today, 1), 0), 10), // Ayer 10:00 AM
      endTime: setHours(setMinutes(subDays(today, 1), 0), 11),   // Ayer 11:00 AM
      status: 'completed',
      notes: 'Cliente muy satisfecha. Se vendió bloqueador solar como producto adicional.',
    },
    // Cita Hoy (Beauté Spa) - Programada
    {
      tenantId: tenantSpa.id,
      clientId: spaClient2.id,
      specialistId: colabSofia.id,
      serviceId: spaManicura.id,
      startTime: setHours(setMinutes(today, 30), 14), // Hoy 2:30 PM
      endTime: setHours(setMinutes(today, 15), 15),  // Hoy 3:15 PM
      status: 'scheduled',
      notes: 'Requiere decoración con flores pintadas a mano.',
    },
    // Cita Futura (Beauté Spa) - Programada
    {
      tenantId: tenantSpa.id,
      clientId: spaClient3.id,
      specialistId: colabElena.id,
      serviceId: spaMasaje.id,
      startTime: setHours(setMinutes(addDays(today, 1), 0), 16), // Mañana 4:00 PM
      endTime: setHours(setMinutes(addDays(today, 1), 15), 17),  // Mañana 5:15 PM
      status: 'scheduled',
      notes: 'Regalo de cumpleaños por parte de su esposo.',
    },
    // Cita Cancelada (Beauté Spa) - Cancelada
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      specialistId: colabSofia.id,
      serviceId: spaPies.id,
      startTime: setHours(setMinutes(subDays(today, 2), 0), 9), // Hace 2 días 9:00 AM
      endTime: setHours(setMinutes(subDays(today, 2), 50), 9),  // Hace 2 días 9:50 AM
      status: 'cancelled',
      notes: 'Canceló por calamidad doméstica con 24h de anticipación.',
    }
  ]).returning();

  const [appGlam1, appGlam2, appGlam3] = await db.insert(schema.appointments).values([
    // Cita Pasada (Hair Glam) - Completada
    {
      tenantId: tenantGlam.id,
      clientId: glamClient1.id,
      specialistId: colabCarlos.id,
      serviceId: glamBalayage.id,
      startTime: setHours(setMinutes(subDays(today, 2), 0), 11), // Hace 2 dias 11:00 AM
      endTime: setHours(setMinutes(subDays(today, 2), 0), 14),   // Hace 2 dias 2:00 PM
      status: 'completed',
      notes: 'Balayage Blonde exitoso, se utilizó decolorante plex.',
    },
    // Cita Hoy (Hair Glam) - Completada (Ya transcurrió por la hora)
    {
      tenantId: tenantGlam.id,
      clientId: glamClient2.id,
      specialistId: colabAna.id,
      serviceId: glamCorte.id,
      startTime: setHours(setMinutes(today, 0), 9), // Hoy 9:00 AM
      endTime: setHours(setMinutes(today, 0), 10),  // Hoy 10:00 AM
      status: 'completed',
      notes: 'Corte Bob en capas, lavado y ondas.',
    },
    // Cita Futura (Hair Glam) - Programada
    {
      tenantId: tenantGlam.id,
      clientId: glamClient3.id,
      specialistId: colabAna.id,
      serviceId: glamKeratina.id,
      startTime: setHours(setMinutes(addDays(today, 2), 30), 10), // En 2 dias 10:30 AM
      endTime: setHours(setMinutes(addDays(today, 2), 30), 12),  // En 2 dias 12:30 PM
      status: 'scheduled',
      notes: 'Cabello abundante. Requiere dos estilistas de apoyo en el sellado si es posible.',
    }
  ]).returning();

  // 8. Insertar Transacciones (POS y Gastos)
  console.log('💳 Creando Transacciones Financieras y Comisiones...');
  
  // Transacciones Pasadas de Spa (Ingreso por cita completada)
  const [tSpaSale1] = await db.insert(schema.transactions).values([
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      appointmentId: app1.id,
      type: 'sale',
      amount: '85.00',
      paymentMethod: 'card',
      description: 'Venta por Cita - Facial Rejuvenecedor',
      createdAt: subDays(today, 1),
    }
  ]).returning();

  // Detalle de Venta e Items de la venta (para comisiones)
  await db.insert(schema.transactionItems).values([
    {
      transactionId: tSpaSale1.id,
      serviceId: spaFacial.id,
      quantity: 1,
      unitPrice: '85.00',
      collaboratorId: colabElena.id,
      commissionPaid: '29.75', // 85 * 35%
    }
  ]);

  // Transacciones de Spa (Gastos Operativos)
  await db.insert(schema.transactions).values([
    {
      tenantId: tenantSpa.id,
      type: 'expense',
      amount: '45.00',
      description: 'Compra de esmaltes de gel tonos otoño-invierno (Insumos)',
      createdAt: subDays(today, 3),
    },
    {
      tenantId: tenantSpa.id,
      type: 'expense',
      amount: '120.00',
      description: 'Mantenimiento preventivo autoclave esterilizador',
      createdAt: subDays(today, 5),
    }
  ]);

  // Transacciones Pasadas de Hair Glam (Ventas)
  const [tGlamSale1, tGlamSale2] = await db.insert(schema.transactions).values([
    {
      tenantId: tenantGlam.id,
      clientId: glamClient1.id,
      appointmentId: appGlam1.id,
      type: 'sale',
      amount: '180.00',
      paymentMethod: 'transfer',
      description: 'Venta por Cita - Balayage Blonde Premium',
      createdAt: subDays(today, 2),
    },
    {
      tenantId: tenantGlam.id,
      clientId: glamClient2.id,
      appointmentId: appGlam2.id,
      type: 'sale',
      amount: '50.00',
      paymentMethod: 'cash',
      description: 'Venta por Cita - Corte de Dama & Estilizado',
      createdAt: today,
    }
  ]).returning();

  // Detalles de Venta e Items de Hair Glam (Comisiones)
  await db.insert(schema.transactionItems).values([
    {
      transactionId: tGlamSale1.id,
      serviceId: glamBalayage.id,
      quantity: 1,
      unitPrice: '180.00',
      collaboratorId: colabCarlos.id,
      commissionPaid: '72.00', // 180 * 40%
    },
    {
      transactionId: tGlamSale2.id,
      serviceId: glamCorte.id,
      quantity: 1,
      unitPrice: '50.00',
      collaboratorId: colabAna.id,
      commissionPaid: '20.00', // 50 * 40% (Ana tiene base 35% pero el corte da 40% o se toma el 40% de Carlos, tomamos el del colaborador sobre el precio)
    }
  ]);

  // Transacciones de Hair Glam (Gastos Operativos)
  await db.insert(schema.transactions).values([
    {
      tenantId: tenantGlam.id,
      type: 'expense',
      amount: '80.00',
      description: 'Insumos: Decolorante L\'Oreal y aguas oxigenadas de 20v y 30v',
      createdAt: subDays(today, 4),
    },
    {
      tenantId: tenantGlam.id,
      type: 'expense',
      amount: '150.00',
      description: 'Servicio de luz y energía eléctrica (Salón)',
      createdAt: subDays(today, 10),
    }
  ]);

  // 9. Horarios semanales fijos de Colaboradores
  console.log('⏰ Creando Horarios semanales fijos de Especialistas...');
  const specialists = [colabElena, colabSofia, colabCarlos, colabAna];
  const schedulesList = [];
  
  for (const sp of specialists) {
    // Horario estándar de Lunes (1) a Sábado (6) de 9 AM a 6 PM
    for (let day = 1; day <= 6; day++) {
      schedulesList.push({
        tenantId: sp.tenantId,
        collaboratorId: sp.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true,
      });
    }
  }
  await db.insert(schema.collaboratorSchedules).values(schedulesList);

  // 10. Mensajes (CRM Conversacional - Whatsapp simulado)
  console.log('💬 Creando Mensajes y conversaciones del CRM...');
  await db.insert(schema.messages).values([
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      direction: 'inbound',
      content: 'Hola! Tienen disponibilidad para un masaje relajante mañana en la tarde?',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 2),
    },
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      direction: 'outbound',
      content: '¡Hola Laura! Claro que sí, tenemos espacio disponible a las 4:00 PM con Elena Rossi. ¿Te gustaría agendar en ese horario?',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 2),
    },
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      direction: 'inbound',
      content: 'Perfecto, sí! Por favor agéndame para mañana a las 4:00 PM.',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 2),
    },
    {
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      direction: 'outbound',
      content: 'Listo Laura, tu cita para el Masaje Relajante ha sido programada con éxito para mañana a las 4:00 PM. ¡Te esperamos!',
      channel: 'whatsapp',
      status: 'delivered',
      createdAt: subDays(today, 2),
    },
    // Conversación de Hair Glam
    {
      tenantId: tenantGlam.id,
      clientId: glamClient1.id,
      direction: 'inbound',
      content: 'Buenas tardes, quisiera cotizar un balayage premium para cabello largo.',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 4),
    },
    {
      tenantId: tenantGlam.id,
      clientId: glamClient1.id,
      direction: 'outbound',
      content: '¡Hola Valentina! Un gusto saludarte. El Balayage Premium para cabello largo está en $180.00, incluye lavado, tratamiento protector plex y ondas al finalizar. ¿Deseas reservar una cita de diagnóstico?',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 4),
    },
    {
      tenantId: tenantGlam.id,
      clientId: glamClient1.id,
      direction: 'inbound',
      content: 'Sí, me gustaría agendar de una vez para el fin de semana si se puede.',
      channel: 'whatsapp',
      status: 'read',
      createdAt: subDays(today, 3),
    }
  ]);

  // Loyalty Seed Data
  console.log('⭐ Creando datos de fidelizacion...');

  await db.insert(schema.loyaltyConfig).values({
    tenantId: tenantSpa.id,
    pointsPerCurrencyUnit: 1,
    currencyUnit: '10000',
    inactivityDays: 45,
    isActive: true,
  });

  await db.insert(schema.loyaltyRewards).values([
    {
      tenantId: tenantSpa.id,
      name: '10% Descuento',
      description: 'Descuento del 10% en tu proximo servicio',
      pointsCost: 50,
      type: 'discount_pct',
      value: '10',
      active: true,
    },
    {
      tenantId: tenantSpa.id,
      name: '20% Descuento',
      description: 'Descuento del 20% en tu proximo servicio',
      pointsCost: 100,
      type: 'discount_pct',
      value: '20',
      active: true,
    },
    {
      tenantId: tenantSpa.id,
      name: 'Servicio Gratis',
      description: 'Un servicio de hasta S/50.000 completamente gratis',
      pointsCost: 200,
      type: 'discount_fixed',
      value: '50000',
      active: true,
    },
    {
      tenantId: tenantSpa.id,
      name: 'Manicure Basica Gratis',
      description: 'Manicure basica sin costo',
      pointsCost: 150,
      type: 'free_service',
      serviceId: spaManicura.id,
      active: true,
    },
  ]);

  if (spaClient1) {
    let balance = 0;

    await db.insert(schema.loyaltyPoints).values({
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      points: 30,
      type: 'earned',
      referenceType: 'appointment',
      description: 'Cita: Masaje relajante',
      balanceAfter: 30,
    });
    balance = 30;

    await db.insert(schema.loyaltyPoints).values({
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      points: 20,
      type: 'earned',
      referenceType: 'appointment',
      description: 'Cita: Tratamiento facial',
      balanceAfter: balance + 20,
    });
    balance += 20;

    await db.insert(schema.loyaltyPoints).values({
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      points: 15,
      type: 'earned',
      referenceType: 'appointment',
      description: 'Cita: Depilacion laser',
      balanceAfter: balance + 15,
    });

    await db.insert(schema.clientActivityLog).values({
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      action: 'reactivation_attempt',
      description: 'Se contacto por WhatsApp para ofrecer promocion de regreso',
      metadata: { channel: 'whatsapp' },
    });

    await db.insert(schema.clientActivityLog).values({
      tenantId: tenantSpa.id,
      clientId: spaClient1.id,
      action: 'note',
      description: 'Cliente menciono interes en tratamiento de acné para proxima visita',
    });
  }

  if (spaClient2) {
    await db.insert(schema.loyaltyPoints).values({
      tenantId: tenantSpa.id,
      clientId: spaClient2.id,
      points: 45,
      type: 'earned',
      referenceType: 'appointment',
      description: 'Cita: Masaje terapeutico',
      balanceAfter: 45,
    });

    await db.insert(schema.loyaltyPoints).values({
      tenantId: tenantSpa.id,
      clientId: spaClient2.id,
      points: 25,
      type: 'earned',
      referenceType: 'appointment',
      description: 'Cita: Aromaterapia',
      balanceAfter: 70,
    });
  }

  console.log('🎉 ¡Siembra completada exitosamente!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error durante la siembra de la base de datos:', err);
  process.exit(1);
});
