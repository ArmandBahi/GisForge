# GisForge

Boilerplate Angular pour la génération rapide d'applications métier avec Cursor / Claude Code.

## Stack

- Angular 19 (standalone, lazy routes)
- Tailwind CSS v4 + Spartan UI (Helm)
- Supabase (Auth + Postgres + RLS)
- ngx-sonner (toasts)

## Prérequis

- Node.js 20+
- Docker (pour Supabase local)

## Démarrage

```bash
# Backend local
npx supabase start
npx supabase db reset   # migrations + seed (org default + admin)

# Types TypeScript depuis la DB locale
npm run gen:types

# Frontend
npm start               # http://localhost:4200
```

## Compte admin local

Après `db reset`, un super-admin est créé automatiquement :

| Champ | Valeur |
|-------|--------|
| Email | `admin@default.local` |
| Mot de passe | `123456` |
| Organisation | `default` |

Connexion : [http://localhost:4200/login](http://localhost:4200/login)

L'inscription publique est désactivée (`enable_signup = false`). Les admins créent les comptes via `/users` (RPC `create_user`).

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

## Auth

- `AuthService` (`core/auth/`) : session, profil, rôles (`super_admin`, `organization_admin`, `user`)
- Guards : `authGuard`, `guestGuard`, `roleGuard`
- Routes protégées : layout + dashboard nécessitent une session active
- Inscription publique désactivée (login uniquement)

## Gestion des organisations

- Route `/organizations` (lazy) protégée par `roleGuard(['super_admin'])` — CRUD toutes les orgs
- Route `/my-organization` — lecture de l'organisation courante (tous les utilisateurs authentifiés)
- Sidebar : « Organisations » (super_admin), « Mon organisation » (tous)

## Gestion des utilisateurs

- Route `/users` (lazy) protégée par `roleGuard(['super_admin', 'organization_admin'])`
- `UsersService` + `users.page.ts` : liste scoped à l'org, création via RPC `create_user`, édition profil/rôles
- Seul `super_admin` peut changer l'organisation d'un utilisateur
- Sidebar : lien « Utilisateurs » visible pour `super_admin` et `organization_admin`

## Gestion des groupes

- Route `/groups` (lazy) protégée par `roleGuard(['super_admin', 'organization_admin'])`
- `GroupsService` + `groups.page.ts` : liste scoped à l'org, CRUD, affectation des membres
- Sidebar : lien « Groupes » visible pour `super_admin` et `organization_admin`

## Structure

Voir [.cursor/gis-forge.md](.cursor/gis-forge.md) pour les conventions IA.
