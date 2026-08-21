# Token Quest — "Hecho 100% con IA" / "100% made with AI"

Un action-adventure top-down estilo Zelda para la workshop. La mecánica **es** la
lección: los **tokens** son tu recurso *y* tu puntuación, y las **armas son modelos de
IA** (baratas y débiles → caras y potentes). Ganas terminando con más tokens: usar el
modelo de frontera para todo arruina tu marcador. Todo el arte se generó con
`gpt-image-2` (~$1.20 en total); cada pieza documenta su prompt, modelo y coste
dentro del juego.

A top-down Zelda-like for the workshop where the mechanic **is** the message: **tokens**
are both resource and score, and **weapons are AI models** (cheap/weak → expensive/strong).
Spend deliberately. Every image was AI-generated and self-documents its prompt, model and cost.

## Ejecutar en local / Run locally

```bash
npm install

# 1) Juego (frontend) con recarga en caliente / game with hot reload
npm run dev            # http://localhost:5173

# 2) (Opcional) API + clasificación / optional API + leaderboard
npm run server         # http://localhost:3000  (usa el proxy /api de Vite)
```

Sin servidor el juego es 100% jugable: la clasificación falla en modo *offline* sin
romper nada. Con `npm run server` y **sin** `DATABASE_URL` usa un almacén en memoria
(se reinicia al parar el proceso).

Without the server the game is fully playable; the leaderboard just shows an offline
message. `npm run server` with no `DATABASE_URL` uses an in-memory store.

## Build de producción / Production build

```bash
npm run build          # tsc --noEmit && vite build  ->  dist/
npm start              # Fastify sirve dist/ + /api en $PORT (por defecto 3000)
```

`npm start` sirve el juego **y** la API desde un único servicio (un solo deploy).

## Desplegar en Railway / Deploy to Railway

1. Nuevo servicio desde este repo. Railway/Nixpacks ejecuta `npm run build` y luego `npm start`.
2. Añade **Postgres** en el proyecto → expone `DATABASE_URL` (el servidor crea las tablas solo).
3. `PORT` lo inyecta Railway automáticamente. No hace falta nada más.

El bundle del cliente **no** contiene ninguna clave de imagen: el arte se genera una vez
en local (`npm run gen`) y se commitea como PNG. El servidor en runtime solo usa `DATABASE_URL`.

## Seguridad / Security

- La clave de `gpt-image-2` vive en `.env` (gitignored) y solo la usa el script de
  generación. **Rótala después de la workshop** — se compartió en texto plano.
- Puntuaciones sin cuenta: nombre + `playerId` (uuid en localStorage). El servidor valida
  forma y rangos; no hay anti-cheat autoritativo (suficiente para una demo interna).

## Controles / Controls

`WASD`/flechas mover · `ESPACIO` atacar · `1·2·3` cambiar arma · `E` abrir cofre · `TAB` idioma.

## Estructura / Layout

- `src/scenes/` — Boot → Title → Game (misiones + jefe) → Result (clasificación).
- `src/game/balance.ts` — todos los números de economía y del jefe en un sitio.
- `src/game/weapons.ts` — las 3 armas = modelos de IA (el gancho educativo).
- `src/ui/` — tarjetas "cómo lo hizo la IA" + pantallas Title/Result (overlays DOM).
- `server/` — Fastify + Postgres (o memoria) + validación en el límite de confianza.
- `tools/gen-assets.mjs` — pipeline de arte con `gpt-image-2` (`npm run gen`).
