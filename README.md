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
npx supabase db reset   # migrations + seed (organisation démo)

# Types TypeScript depuis la DB locale
npm run gen:types

# Frontend
npm start               # http://localhost:4200
```

## Compte de test local

Après `db reset`, créer un utilisateur via l’API Auth (Studio ou curl) :

```bash
curl -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"DemoPass123!","data":{"display_name":"Admin Demo"}}'
```

La clé anon locale est dans `npx supabase status` ou `environment.development.ts`.

Le trigger `handle_new_user` crée le profil dans `administration.user` avec le rôle `user` par défaut.

Pour un accès admin plateforme, assigner `super_admin` dans Supabase Studio (table `administration.user_role`) ou via SQL :

```sql
INSERT INTO administration.user_role (uid, role_id)
SELECT u.uid, r.id
FROM administration.user u, administration.role r
WHERE u.email = 'admin@demo.local' AND r.name = 'super_admin'
ON CONFLICT DO NOTHING;
```

Connexion : [http://localhost:4200/login](http://localhost:4200/login)

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

## Gestion des utilisateurs

- Route `/users` (lazy) protégée par `roleGuard(['super_admin', 'organization_admin'])`
- `UsersService` + `users.page.ts` : liste, création (via `auth.signUp` + trigger), édition profil/rôles
- Sidebar : lien « Utilisateurs » visible pour `super_admin` et `organization_admin`

## Structure

Voir [.cursor/gis-forge.md](.cursor/gis-forge.md) pour les conventions IA.
