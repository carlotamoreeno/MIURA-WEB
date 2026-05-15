# MIURA Web App

Baseline técnico para el MVP 0.1 de MIURA Web App: una demo guiada sin login
para representar el framework MIURA de deuda técnica con Next.js App Router.

## Requisitos

- Node.js >= 20.9
- npm 11.10.0

Este repositorio usa npm y `package-lock.json` como baseline reproducible.

## Desarrollo

Instala dependencias:

```bash
npm install
```

Arranca el servidor local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Validación de baseline

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

`npm run build` ejecuta también la comprobación TypeScript de Next.js.
Los tests unitarios, E2E y scripts específicos se añadirán en tareas
posteriores del plan MVP.

## Variables de entorno

Las variables sensibles deben vivir solo en `.env*`, que está ignorado por Git.
No expongas claves con prefijo `NEXT_PUBLIC_` salvo que sean valores públicos
deliberados.

La V1 no incluye login ni persistencia server-side de evaluaciones. Supabase se
usará más adelante para el corpus RAG, no para datos locales de usuarios.
