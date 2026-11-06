# Contrato Hub ↔ Miesbe: conversaciones e inbox

## Autoridad de datos y flujo

- El Hub recibe primero los mensajes de WhatsApp, conserva la conversación oficial, ejecuta el agente y entrega respuestas por el proveedor configurado.
- Miesbe es la fuente oficial de clientes, servicios/productos, disponibilidad y citas.
- Miesbe mantiene una proyección de conversaciones para su módulo Mensajes. Una respuesta humana desde Miesbe debe pasar por el Hub; Miesbe no envía por WhatsApp directamente.
- Si no existe un `hub_inbox` configurado, el Hub continúa operando de forma independiente y no encola eventos externos.

El esquema del Hub requiere aplicar en orden `migrations/0013_hub_conversation_integration.sql` y `migrations/0014_force_hub_outbox_rls.sql`. La segunda migración fuerza RLS en el outbox para que las políticas por tenant también apliquen al rol de base de datos propietario.

## Credenciales y asociación de tenant

Las APIs de conversación usan una API key del Hub en `Authorization: Bearer <key>`. El tenant se deriva de la key y debe coincidir con `{tenantRef}`. `tenantRef` acepta el UUID estable del Hub (recomendado para Miesbe) o su slug; no es el slug de Miesbe. Para Miesbe se recomienda crear una key dedicada con scopes mínimos:

```json
{
  "name": "Miesbe inbox",
  "scopes": ["conversations:read", "messages:write", "takeover:manage", "conversations:delete"]
}
```

La asociación de tenant y la clave de webhook se configuran de forma asistida. El secreto de firma se cifra en el Hub con `INTEGRATION_ENCRYPTION_KEY`; nunca se devuelve en GET ni se registra en logs.

## Eventos Hub → Miesbe

Configurar el destino desde una sesión de platform admin:

```http
PUT /api/v1/platform/tenants/{tenantId}/hub-inbox
Content-Type: application/json

{
  "endpoint": "https://<miesbe-host>/api/hub/events",
  "signingSecret": "<secreto aleatorio de al menos 32 bytes>",
  "enabled": true
}
```

El endpoint Miesbe debe recibir el cuerpo crudo y validar:

- `X-Hub-Timestamp`: segundos Unix, máximo 5 minutos de diferencia.
- `X-Hub-Signature`: `sha256=` seguido de HMAC-SHA256 del texto `${timestamp}.${rawBody}`.
- `X-Hub-Event-Id`: debe coincidir con `event_id` del envelope.

Envelope versión 1:

```json
{
  "schema_version": 1,
  "event_id": "uuid",
  "event_type": "message.created",
  "tenant_id": "uuid-del-tenant-hub",
  "conversation_id": "uuid",
  "sequence": 3,
  "occurred_at": "2026-09-29T12:00:00.000Z",
  "data": {
    "message_id": "uuid",
    "direction": "inbound",
    "author_type": "contact",
    "content": "Hola, quiero una cita",
    "status": "received",
    "created_at": "2026-09-29T12:00:00.000Z"
  }
}
```

Eventos emitidos: `conversation.created`, `message.created`, `message.delivery_updated`, `conversation.takeover_started`, `conversation.takeover_released` y `conversation.deleted`. La secuencia es monotónica por conversación. La entrega es al menos una vez: Miesbe debe deduplicar por `event_id` y `message_id`, y aplicar eventos por secuencia. Los reintentos no cambian el `event_id` ni el cuerpo.

El Hub guarda los eventos en un outbox transaccional y reintenta errores con backoff exponencial, hasta 12 intentos. Después quedan en `dead_letter`, visibles para platform admin y reintentables desde:

```http
POST /api/v1/platform/tenants/{tenantId}/hub-inbox/retry
Content-Type: application/json

{ "eventId": "uuid-del-evento" }
```

El outbox guarda una instantánea cifrada e inmutable del evento para que los reintentos firmen exactamente el mismo cuerpo. La purga elimina eventos entregados o superseded con más de 90 días; no elimina eventos pendientes ni dead-letter. Al borrar una conversación, los eventos previos no entregados se marcan `superseded` para que no vuelvan a exponer contenido; el evento `conversation.deleted` sigue su orden y elimina la proyección Miesbe.

## APIs de conversación Hub

En todos los endpoints siguientes, usa como base URL la Preview del Hub para pruebas y configura la URL estable de Production por separado en el servidor Miesbe mediante `HUB_BASE_URL`; no codifiques una URL de Preview en Production.

Base URL Preview actual:

```text
https://hub-agentes-ia-git-feat-whatsapp-4a0869-jhoonfgu-8461s-projects.vercel.app
```

La URL estable de Production debe configurarse cuando se cierre el hostname de Production.

### Listar conversaciones

```http
GET /api/v1/tenants/{tenantRef}/conversations?limit=50&cursor=<opaque>
Authorization: Bearer <key con conversations:read>
```

Respuesta `200`:

```json
{
  "conversations": [{
    "id": "uuid",
    "status": "bot_active",
    "createdAt": "2026-09-30T12:00:00.000Z",
    "updatedAt": "2026-09-30T12:00:00.000Z",
    "lastMessageAt": "2026-09-30T12:00:00.000Z",
    "lastMessage": "Hola",
    "lastMessageDirection": "inbound",
    "contact": { "id": "uuid", "displayName": null, "phone": "+573000000000" }
  }],
  "page": { "limit": 50, "hasMore": false, "nextCursor": null }
}
```

`limit` por defecto 50, máximo 100. Si `hasMore` es true, envía `nextCursor` como `cursor` para obtener la siguiente página. Sin conversaciones, devuelve `conversations: []` y `hasMore: false`.

### Leer historial

```http
GET /api/v1/tenants/{tenantRef}/conversations/{conversationId}/messages?limit=100&cursor=<opaque>
Authorization: Bearer <key con conversations:read>
```

Respuesta `200`:

```json
{
  "messages": [{
    "id": "uuid",
    "providerMessageId": "provider-id-o-null",
    "direction": "inbound",
    "authorType": "contact",
    "authorId": null,
    "content": "Hola",
    "status": "received",
    "createdAt": "2026-09-30T12:00:00.000Z"
  }],
  "page": { "limit": 100, "hasMore": false, "nextCursor": null }
}
```

El historial se devuelve cronológicamente dentro de cada página. `limit` por defecto 100, máximo 100. Solicita páginas anteriores repitiendo el `cursor`. Una conversación inexistente devuelve `404`.

### Takeover y liberación

```http
POST /api/v1/tenants/{tenantRef}/conversations/{conversationId}/takeover
Authorization: Bearer <key con takeover:manage>
Content-Type: application/json

{ "reason": "Atención solicitada", "assignedTo": "id-de-usuario-Miesbe" }
```

Primera activación: `201` con `{ "id": "uuid", "status": "human_active", "takeoverId": "uuid", "alreadyActive": false }`. Si ya estaba tomada: `200` con los mismos campos y `alreadyActive: true`. Una conversación cerrada/resuelta devuelve `409`; una inexistente, `404`. Mientras está `human_active`, el webhook Evolution no invoca el bot.

```http
DELETE /api/v1/tenants/{tenantRef}/conversations/{conversationId}/takeover
Authorization: Bearer <key con takeover:manage>
```

La liberación reactiva el bot y emite `conversation.takeover_released`. Respuesta `200`: `{ "id": "uuid", "status": "bot_active", "alreadyReleased": false }`; si ya estaba liberada, `alreadyReleased: true`.

### Enviar respuesta humana

```http
POST /api/v1/tenants/{tenantRef}/conversations/{conversationId}/messages
Authorization: Bearer <key con messages:write>
Idempotency-Key: <clave estable para este intento>
Content-Type: application/json

{ "content": "Hola, con gusto te ayudamos.", "senderId": "id-Miesbe", "senderName": "Recepción" }
```

Requiere takeover activo. El mensaje queda persistido antes del envío. Primera aceptación del proveedor: `202` con `{ "messageId": "uuid", "status": "accepted", "delivery": "sent", "providerMessageId": "id-o-null" }`. Un timeout de red ambiguo devuelve `202` con `delivery: "unknown"`; no se reenvía automáticamente para evitar duplicados. Una respuesta de rechazo de Evolution devuelve `502` con `{ "messageId": "uuid", "status": "failed", "delivery": "failed", "error": "Message delivery failed" }`. Repetir la misma `Idempotency-Key` no crea ni envía otro mensaje y devuelve `200` con su estado conocido. Miesbe no debe reintentar con una clave nueva tras un timeout ambiguo. `sent` significa aceptación HTTP del proveedor, no confirmación de entrega o lectura de WhatsApp.

Errores comunes: `401 {"error":"Unauthorized"}` si falta Bearer; `403 {"error":"Invalid API key or scope"}` para key/scope inválido o `{"error":"Tenant does not match API key"}` si el tenant del path no corresponde; `422` para límite/cursor/UUID/cuerpo/Idempotency-Key inválidos; `404` conversación inexistente; `409` takeover inactivo o destinatario no disponible.

### Solicitud de borrado

```http
DELETE /api/v1/tenants/{tenantRef}/conversations/{conversationId}
Authorization: Bearer <key con conversations:delete>
```

El Hub redacta texto y datos personales y emite `conversation.deleted`; Miesbe debe borrar la proyección correspondiente al recibirlo.

## Reintento del outbox en Preview y Production

La ruta `GET /api/cron/hub-events` exige `Authorization: Bearer $CRON_SECRET`. El schedule incluido se ejecuta diariamente para mantener compatibilidad con Vercel Hobby; para entregar eventos con baja latencia en Production, se debe invocar esta ruta desde un scheduler que soporte ejecuciones por minuto (por ejemplo, Vercel Pro o QStash). También recupera eventos Evolution pendientes cuyo runtime falló o quedó sin procesar: el Hub guarda el contenido/contacto cifrado, reintenta con backoff hasta 12 veces y no vuelve a ejecutar un evento ya completado. Los cron de Vercel no ejecutan automáticamente en Preview: para probar manualmente en Preview, invocar la ruta con el `CRON_SECRET` configurado en ese entorno.

## Prueba de aceptación conjunta

1. Configurar un tenant Hub de prueba con el endpoint y secreto del tenant Miesbe de prueba.
2. Enviar un mensaje real de prueba a la cuenta WhatsApp de Preview; verificar `conversation.created` y `message.created` en Miesbe.
3. Ejecutar manualmente `/api/cron/hub-events`; comprobar firma, deduplicación y secuencia.
4. Iniciar takeover desde Miesbe, enviar una respuesta con `Idempotency-Key`, verificar que el Hub la entrega por Evolution y que un reintento no duplica el mensaje.
5. Liberar takeover y verificar el evento y la reanudación del bot.
6. Repetir el evento firmado y confirmar que Miesbe no duplica filas; probar firma inválida, tenant distinto y timestamp expirado.
7. Probar `conversation.deleted` solo sobre datos de prueba y comprobar que ambas proyecciones quedan redactadas.

Las citas y acciones de negocio se prueban separadamente usando un CRM/ERP de sandbox. No confirmar una reserva en Production como parte de esta prueba.
