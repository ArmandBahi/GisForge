# GisForge

Boilerplate Angular « Custom Lovable » — génération rapide d'applications métier avec Cursor / Claude Code.

## Stack

- Angular 19 (standalone, lazy routes)
- Tailwind CSS v4 + Spartan UI (Helm)
- Supabase (Auth + Postgres + RLS)

## Prérequis

- Node.js 20+
- Docker (pour Supabase local)

## Démarrage

```bash
# Backend local
npx supabase start
npx supabase db reset   # applique les migrations (administration.*)

# Types TypeScript depuis la DB locale
npm run gen:types

# Frontend
npm start               # http://localhost:4200
```

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Dev server Angular |
| `npm run build` | Build production |
| `npm run gen:types` | Génère `src/app/core/supabase/database.types.ts` |
| `npm run gen:types:check` | Idem, avec vérif que Supabase tourne |

## Configuration Supabase

Copier `.env.example` vers `.env` si besoin pour des outils externes.  
Les valeurs de dev Angular sont dans `src/environments/environment.development.ts`.

## Structure

Voir [.cursor/custom-lovable.md](.cursor/custom-lovable.md) pour les conventions IA.
