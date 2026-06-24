## Phase 1 : Le Socle Technique (Init & UI)

L'objectif est d'avoir une coquille vide prête à l'emploi avec les bons outils.

1. ~~Init Angular 19 : Génération d'un nouveau projet Angular (standalone, routing).~~
2. ~~Tailwind v4 & Spartan UI : Installation et configuration de l'UI (Helm & Brain). On ajoutera quelques composants de base (boutons, inputs).~~
3. ~~Connecteur Supabase : Installation de @supabase/supabase-js, script gen:types pour récupérer les types TypeScript depuis ta base locale, et création du SupabaseService.~~
4. ~~Layout de base : Création du AppLayout (Sidebar + Header vide) pour avoir la structure visuelle type "dashboard".~~

## Phase 2 : Le Core (Auth & Sécurité)

On met en place l'accès et les droits (indispensable avant de faire des features métier).

1. Services d'Auth : Création du AuthService basé sur les Signals (gestion de l'état utilisateur courant, rôles, permissions).
2. Guards Angular : Création de authGuard et roleGuard.
3. Pages publiques : Écran de Login.

## Phase 3 : La feature Pilote (Gestion des Utilisateurs)

C'est ici qu'on valide le "CRUD pattern" qui servira d'exemple à l'IA pour toutes les futures features.

1. Architecture lazy : Création du dossier features/users/ avec son routing lazy (loadChildren / loadComponent).
2. Le Service : users.service.ts avec la couche data (Signals + requêtes Supabase).
3. L'Interface : users.page.ts, la Data Table Spartan (hlm-table), et le dialogue de création/édition (hlm-dialog).
4. Idem pour les Groupes ou les affectations de Rôles si on veut pousser l'exemple.

## Phase 4 : Documentation & Standardisation IA

1. Règles métier IA : Finalisation du fichier AGENTS.md ou .cursorrules contenant le résumé explicite pour l'IA (comment créer une feature, où placer les fichiers, ne pas faire d'appels BDD depuis les composants, etc.).
2. Validation : Test "à blanc" où l'on demande à l'IA de générer une petite feature imaginaire pour vérifier que le boilerplate cadre bien sa réponse.
