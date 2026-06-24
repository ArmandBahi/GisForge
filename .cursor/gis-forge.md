# GisForge — conventions pour le prompting IA

> Template Angular opinionated pour la génération rapide d'applications métier avec Cursor / Claude Code.

---

## Principe directeur

Le template gagne par la **prévisibilité** : l'IA retrouve toujours la même structure, les mêmes conventions, le même vocabulaire UI.

```
Prompt IA  →  conventions fixes  →  code prévisible  →  peu de surprises
```

La base n'est pas un framework custom. C'est un **template opinionated** + des **règles** + des **patterns répétables**.

---

## Stack recommandé

| Couche | Choix | Pourquoi (pour l'IA) |
|--------|-------|----------------------|
| Framework | Angular 19+ (standalone) | Signals, `inject()`, lazy routes natives |
| UI | **Spartan UI** (Helm + Brain) | Composants copiés, Tailwind, style shadcn |
| CSS | Tailwind v4 + variables CSS | Thème cohérent via variables CSS |
| Backend | Supabase (Auth + Postgres + RLS) | Auth + Postgres + RLS, client JS compatible Angular |
| Data | Services + signals | État local réactif, pattern stable |
| Routing | Angular Router + **lazy `loadComponent`** | Chunks par feature, bundle maîtrisé |
| Forms | Reactive Forms + validation | Pattern stable, bien documenté |
| Toasts | ngx-sonner ou Spartan toast | Feedback utilisateur uniforme |
| Icons | Lucide Angular (`lucide-angular`) | Cohérence visuelle |
| Build | Angular CLI + Vite (esbuild) | Rapide, standard |

---

## Structure du repo (le contrat avec l'IA)

```
gis-forge/
├── src/
│   ├── app/
│   │   ├── app.config.ts          # providers globaux
│   │   ├── app.routes.ts          # routes + lazy loading
│   │   ├── core/                  # singletons, jamais de composants métier
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   ├── layout/
│   │   │   │   ├── app-layout.component.ts
│   │   │   │   └── app-sidebar.component.ts
│   │   │   └── supabase/
│   │   │       ├── supabase.service.ts
│   │   │       └── database.types.ts   # généré
│   │   ├── shared/                  # UI Spartan + utilitaires
│   │   │   ├── ui/                  # composants Helm copiés
│   │   │   └── utils/
│   │   ├── features/                # 1 dossier = 1 domaine = 1 chunk lazy
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   ├── dashboard.page.ts
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── employees/
│   │   │   │   ├── employees.routes.ts
│   │   │   │   ├── employees.page.ts
│   │   │   │   ├── employees.service.ts
│   │   │   │   └── employees.types.ts
│   │   │   └── projects/
│   │   └── environments/
│   ├── styles.css                   # variables thème Tailwind
│   └── main.ts
├── supabase/
│   ├── migrations/
│   └── config.toml
├── .cursor/rules/                   # règles Cursor
│   └── angular-gisforge.mdc
├── AGENTS.md                          # instructions pour Claude Code / Cursor
├── components.json                    # config Spartan CLI
└── scripts/
    └── gen-supabase-types.mjs
```

### Règle d'or pour l'IA

> **Une feature = un dossier = une route lazy = un service data.**

L'IA sait toujours où créer du code. Pas de pages plates avec tous les imports statiques dans le routeur racine.

---

## Patterns obligatoires

### 1. Lazy loading par feature (dès le template)

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.page') },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/app-layout.component'),
    children: [
      { path: '', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'employees', loadChildren: () => import('./features/employees/employees.routes') },
      { path: 'projects', loadChildren: () => import('./features/projects/projects.routes') },
    ],
  },
];
```

Chaque feature lourde (carte, calendrier, éditeur riche) a en plus un **lazy composant** interne si besoin.

### 2. Couche data = services

```typescript
// features/employees/employees.service.ts
@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private supabase = inject(SupabaseService).client;

  private readonly _employees = signal<Employee[]>([]);
  private readonly _loading = signal(false);

  readonly employees = this._employees.asReadonly();
  readonly loading = this._loading.asReadonly();

  async load(): Promise<void> { /* supabase.from('employees').select() */ }
  async create(dto: CreateEmployeeDto): Promise<void> { /* insert + reload */ }
  async update(id: string, dto: UpdateEmployeeDto): Promise<void> { /* ... */ }
  async remove(id: string): Promise<void> { /* ... */ }
}
```

Le composant page ne parle **jamais** à Supabase directement.

### 3. Page mince, composants vue si besoin

```typescript
// features/employees/employees.page.ts
@Component({
  template: `
    <app-page-header title="Employees" />
    <app-employees-table
      [employees]="employees()"
      [loading]="loading()"
      (create)="onCreate($event)"
    />
  `,
})
export class EmployeesPage {
  private svc = inject(EmployeesService);
  employees = this.svc.employees;
  loading = this.svc.loading;

  ngOnInit() { this.svc.load(); }
}
```

Même séparation : route → layout → vue → service.

### 4. Auth + rôles

- Schéma `administration` : organisations, users, roles, user_roles, groups
- `AuthService` avec signals : `user()`, `roles()`, `hasRole()`, `currentOrganizationId()`, `mustChangePassword()`
- Guards : `authGuard`, `roleGuard(['super_admin', 'organization_admin'])`, `passwordChangeChildGuard`
- RLS côté Supabase (pas seulement côté UI)
- Scoping org : tous les admins (y compris `super_admin`) voient users/groupes de leur org ; `super_admin` gère toutes les orgs via `/organizations`
- Création utilisateur admin : RPC `create_user` (inscription publique désactivée)
- Organisation inactive (`is_active = false`) : accès application bloqué (`canAccessApp`, guards)
- `must_change_password` : redirection forcée vers `/my-profile` jusqu'à changement via `clear_must_change_password` RPC

### 5. CRUD référentiel (pattern le plus généré par l'IA)

Pour tout écran type liste + formulaire :

```
PageHeader (titre + boutons Add / Import)
  → Table (Spartan hlm-table)
  → Dialog create/edit (Spartan hlm-dialog)
  → AlertDialog delete
  → Service CRUD
  → Toasts
```

Documenter ce pattern dans `AGENTS.md` pour que l'IA le réplique sans réinventer.

---

## Fichiers générés

| Fichier | Source | Règle |
|---------|--------|-------|
| `database.types.ts` | `supabase gen types` | Ne pas éditer à la main |
| `supabase.service.ts` | template + env | Factory avec `inject(ENV)` |
| `.env` | local / CI | Jamais commité |

Script npm :

```json
"gen:types": "supabase gen types typescript --local > src/app/core/supabase/database.types.ts"
```

---

## AGENTS.md — instructions pour Cursor / Claude Code

Fichier clé. Exemple de contenu :

```markdown
# GisForge — règles de génération

## Stack
Angular 19 standalone, Spartan UI, Tailwind, Supabase, signals.

## Structure
- Nouvelle feature → dossier `features/<name>/` avec routes lazy, page, service, types
- UI Spartan → `shared/ui/` via `npx @spartan-ng/cli add <component>`
- Jamais d'appel Supabase dans un composant — toujours via un service

## Nommage
- Pages : `<feature>.page.ts`
- Services : `<feature>.service.ts`
- Routes : `<feature>.routes.ts`

## Patterns
- CRUD : table + dialog + service + toasts
- Guards sur routes admin
- Lazy load chaque feature

## Interdits
- Pas de NgModule (standalone only)
- Pas de Bootstrap
- Pas d'imports statiques de toutes les pages dans app.routes
- Pas de logique métier dans shared/ui/
```

---

## Principes du template

| Aspect | Approche GisForge |
|--------|-------------------|
| Composants UI | Spartan Helm copié dans `shared/ui/` |
| Backend | `core/supabase/` + migrations |
| État / data | `features/*/*.service.ts` avec signals |
| Vues | `features/*/*.page.ts` + sous-composants |
| Toasts | ngx-sonner |
| Auth | organisations + rôles + RLS Supabase |
| Routes | lazy `loadChildren` par feature dès le départ |
| Data layer | 1 service par feature, toujours |
| Bundle | chunks par feature + lazy des libs lourdes |

---

## Workflow de prompting

1. **Créer une feature** : « Ajoute une feature `invoices` avec CRUD, table, import CSV, admin only »
   → L'IA crée `features/invoices/` + migration Supabase + RLS

2. **Modifier un écran** : « Sur employees, ajoute un filtre par département »
   → L'IA touche `employees.page.ts` + `employees.service.ts`, pas le layout

3. **Nouveau composant UI** : `npx @spartan-ng/cli add select` puis usage dans la feature

4. **Schéma DB** : migration SQL dans `supabase/migrations/` + `npm run gen:types`

---

## Résumé en une phrase

**GisForge** = template Angular standalone + Spartan UI + Supabase + services/signals par feature + lazy routes + `AGENTS.md` — un contrat de prévisibilité pour l'IA, avec bundle maîtrisé et data centralisée dans les services.
