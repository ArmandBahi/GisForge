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

## Supabase CLI (local)

Commandes à lancer depuis la racine du projet (Docker requis).

| Commande | Description |
|----------|-------------|
| `npx supabase start` | Démarre Supabase en local (Postgres, Auth, Studio…) |
| `npx supabase stop` | Arrête les conteneurs Docker Supabase |
| `npx supabase status` | Affiche URLs, ports et clés API du stack local |
| `npx supabase db reset` | Réinitialise la DB : migrations + seed (org `default` + admin) |
| `npx supabase migration up` | Applique uniquement les migrations en attente (sans reset) |
| `npm run gen:types` | Génère `src/app/core/supabase/database.types.ts` depuis la DB locale |

Studio local : [http://localhost:54323](http://localhost:54323) (après `start`).

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Dev server Angular |
| `npm run build` | Build production |
| `npm run gen:types:check` | Génère les types Supabase, avec vérif que le stack local tourne |

## Configuration Supabase

Copier `.env.example` vers `.env` si besoin pour des outils externes.  
Les valeurs de dev Angular sont dans `src/environments/environment.development.ts`.

## Auth

- `AuthService` (`core/auth/`) : session, profil, rôles (`super_admin`, `organization_admin`, `user`)
- Guards : `authGuard`, `guestGuard`, `roleGuard`, `passwordChangeChildGuard`
- Routes protégées : layout + dashboard nécessitent une session active
- Inscription publique désactivée (login uniquement)

## Gestion des organisations

- Route `/organizations` (lazy) protégée par `roleGuard(['super_admin'])` — CRUD toutes les orgs
- Route `/my-profile` — profil utilisateur + lecture de l'organisation courante
- Redirection `/my-organization` → `/my-profile`
- Sidebar : « Organisations » (super_admin, section Administration)

## Gestion des utilisateurs

- Route `/users` (lazy) protégée par `roleGuard(['super_admin', 'organization_admin'])`
- `UsersService` + `users.page.ts` : liste scoped à l'org, création via RPC `create_user`, édition profil/rôles
- Seul `super_admin` peut changer l'organisation d'un utilisateur
- Sidebar : lien « Utilisateurs » visible pour `super_admin` et `organization_admin`

## Gestion des groupes

- Route `/groups` (lazy) protégée par `roleGuard(['super_admin', 'organization_admin'])`
- `GroupsService` + `groups.page.ts` : liste scoped à l'org, CRUD, affectation des membres
- Sidebar : lien « Groupes » visible pour `super_admin` et `organization_admin`

## AI-assisted development

Ce boilerplate est conçu pour être forké et étendu avec des outils IA (Cursor, Claude Code).

| Ressource | Description |
|-----------|-------------|
| [AGENTS.md](AGENTS.md) | Règles de génération (point d'entrée principal) |
| [CLAUDE.md](CLAUDE.md) | Point d'entrée Claude Code |
| [doc/ai/](doc/ai/README.md) | Documentation détaillée (CRUD, checklist, Supabase, UI) |
| [doc/architecture/](doc/architecture/auth-and-multi-tenant.md) | Auth et multi-tenant |
| [doc/bdd/](doc/bdd/README.md) | Documentation base de données |
| `.cursor/rules/` | Règles Cursor (scopées par type de fichier) |

Référence CRUD : `src/app/features/users/` (liste, filtres, dialogs, delete modal).

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour contribuer.

## Structure

```
src/app/
├── core/       # auth, layout, supabase
├── shared/ui/  # Spartan Helm
└── features/   # 1 dossier = 1 domaine métier
```
