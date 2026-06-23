# Administration — modèle de données

> Multi-tenant : chaque utilisateur appartient à un **client** (organisation).  
> Les `admin_client` gèrent les utilisateurs et groupes de leur organisation.  
> Les `super_admin` ont un accès plateforme complet.

---

## Tables

### `administration.client`

Tenant / organisation.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE NOT NULL — identifiant URL-friendly |
| `is_active` | `boolean` | défaut `true` |
| `created_at`, `updated_at` | `timestamptz` | |

### `administration.user`

Profil applicatif lié à `auth.users`.

| Colonne | Type | Notes |
|---------|------|-------|
| `uid` | `uuid` | PK → `auth.users(id)` CASCADE |
| `email` | `text` | NOT NULL |
| `display_name` | `text` | |
| `avatar_url` | `text` | |
| `client_id` | `uuid` | FK → `client(id)` SET NULL — nullable pour les super_admin non rattachés |
| `is_active` | `boolean` | défaut `true` |
| `must_change_password` | `boolean` | défaut `false` |
| `created_at`, `updated_at` | `timestamptz` | |

**Trigger** : `set_updated_at()` sur UPDATE.

### `administration.role`

Rôles applicatifs.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | UNIQUE NOT NULL |
| `description` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

**Rôles par défaut** : `super_admin`, `admin_client`, `user`.

### `administration.user_role`

Association utilisateur ↔ rôle (N-N).

| Colonne | Type | Notes |
|---------|------|-------|
| `uid` | `uuid` | FK → `user(uid)` CASCADE |
| `role_id` | `uuid` | FK → `role(id)` CASCADE |

PK composite `(uid, role_id)`.

### `administration.privilege`

Permissions granulaires.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | UNIQUE NOT NULL |
| `description` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

**Privilèges par défaut** : `users_manage`, `groups_manage`.

### `administration.role_privilege`

Association rôle ↔ privilège (N-N).

| Colonne | Type | Notes |
|---------|------|-------|
| `role_id` | `uuid` | FK → `role(id)` CASCADE |
| `privilege_id` | `uuid` | FK → `privilege(id)` CASCADE |

PK composite `(role_id, privilege_id)`.

**Mapping par défaut** : `admin_client` → `users_manage` + `groups_manage`.  
`super_admin` bypasse toutes les vérifications de privilèges.

### `administration.group`

Groupes d'utilisateurs, scopés par client.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` | PK |
| `client_id` | `uuid` | FK → `client(id)` CASCADE, NOT NULL |
| `name` | `text` | NOT NULL, UNIQUE par client `(client_id, name)` |
| `description` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

### `administration.user_group`

Association utilisateur ↔ groupe (N-N).

| Colonne | Type | Notes |
|---------|------|-------|
| `uid` | `uuid` | FK → `user(uid)` CASCADE |
| `group_id` | `uuid` | FK → `group(id)` CASCADE |

PK composite `(uid, group_id)`.

---

## Fonctions de sécurité (SECURITY DEFINER)

| Fonction | Rôle |
|----------|------|
| `current_client_id()` | Retourne le `client_id` de l'utilisateur courant |
| `has_role(_role)` | Vérifie si l'utilisateur courant possède un rôle donné |
| `is_super_admin()` | Raccourci pour `has_role('super_admin')` |
| `has_privilege(_privilege)` | Vérifie un privilège — `super_admin` bypasse automatiquement |
| `has_any_privilege(_privileges[])` | Vérifie si au moins un privilège parmi la liste est possédé |

---

## RLS — règles de scoping

| Table | SELECT | INSERT / UPDATE / DELETE |
|-------|--------|--------------------------|
| `client` | Son propre client OU super_admin | super_admin uniquement |
| `user` | Soi-même, OU users de son client (si `users_manage`), OU super_admin | `users_manage` scopé client, OU super_admin |
| `role` | Tout utilisateur authentifié | super_admin uniquement |
| `user_role` | Ses propres rôles, OU rôles des users de son client (si `users_manage`), OU super_admin | `users_manage` scopé client, OU super_admin |
| `privilege` | Tout utilisateur authentifié | super_admin uniquement |
| `role_privilege` | Tout utilisateur authentifié | super_admin uniquement |
| `group` | Groupes de son client, OU super_admin | `groups_manage` scopé client, OU super_admin |
| `user_group` | Ses propres groupes, OU groupes de son client, OU super_admin | `groups_manage` scopé client, OU super_admin |

---

## Trigger Auth

`handle_new_user()` — déclenché sur `INSERT` dans `auth.users` :

1. Crée une ligne dans `administration.user` avec `email`, `display_name` (depuis metadata ou partie locale de l'email)
2. Récupère `client_id` depuis `raw_user_meta_data->>'client_id'` (passé lors de l'invitation)
3. Assigne le rôle `user` par défaut

---

## Vues publiques

Toutes les tables sont exposées via des vues dans le schéma `public` avec `security_invoker = true` (les RLS de la table sous-jacente s'appliquent) :

`clients`, `users`, `roles`, `user_roles`, `privileges`, `role_privileges`, `groups`, `user_groups`

---

## Migration

Fichier : `supabase/migrations/20260623000000_init_administration.sql`
