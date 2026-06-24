# Custom Lovable — base Angular pour le prompting IA

> Comment reconstruire l'expérience Lovable (génération rapide, stack prévisible, IA efficace) en Angular, optimisé pour Cursor / Claude Code.

---

## Principe directeur

Lovable ne gagne pas par une lib propriétaire. Il gagne par la **prévisibilité** : l'IA retrouve toujours la même structure, les mêmes conventions, le même vocabulaire UI.

En Angular, l'objectif est identique :

```
Prompt IA  →  conventions fixes  →  code prévisible  →  peu de surprises
```

La base n'est pas un framework custom. C'est un **template opinionated** + des **règles** + des **patterns répétables**.

---

## Stack recommandé

| Couche | Choix | Pourquoi (pour l'IA) |
|--------|-------|----------------------|
| Framework | Angular 19+ (standalone) | Signals, `inject()`, lazy routes natives |
| UI | **Spartan UI** (Helm + Brain) | Équivalent shadcn : code copié, Tailwind, même look que Lovable |
| CSS | Tailwind v4 + variables CSS | Même système de thème que les projets React Lovable |
| Backend | Supabase (Auth + Postgres + RLS) | Identique à Lovable, client JS compatible Angular |
| Data | Services + signals
| Routing | Angular Router + **lazy `loadComponent`** | Équivalent des modules lazy, évite le bundle 2,4 Mo |
| Forms | Reactive Forms + Zod (via `@analogjs/zod` ou validation manuelle) | Pattern stable, bien documenté |
| Toasts | ngx-sonner ou Spartan toast | Même UX que Sonner dans Lovable |
| Icons | Lucide Angular (`lucide-angular`) | Cohérence visuelle avec les projets existants |
| Build | Angular CLI + Vite (esbuild) | Rapide, standard |

---

## Structure du repo (le contrat avec l'IA)

```
custom-lovable-app/
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
│   │   │       ├── supabase.client.ts
│   │   │       └── database.types.ts   # généré
│   │   ├── shared/                  # UI Spartan + utilitaires
│   │   │   ├── ui/                  # composants Helm copiés (comme shadcn)
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
├── .cursor/rules/                   # règles Cursor (équivalent AGENTS.md)
│   └── angular-lovable.mdc
├── AGENTS.md                          # instructions pour Claude Code / Cursor
├── components.json                    # config Spartan CLI
└── scripts/
    └── gen-supabase-types.ts
```

### Règle d'or pour l'IA

> **Une feature = un dossier = une route lazy = un service data.**

L'IA sait toujours où créer du code. Pas de `pages/` plates avec 15 imports statiques dans `App.tsx` (erreur Lovable par défaut).

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

### 2. Couche data = services (équivalent `hooks.ts`)

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

Même séparation que AssetWise : route → layout → vue → service.

### 4. Auth + rôles (copie du modèle Supabase Lovable)

- Table `profiles` + `user_roles` + fonction `has_role()`
- `AuthService` avec signals : `user()`, `roles()`, `hasRole()`
- Guards : `authGuard`, `roleGuard(['admin', 'manager'])`
- RLS côté Supabase (pas seulement côté UI)

### 5. CRUD référentiel (pattern le plus généré par l'IA)

Pour tout écran type Employees / WBS Mappings :

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

## Fichiers « auto-générés » (équivalent Lovable Cloud)

| Fichier | Source | Règle |
|---------|--------|-------|
| `database.types.ts` | `supabase gen types` | Ne pas éditer à la main |
| `supabase.client.ts` | template + env | Factory avec `inject(ENV)` |
| `.env` | local / CI | Jamais commité |

Script npm :

```json
"gen:types": "supabase gen types typescript --project-id $ID > src/app/core/supabase/database.types.ts"
```

---

## AGENTS.md — instructions pour Cursor / Claude Code

Fichier clé. Exemple de contenu :

```markdown
# Custom Lovable — règles de génération

## Stack
Angular 19 standalone, Spartan UI, Tailwind, Supabase, signals.

## Structure
- Nouvelle feature → dossier `features/<name>/` avec routes lazy, page, service, types
- UI Spartan → `shared/ui/` via `npx spartan add <component>`
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

## Ce qu'on reprend de Lovable (validé)

| Lovable React | Custom Lovable Angular |
|---------------|------------------------|
| shadcn copié | Spartan Helm copié |
| `integrations/supabase/` | `core/supabase/` |
| `lib/hooks.ts` | `features/*/*.service.ts` |
| `components/*-view.tsx` | `features/*/*.page.ts` + sous-composants |
| React Query | signals + service (ou TanStack Angular Query) |
| Sonner toasts | ngx-sonner |
| `user_roles` + RLS | identique |
| `exportable_tables` (backup) | identique |

## Ce qu'on corrige par rapport à Lovable

| Problème Lovable | Solution Custom Lovable |
|------------------|-------------------------|
| Pas de lazy routes | lazy `loadChildren` par feature dès le départ |
| `hooks.ts` ou inline dispersé | 1 service par feature, toujours |
| 46 composants UI dupliqués entre projets | package `shared-ui` en monorepo (optionnel phase 2) |
| Bundle 2,4 Mo | chunks par feature + lazy des libs lourdes (leaflet, fullcalendar…) |
| Garde auth répétée par route | guards centralisés |

---


## Workflow de prompting

1. **Créer une feature** : « Ajoute une feature `invoices` avec CRUD, table, import CSV, admin only »
   → L'IA crée `features/invoices/` + migration Supabase + RLS

2. **Modifier un écran** : « Sur employees, ajoute un filtre par département »
   → L'IA touche `employees.page.ts` + `employees.service.ts`, pas le layout

3. **Nouveau composant UI** : `npx spartan add select` puis usage dans la feature

4. **Schéma DB** : migration SQL dans `supabase/migrations/` + `npm run gen:types`

---

## Résumé en une phrase

**Custom Lovable Angular** = template Angular standalone + Spartan UI + Supabase + services/signals par feature + lazy routes + `AGENTS.md` — le même contrat de prévisibilité que Lovable, sans les défauts (bundle monolithique, data dispersée, pas de lazy loading).
