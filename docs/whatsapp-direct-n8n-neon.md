# WhatsApp directo con Evolution, n8n y Neon

## Arquitectura

- Evolution entrega eventos entrantes a un webhook autenticado del workflow multi-tenant de n8n.
- n8n valida/normaliza el evento, descarga y procesa audio o imagen, y llama a `POST /api/whatsapp/agent`.
- Miesbe resuelve el tenant exclusivamente mediante `instanceName` registrado en `whatsapp_instances`; el workflow no envía un `tenantId` de autoridad.
- Conversaciones, mensajes, cotizaciones y reservas quedan en Neon. Miesbe es la fuente de verdad del inbox.
- n8n usa Evolution para los envíos del agente y para las respuestas manuales de recepción.
- La integración API de servicios/citas queda disponible para otros consumidores. El inbox de atención ya no consulta ni envía mensajes a través del Hub.
- Las tablas `hub_*` se conservan como archivo histórico separado; no se importan sus conversaciones a las nuevas conversaciones nativas. Se mantiene la retención Hub vigente: el cron puede purgar proyecciones vencidas después de 90 días.

## Migración Neon

El esquema Drizzle está en `src/db/schema.ts`; el SQL está en `drizzle/0006_whatsapp_native_inbox.sql`. Aplicar las migraciones locales en orden sobre una base Neon de desarrollo antes de probar el inbox y antes de desplegar la UI. El workflow y las funciones nuevas esperan las tablas de esa migración.

## Configuración Miesbe

Definir los siguientes nombres en el entorno server-side de Miesbe. No agregar valores al repositorio:

- `MIESBE_N8N_API_KEY`: secreto aleatorio de al menos 32 bytes compartido con la credencial Bearer de n8n.
- `N8N_EVOLUTION_WEBHOOK_URL`: URL pública del webhook inbound n8n para mostrar en Ajustes → WhatsApp y Agente IA.
- `N8N_WHATSAPP_SEND_WEBHOOK_URL`: webhook de n8n al que Miesbe entrega las respuestas manuales.
- `N8N_WHATSAPP_SEND_SECRET`: secreto compartido para autenticar esas llamadas.
- `MIESBE_PUBLIC_URL`: origen público de Miesbe; si no se define, el endpoint se construye desde el host de la petición.

Miesbe valida las acciones del workflow y deriva el tenant desde la instancia. n8n no debe conectarse directamente a Neon ni aceptar un tenant arbitrario enviado en el body.

## Importar el workflow de n8n

El template Workflow SDK está en `n8n/miesbe_whatsapp_agent.ts`. Antes de importarlo, reemplaza `https://miesbe.example.com` y `https://evolution.example.com` por los orígenes del ambiente correspondiente. El workflow crea dos rutas: Evolution inbound y respuesta manual desde el inbox.

Crea y asigna estas credenciales n8n sin guardar sus valores en Git:

- `Evolution Webhook Auth`: header secreto que Evolution enviará al webhook inbound.
- `Miesbe Manual Send Auth`: header `x-miesbe-send-secret`, con `N8N_WHATSAPP_SEND_SECRET`.
- `Miesbe n8n API`: `Authorization: Bearer ...`, con `MIESBE_N8N_API_KEY`.
- `Evolution API`: header `apikey` de la API Evolution.
- `OpenAI Miesbe`: API key OpenAI para transcripción, visión y agente.

El webhook inbound acepta mensajes directos `messages.upsert`; ignora mensajes propios, grupos y eventos no soportados. Habilita en Evolution el envío de un header personalizado con el mismo valor configurado en `Evolution Webhook Auth`. Si la versión de Evolution no permite configurar headers, coloca el endpoint detrás de un proxy autenticado antes de conectarlo.

Configura n8n para no guardar los datos de ejecuciones exitosas ni el progreso de ejecución. Evolution puede adjuntar `apikey` y material cifrado de medios al evento original; el nodo de normalización evita propagar el `apikey`, y el historial de conversación se conserva en Neon, no en datos de ejecución n8n.

## Agente, cotizaciones y citas

- El agente recibe contexto del tenant, configuración IA, servicios, productos, profesionales, cliente e historial reciente desde Miesbe.
- El backend calcula los precios de la cotización con el catálogo vigente y guarda los valores ofrecidos como snapshot.
- Una cotización aceptada de tratamiento se convierte en cita solo si el cliente eligió un horario libre y lo confirmó; Miesbe vuelve a validar disponibilidad.
- Si no hay horario/profesional confirmado o la disponibilidad cambió, se asigna la conversación a recepción.
- La aceptación de una cotización POS se deriva a recepción. No registra un cobro ni una transacción; el POS sigue siendo la fuente de verdad de ventas.
- El agente no diagnostica ni prescribe. Las preguntas clínicas se transfieren a recepción o a un profesional.

## Verificación local

```bash
npm run typecheck
npm run build
npm test
npm run lint
```

Probar primero con un tenant e instancias de Evolution de desarrollo: texto, audio, imagen, webhook repetido, aceptación y rechazo de cotización, horario libre/ocupado, producto POS, takeover, respuesta manual y aislamiento entre tenants. El historial Hub anterior queda accesible en la pestaña **Archivo Hub** solo para lectura.
