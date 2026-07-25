# Vibe Noti OpenCode plugin

Captura eventos útiles de OpenCode y envía únicamente metadata permitida a
`POST /v1/events`.

## Configuración

Expone estas variables al proceso que inicia OpenCode:

```bash
export VIBENOTI_API_URL=http://localhost:3000
export VIBENOTI_API_KEY=replace-with-the-api-key
export VIBENOTI_COMMAND_EVENTS=false
```

`VIBENOTI_API_URL` usa `http://localhost:3000` por defecto.
`command.executed` solo se envía cuando `VIBENOTI_COMMAND_EVENTS=true`.
`VIBENOTI_API_KEY` debe ser una key creada mediante Better Auth con permiso
`events:write`.

El plugin envía únicamente eventos que requieren atención:

- `assistant.completed`
- `question.asked`
- `permission.asked`
- `session.error`
- `session.retry`
- `tool.failed`
- `command.executed` cuando `VIBENOTI_COMMAND_EVENTS=true`

`assistant.completed` requiere un mensaje assistant completado con
`finish: "stop"`. Los mensajes que terminan para ejecutar tools no se consideran
una respuesta final. `session.idle` se conserva como fallback para versiones de
OpenCode que sí lo emiten al plugin.

Este repositorio carga la implementación de `packages/opencode` mediante
`.opencode/plugins/vibenoti.ts`. Ejecuta `bun install` desde la raíz antes de
iniciar OpenCode. Las variables deben estar exportadas en el shell que inicia
OpenCode; los archivos `.env` de `apps/web` no se cargan en un proceso de
OpenCode que ya está en ejecución.

OpenCode carga plugins y configuración una sola vez. Ciérralo y vuelve a
iniciarlo después de instalar o modificar el plugin.

Para desarrollo local, la raíz del repositorio incluye un launcher que carga
`VIBENOTI_API_KEY` desde `apps/web/.env`:

```bash
bun run opencode
```

## Privacidad

Los payloads se construyen desde cero. Nunca incluyen prompts, mensajes,
respuestas, tareas, comandos, argumentos, inputs u outputs de tools, contenido
o paths de archivos, reasoning, headers, tokens ni variables de entorno.

## Desarrollo

```bash
bun run --filter opencode test
bun run --filter opencode typecheck
```
