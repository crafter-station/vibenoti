# Vibe Noti Web

## Desarrollo

Configura Better Auth, PostgreSQL y Upstash usando las variables documentadas
en `.env.example`.

Después de iniciar sesión, crea una API key mediante el endpoint autenticado de
Better Auth:

```bash
POST /api/auth/api-key/create
Content-Type: application/json

{"name":"OpenCode"}
```

La respuesta muestra el secreto una sola vez. Configúralo como
`VIBENOTI_API_KEY` en el proceso de OpenCode.

Inicia la aplicación:

```bash
bun run dev
```

## API de eventos

`POST /v1/events` recibe eventos de OpenCode autenticados mediante
`Authorization: Bearer <VIBENOTI_API_KEY>`. La key debe pertenecer a un usuario
y tener el permiso `events:write`. El endpoint valida el evento y responde
`202` sin persistirlo.

El servidor registra en consola únicamente metadata validada y permitida. Los
rechazos muestran códigos y paths de validación, pero nunca el body crudo,
headers ni secretos.

```bash
curl http://localhost:3000/v1/events \
  --request POST \
  --header "Authorization: Bearer $VIBENOTI_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "source": "opencode",
    "contractVersion": 1,
    "eventId": "123e4567-e89b-12d3-a456-426614174000",
    "eventType": "session.idle",
    "occurredAt": "2026-07-19T18:30:00Z",
    "project": { "id": "project-id", "name": "Vibe Noti" },
    "session": { "id": "session-id", "title": "Test session" },
    "data": {}
  }'
```

Ejecuta las comprobaciones:

```bash
bun run test
bun run lint
bun run build
```
