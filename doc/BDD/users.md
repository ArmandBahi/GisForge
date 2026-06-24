# Administration — modèle de données

> Multi-tenant : chaque utilisateur appartient à une **organisation** (obligatoire).  
> Tous les rôles admin voient uniquement les users et groupes de leur organisation, y compris `super_admin`.  
> Le `super_admin` gère en plus toutes les organisations (CRUD plateforme) et peut réassigner l'organisation d'un utilisateur.

---

## Tables

### `administration.organization`

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
| `organization_id` | `uuid` | FK → `organization(id)` RESTRICT, NOT NULL |
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

**Rôles par défaut** : `super_admin`, `organization_admin`, `user`.

### `administration.user_role`

Association utilisateur ↔ rôle (N-N).

| Colonne | Type | Notes |
|---------|------|-------|
| `uid` | `uuid` | FK → `user(uid)` CASCADE |
| `role_id` | `uuid` | FK → `role(id)` CASCADE |

PK composite `(uid, role_id)`.

### `administration.group`

Groupes d'utilisateurs, scopés par organisation.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK → `organization(id)` CASCADE, NOT NULL |
| `name` | `text` | NOT NULL, UNIQUE par organisation `(organization_id, name)` |
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
| `current_organization_id()` | Retourne l'`organization_id` de l'utilisateur courant |
| `has_role(_role)` | Vérifie si l'utilisateur courant possède un rôle donné |
| `is_super_admin()` | Raccourci pour `has_role('super_admin')` |
| `is_organization_admin()` | Raccourci pour `has_role('organization_admin')` |
| `create_user(...)` | Création d'utilisateur par un admin (RPC, signup public désactivé) |
| `delete_user(p_uid)` | Suppression d'utilisateur par un admin (RPC, supprime `auth.users`) |
| `update_own_profile(p_display_name)` | Mise à jour du nom complet par l'utilisateur courant |
| `clear_must_change_password()` | Réinitialise le flag après changement de mot de passe |

---

## RLS — règles de scoping

| Table | SELECT | INSERT / UPDATE / DELETE |
|-------|--------|--------------------------|
| `organization` | Sa propre organisation OU super_admin (toutes) | super_admin uniquement (CRUD global) |
| `user` | Soi-même, OU users de son org (admin) | Admin scopé org ; super_admin peut créer/réassigner vers n'importe quelle org |
| `role` | Tout utilisateur authentifié | super_admin uniquement |
| `user_role` | Ses propres rôles, OU rôles des users de son org (admin) | Admin scopé org |
| `group` | Groupes de son org | Admin scopé org |
| `user_group` | Ses propres groupes, OU groupes de son org (admin) | Admin scopé org |

---

## Trigger Auth

`handle_new_user()` — déclenché sur `INSERT` dans `auth.users` :

1. Crée une ligne dans `administration.user` avec `email`, `display_name` (depuis metadata ou partie locale de l'email)
2. Récupère `organization_id` depuis `raw_user_meta_data->>'organization_id'` (passé lors de l'invitation)
3. Assigne le rôle `user` par défaut

---

## Vues publiques

Toutes les tables sont exposées via des vues dans le schéma `public` avec `security_invoker = true` (les RLS de la table sous-jacente s'appliquent) :

`organizations`, `users`, `roles`, `user_roles`, `groups`, `user_groups`

---

## Migration

Fichier : `supabase/migrations/20260623000000_init_administration.sql`
