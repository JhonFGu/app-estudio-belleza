# Integración Hub de agentes ↔ Miesbe (MVP)

## Estado y autoridad

- El Hub administra WhatsApp, agente, conversaciones, mensajes oficiales y estado de entrega.
- Miesbe administra clientes, servicios, productos, horarios/disponibilidad y citas. Sus APIs Hub v1 siguen autenticadas con una API key ligada al tenant.
- Miesbe conserva una proyección temporal del inbox para que el personal pueda consultarlo. No es fuente oficial ni permite cambiar estado conversacional mediante escrituras locales.
- Las acciones de respuesta, takeover y borrado de Miesbe se envían al Hub mediante el cliente server-side; no se escribe una conversación oficial localmente.
- Miesbe no conecta proveedor WhatsApp ni envía mensajes directamente a WhatsApp.

## APIs de negocio Miesbe que ya existen

| Endpoint | Métodos/uso | Autenticación y tenant | Idempotencia / observaciones |
|---|---|---|---|
| `/api/v1/clients` | GET por teléfono o todos; POST cliente mínimo (`name`, `phone`, email/notes opcionales) | `Authorization: Bearer` o `X-Api-Key`; tenant sale de la API key | GET no aplica. POST no usa idempotency key; no se debe reintentar creación automáticamente sin acordar estrategia. |
| `/api/v1/services` | GET servicios activos (`duration_minutes`, `price`) | API key ligada al tenant | Lectura. |
| `/api/v1/professionals` | GET profesionales activos | API key ligada al tenant | Lectura. |
| `/api/v1/availability` | GET por `service_id`, rango `from/to` (máx. 31 días), zona horaria y profesional opcional | API key ligada al tenant | Lectura calculada desde schedules y citas. |
| `/api/v1/appointments` | GET lista paginada/detalle; POST crear | API key ligada al tenant | Escrituras aceptan `Idempotency-Key`; creación valida recursos/tenant y colisiones. |
| `/api/v1/appointments/{id}/cancel` | POST cancelar | API key ligada al tenant | Idempotencia disponible mediante `Idempotency-Key`. |
| `/api/v1/appointments/{id}/reschedule` | POST reprogramar (`start_at`) | API key ligada al tenant | Idempotencia disponible; revisa conflicto. |
| `/api/products` | CRUD legacy | Requiere `x-tenant-id`, no API key Hub ni autenticación de identidad en el handler | No idempotencia. No se recomienda exponerlo al Hub; falta endpoint de productos dentro de API server-to-server si el Hub confirma necesidad. |
| `/api/clients`, `/api/services`, `/api/schedules`, `/api/appointments` | CRUD legacy para UI | Requieren `x-tenant-id`; el handler no valida sesión ni que el usuario sea miembro de ese tenant | Sin idempotencia general. Se mantienen por compatibilidad y no deben sustituir la API Hub v1. |

Errores de Hub v1: 401 API key ausente/inválida, 404 recurso/relación ausente, 409 slot ocupado/clave idempotente reutilizada con otro cuerpo, 422 validación, 500 interno. En particular el header `x-tenant-id` por sí solo **no** autentica al Hub.

## Flujo implementado en Miesbe

1. Hub envía un envelope v1 firmado a `POST /api/hub/events` con `X-Hub-Timestamp`, `X-Hub-Signature` y `X-Hub-Event-Id`.
2. La ruta Vercel `POST /api/hub/events` está implementada como función dedicada en `api/hub/events.ts` (sin body parser automático; `config.api.bodyParser=false`). `tenant_id` solo selecciona una asociación activa; el HMAC se verifica sobre el body crudo antes de insertar cualquier evento. No hay asociación activa: `404 TENANT_NOT_ASSOCIATED`; firma inválida o timestamp vencido: `401 INVALID_SIGNATURE`; ninguno persiste eventos. El header de evento debe coincidir con `event_id` (`400 EVENT_ID_MISMATCH`).
3. Miesbe registra `event_id` y SHA-256 del body crudo; el mismo ID con snapshot distinto se rechaza. Reintentos idénticos son idempotentes. La proyección de conversaciones y mensajes usa IDs Hub y secuencia monotónica por conversación.
4. Miesbe presenta la proyección en `/api/hub/inbox` a usuarios con sesión Miesbe y permiso de lectura de Mensajes.
5. Para contestar/takeover/borrar, la UI llama `POST /api/hub/inbox`; servidor deriva tenant de la sesión, verifica permiso y conversación y llama al endpoint Hub exacto con la key Bearer cifrada y scope correspondiente.

## Autenticación y secretos

- Cada tenant dispone de un secreto aleatorio independiente para HMAC Hub→Miesbe.
- Miesbe cifra el secreto en DB con AES-256-GCM. La clave maestra base64 de 32 bytes vive solo como variable de entorno server-side `HUB_INTEGRATION_MASTER_KEY`.
- Configuración asistida se realiza con `node scratch/configure-hub-integration.mjs`, conexión Neon autorizada, clave maestra, secret de evento y Hub API key ingresados en prompts ocultos; confirma el slug antes de escribir. La key Hub debe incluir `conversations:read`, `messages:write`, `takeover:manage` y `conversations:delete`. Rotar el secret de evento conserva la versión anterior por 15 minutos.
- Headers: `X-Hub-Timestamp` (Unix seconds), `X-Hub-Event-Id` (debe coincidir con `event_id`) y `X-Hub-Signature: sha256=<hex>`. Firma = HMAC-SHA256(secret, bytes UTF-8 de `${timestamp}.` concatenados con el body crudo exacto). Tolerancia: 5 minutos.
- `api/hub/events.ts` desactiva body parser para preservar el body crudo. Body parseado/re-serializado se rechaza. Máximo 256 KiB.
- Respuestas de eventos: `202 { accepted: true, duplicate: false }` al aplicar; `200 { accepted: true, duplicate: true }` para ID/hash ya procesado. Errores usan `{ error: { code, message } }`: entre otros `400 INVALID_EVENT`/`EVENT_ID_MISMATCH`, `401 INVALID_SIGNATURE`, `404 TENANT_NOT_ASSOCIATED`, `409 EVENT_ID_REUSED`, `413 EVENT_TOO_LARGE`, `422 INVALID_EVENT`/`INVALID_EVENT_DATA` y `503 EVENT_RETRYABLE`.
- Sesiones de UI usan `X-Session-Token`; Miesbe hashea el token y consulta `auth_sessions`, determina tenant desde el usuario y no acepta tenant del browser como autorización.
- No registrar firmas, body de eventos, contenidos de mensajes, secretos ni `DATABASE_URL`.

Variables (nombres, nunca valores en documentación):

- `DATABASE_URL`: DB de Miesbe.
- `HUB_INTEGRATION_MASTER_KEY`: llave server-only AES-256-GCM, base64 de 32 bytes.
- `HUB_BASE_URL`: origen HTTPS del Hub; configurar Preview solo en Environment Preview. Production queda sin valor hasta confirmar su hostname. No hay fallback ni URL Preview hardcoded.
- `CRON_SECRET`: protege cron de limpieza de proyección.
- Credenciales/Miesbe tenant ↔ Hub tenant y secreto HMAC por tenant se almacenan cifrados en `hub_tenant_integrations`.
- La API key Hub saliente se guarda cifrada por tenant en `hub_api_credential_ciphertext`, nunca en cliente.
- El OpenAPI de Miesbe está en `openapi-miesbe-hub-inbox.yaml`; el contrato upstream que consume su cliente backend está en `openapi-hub-client.yaml`.

## Proyección, estados y retención

Tablas: `hub_tenant_integrations`, `hub_conversations`, `hub_conversation_messages`, `hub_inbox_events`.

La proyección guarda IDs externos Hub, autor/origen, dirección, timestamps, secuencia, estado y contenido necesario para el inbox. Deduplica eventos por `(tenant,event_id)` y mensajes por `(tenant,hub_message_id)`. Secuencias antiguas no retroceden el estado actual de conversación; mensajes históricos fuera de orden aún se insertan con su timestamp y su ID estable.

Estados de evento Hub actualmente usados: `received` para inbound y `sent`, `failed`, `unknown` en `message.delivery_updated`. `sent` solo significa aceptación HTTP de Evolution; no confirma entrega ni lectura WhatsApp. `unknown` es ambiguo y nunca debe reenviarse automáticamente ni con una key distinta. Miesbe muestra el estado tal como Hub lo devuelve.

Las proyecciones expiran 90 días después de actividad/evento y se borran diariamente mediante `/api/cron/hub-inbox-retention`, protegido por `CRON_SECRET`. El evento Hub de borrado redacciona inmediatamente contenido, autor/contacto y relación con datos personales en Miesbe; quedan solo IDs mínimos/eventos dedupe con expiración temporal y luego se eliminan. No se borra el registro maestro de un cliente Miesbe: pertenece al dominio de negocio y el contrato debe aclarar alcance de solicitudes legales sobre ese registro.

## Envelope Hub v1 utilizado por Miesbe

```json
{
  "schema_version": 1,
  "event_id": "evt-stable-123",
  "event_type": "message.created",
  "tenant_id": "hub-tenant-uuid",
  "conversation_id": "conv-stable-456",
  "sequence": 42,
  "occurred_at": "2026-10-01T15:04:05Z",
  "data": { "message_id": "msg-stable-789", "direction": "inbound", "author_type": "contact", "author_id": null, "content": "Hola", "status": "received", "provider_message_id": null, "created_at": "2026-10-01T15:04:05Z" }
}
```

Los payloads concretos por `event_type` están en `prototipo/HUB-MIESBE-INTEGRATION.md`. Eventos actuales: conversación creada, mensaje creado, estado actualizado, takeover iniciado/liberado y conversación borrada.

`GET /api/hub/inbox` y `GET /api/hub/inbox?conversationId=conv-stable-456` consultan Hub server-side, refrescan la proyección y sirven esta en modo stale si Hub está temporalmente indisponible. `POST /api/hub/inbox` acepta `reply`, `takeover_start`, `takeover_release` y (administrador) `conversation_delete`. Para reply, Miesbe reusa la misma `Idempotency-Key` ante timeout ambiguo.

En `reply`, HTTP 202 con `delivery: sent` se muestra como **aceptado por Evolution**, no como entregado/leído. HTTP 202 con `delivery: unknown` conserva la clave y muestra aviso ambiguo; nunca hace un reenvío automático. Si el browser reintenta, mantiene la misma clave para que Hub devuelva el resultado idempotente conocido.

## Configuración pendiente / alcance del equipo Hub

1. Configurar `HUB_BASE_URL` por entorno: la Preview proporcionada solo en Environment Preview; agregar Production solo al confirmar hostname estable.
2. Provisionar por tenant una key Hub dedicada con scopes mínimos y signing secret usando el onboarding asistido.
3. Mantener pendiente API de productos server-to-server si el agente decide que necesita consultarlos.

Miesbe llama únicamente las rutas y scopes documentados por el equipo Hub en `prototipo/HUB-MIESBE-INTEGRATION.md`; no usa rutas internas anteriores del inbox.

## Configuración / prueba segura

1. Aplicar `drizzle/0005_hub_inbox_projection.sql` a una DB de desarrollo/test.
2. Generar una master key en entorno seguro (`node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`) y configurarla como `HUB_INTEGRATION_MASTER_KEY` solo en servidor.
3. Configurar asociación, signing secret y API key per-tenant con el script asistido; jamás usar datos/secretos de Production en pruebas.
4. Hub sandbox firma eventos de fixtures sintéticos. Probar firma/timestamp/duplicados y revisar la proyección en Mensajes.
5. Configurar `HUB_BASE_URL` con la URL Preview indicada en Vercel Preview; no configurar Production hasta que el hostname estable se confirme.
6. `npm test`, `npm run typecheck`, `npm run build`.

La política de borrado usa un cron diario (retención máxima operacional 90 días más el intervalo hasta la siguiente ejecución); borrado explícito del Hub es inmediato tras aceptar el evento válido.
