# JobRadar — plateforme intelligente de recommandation d'offres d'emploi

JobRadar agrège des offres d'emploi multi-sources, calcule un **score de
correspondance explicable (0–100)** à partir du profil de l'utilisateur, puis
présente un catalogue filtrable avec favoris et suivi de candidatures.

| | |
|---|---|
| **Frontend** | Angular 21 — standalone, Signals, Signal Forms, Tailwind CSS v4, Lucide |
| **Backend** | NestJS 12 — modules Auth / Profile / Jobs / Bookmarks, JWT, class-validator |
| **Base** | PostgreSQL 18 + Prisma 7 (driver adapter `pg`, moteur sans Rust) |
| **Tests** | Jest (30 tests unitaires) · Vitest + jsdom (8 tests de composants) |

📄 Décisions d'architecture, arbitrages et dette assumée :
**[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**

---

## 1. Démarrage rapide

```bash
# --- API -------------------------------------------------------------------
cd backend
npm install
cp .env.example .env            # renseignez JWT_SECRET au minimum

npm run db:start                # PostgreSQL local « zéro installation » (terminal 1)
npm run prisma:generate         # client Prisma typé
npm run db:migrate:sql          # applique prisma/migrations
npm run db:seed                 # 28 offres + compte de démo

npm run start:dev               # http://localhost:3000/api (terminal 2)

# --- Frontend --------------------------------------------------------------
cd ../frontend
npm install
npm start                       # http://localhost:4200 (proxy /api → :3000)
```

Compte de démonstration : **demo@jobradar.dev / Demo1234**

> **PostgreSQL existant ?** Pointez simplement `DATABASE_URL` vers votre
> instance et utilisez `npx prisma migrate deploy` (commande de référence).
> Le script `db:migrate:sql` est un fallback équivalent, utile quand le binaire
> `schema-engine` ne peut pas être téléchargé (CI hors-ligne, sandbox durcie) :
> il applique les mêmes fichiers SQL et tient le même registre
> `_prisma_migrations`, donc les deux méthodes sont interchangeables.

### Scripts utiles

| Commande (backend) | Rôle |
|---|---|
| `npm run start:dev` | API en watch mode |
| `npm run db:start` / `db:stop` | Cluster PostgreSQL local (embedded-postgres) |
| `npm run prisma:generate` | Régénère le client après modification du schéma |
| `npm run db:migrate` | `prisma migrate deploy` (prod / CI) |
| `npm run db:migrate:sql` | Fallback sans binaire schema-engine |
| `npm run db:seed` | Données de démonstration idempotentes |
| `npm test` | Tests unitaires (moteur de scoring, mappers, extracteurs) |
| `npm run typecheck` | `tsc --noEmit` sur la configuration de build |

| Commande (frontend) | Rôle |
|---|---|
| `npm start` | Dev server (proxy `/api`) |
| `npm run build` | Build de production |
| `npm test` | Tests de composants (Vitest + jsdom) |

---

## 2. Architecture

```
job/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # 10 modèles, 5 enums (cf. §3)
│   │   ├── migrations/…/migration.sql # migration SQL versionnée
│   │   ├── apply-sql-migrations.mjs   # fallback d'application des migrations
│   │   └── seed.ts                    # catalogue de démonstration
│   ├── prisma.config.ts               # datasource (Prisma 7 : plus d'URL dans le schéma)
│   ├── scripts/postgres.mjs           # cluster PostgreSQL local
│   └── src/
│       ├── main.ts                    # bootstrap, pipes, CORS, préfixe /api
│       ├── app.module.ts              # guards/interceptors/filtres globaux
│       ├── auth/                      # AuthModule : register, login, JWT, guards
│       ├── user-profile/              # UserProfileModule : profil + référentiel skills
│       ├── jobs/                      # JobSearchModule : agrégation + matching
│       │   ├── providers/             # France Travail, Remotive, catalogue interne
│       │   ├── scoring/               # moteur de score + extraction de compétences
│       │   └── job-search.service.ts  # orchestration recherche → score → pagination
│       ├── bookmarks/                 # BookmarksModule : favoris + suivi
│       ├── common/                    # décorateurs, filtres, interceptors
│       └── generated/prisma/          # client généré (typé, jamais édité)
└── frontend/
    └── src/app/
        ├── app.config.ts              # zoneless, router, interceptors, Lucide
        ├── app.routes.ts              # routes lazy (loadComponent)
        ├── core/
        │   ├── models/                # contrats de données partagés
        │   ├── services/              # api, auth, profile.store, jobs.store, …
        │   ├── guards/                # authGuard, guestGuard, profileGuard
        │   └── interceptors/          # auth (Bearer + 401), loading
        ├── shared/ui/                 # score-ring, toasts, empty-state, icônes
        ├── layout/                    # coquille authentifiée (sidebar)
        └── features/                  # auth, profile, jobs, bookmarks, dashboard
```

### Flux d'une recherche

```
Angular (JobsStore)              NestJS                              PostgreSQL
    │  GET /api/jobs?filters        │                                     │
    ├──────────────────────────────►│ JwtAuthGuard → CurrentUser          │
    │                               │ UserProfileService (profil + skills)│
    │                               │ ┌── si refresh : JobAggregator ───┐ │
    │                               │ │  providers interrogés de front  │ │
    │                               │ │  upsert idempotent + skills    ├─┤
    │                               │ └────────────────────────────────┘ │
    │                               │ prisma.jobOffer.findMany            │
    │                               │ rankOffers() → score 0-100          │
    │◄──────────────────────────────┤ items + facets + meta               │
```

---

## 3. Modèle de données (Prisma 7)

Modèles demandés : **`User`, `Profile`, `Skill`, `JobOffer`, `Bookmark`**.
S'y ajoutent les tables de jointure typées et le suivi :

| Modèle | Rôle | Points clés |
|---|---|---|
| `User` | Compte | `tokenVersion` → révocation globale des JWT |
| `Profile` | Profil de recherche (1:1) | enums contrat / mode de travail en tableaux, `radiusKm`, prétentions |
| `Skill` | Référentiel partagé profils ↔ offres | `slug` unique, `category` |
| `ProfileSkill` | Compétence d'un profil | `weight` 1–5 (auto-évaluation), `years` |
| `JobOffer` | Offre agrégée | `@@unique([source, externalId])` → upsert idempotent, `rawPayload` JSONB |
| `JobOfferSkill` | Compétence exigée par une offre | `required`, `weight` |
| `Bookmark` | Favori / candidature | `@@unique([userId, jobOfferId])`, `matchScore` historisé |
| `ApplicationEvent` | Journal des changements d'étape | alimenté automatiquement |
| `SearchRun` | Observabilité de l'agrégation | sources, volumes, erreurs, durée |

Spécificités Prisma 7 exploitées :

* générateur `prisma-client` (TypeScript généré, **plus de Rust à l'exécution**) ;
* `datasource.url` déplacée dans `prisma.config.ts` ;
* connexion via **driver adapter** `@prisma/adapter-pg` (pool `pg` partagé) ;
* types précis : `@db.Uuid`, `@db.SmallInt`, `@db.Text`, `Json`, `String[]`.

---

## 4. Moteur de matching

`backend/src/jobs/scoring/match-scoring.ts` — **fonction pure**, testée (12 cas).

```
score = Σ (critère_i × poids_i) / Σ poids_i_disponibles   → 0..100
```

| Critère | Poids | Détail |
|---|---|---|
| Compétences | 40 % | recouvrement pondéré (poids offre × auto-évaluation) + bonus/malus sur les compétences *requises* |
| Intitulé | 20 % | similarité de tokens (Jaccard) avec tolérance aux variantes (`fullstack` ≈ `full-stack`) |
| Rémunération | 13 % | confort au-delà des prétentions, dégradation si le salaire est en dessous |
| Expérience | 10 % | écart de niveau + garde-fous sur les années |
| Localisation | 10 % | ville, villes voisines, rayon, 100 % télétravail |
| Contrat | 7 % | compatibilité (CDI ↔ CDD, freelance ↔ CDI…) |

Deux principes anti-bruit :

1. **Redistribution des poids** : un critère absent des deux côtés (salaire non
   publié…) ne pénalise pas, son poids est réparti sur les autres.
2. **Explicabilité** : chaque résultat renvoie `breakdown` (score par critère),
   `matchedSkills`, `missingSkills`, `reasons` et `warnings` — affichés dans
   l'interface (« Pourquoi ce score ? »).

---

## 5. Agrégation multi-sources

Contrat commun `JobProvider` (`isEnabled()` / `search()`), exécuté **en
parallèle** par `JobAggregatorService` :

| Provider | Source | Activation |
|---|---|---|
| `FranceTravailProvider` | API France Travail (OAuth2 `client_credentials`) | clés `FRANCE_TRAVAIL_CLIENT_ID/SECRET` |
| `RemotiveProvider` | API publique d'offres remote | activé par défaut (`REMOTIVE_ENABLED`) |
| `LocalCatalogProvider` | catalogue interne déjà persisté | toujours (garantit une démo hors-ligne) |

Garanties :

* **isolation des pannes** — un provider en erreur renvoie `errors[]` sans
  bloquer les autres (visible dans `meta.sources`) ;
* **idempotence** — `upsert` sur `(source, externalId)`, rejouable sans doublon ;
* **normalisation** — contrats, modes de travail, niveaux, salaires (mensuel →
  annuel, TJM → annuel), nettoyage HTML, extraction de compétences ;
* **traçabilité** — chaque synchronisation écrit un `search_runs`.

Ajouter une source = implémenter `JobProvider` + l'enregistrer dans
`JobsModule` (`JOB_PROVIDERS`). Chaque mapper (`remotive.mapper.ts`,
`parse-salary.ts`) est un module pur, testé sans réseau.

---

## 6. API REST

Préfixe `/api`. Toutes les routes exigent `Authorization: Bearer <JWT>`
sauf `POST /auth/register`, `POST /auth/login` et `GET /health`.

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | création de compte → JWT |
| `POST` | `/auth/login` | connexion → JWT |
| `GET` | `/auth/me` | utilisateur courant |
| `POST` | `/auth/logout` | révoque tous les JWT (`tokenVersion`) |
| `GET` | `/profile` | profil de recherche |
| `PUT` | `/profile` | upsert idempotent du profil (compétences incluses) |
| `DELETE` | `/profile` | suppression du profil |
| `GET` | `/skills?q=` | référentiel de compétences (autocomplétion) |
| `GET` | `/jobs` | recherche classée + facettes + pagination |
| `POST` | `/jobs/refresh` | synchronise les providers puis renvoie les résultats |
| `GET` | `/jobs/sources` | providers actifs |
| `GET` | `/jobs/:id` | détail d'une offre + analyse du score |
| `POST` | `/bookmarks` | ajoute une offre au suivi (score historisé) |
| `GET` | `/bookmarks?status=` | suivi (filtrable) |
| `GET` | `/bookmarks/stats` | indicateurs du tableau de bord |
| `PATCH` | `/bookmarks/:id` | change d'étape, notes, prochaine action |
| `GET` | `/bookmarks/:id` | détail d'un suivi (offre, notes, historique) |
| `DELETE` | `/bookmarks/:id` | retire du suivi |
| `GET` | `/health` | santé + latence base + volumétrie |

Filtres de `/jobs` : `q`, `city`, `contractType[]`, `workMode[]`,
`experienceLevel`, `salaryMin`, `minScore`, `maxAgeDays`, `sort`
(`relevance|recent|salary`), `page`, `pageSize`, `source`, `refresh`.
Les listes acceptent `?workMode=REMOTE&workMode=HYBRID` ou `?workMode=REMOTE,HYBRID`.

**Contrat de réponse** — enveloppe homogène et erreurs normalisées :

```jsonc
// succès
{ "data": { … }, "meta": { "durationMs": 37 } }

// erreur
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Certains champs sont invalides",
  "details": ["contractTypes doit contenir au moins un élément"],
  "path": "/api/profile",
  "timestamp": "2026-11-11T13:20:00.000Z"
}
```

---

## 7. Frontend Angular 21

### Signals partout

| Usage demandé | Implémentation |
|---|---|
| `signal()` | stores (`ProfileStore`, `JobsStore`, `BookmarksStore`, `UiStore`), état local des composants |
| `computed()` | offres, facettes, complétion du profil, compteurs de filtres, entonnoir, pagination condensée |
| `linkedSignal()` | liste des compétences du formulaire de profil : se réinitialise quand le profil source change, reste éditable localement |
| `effect()` | synchronisation d'un état dérivé vers un formulaire (recharge le profil dans les Signal Forms dès qu'il arrive) |
| Signal Forms | `form()` + schéma (`required`, `email`, `minLength`, `pattern`, `min`, `max`, `validate`) sur les formulaires login / register / profil |

Complément : `provideZonelessChangeDetection()` — aucune dépendance à `zone.js`
à l'exécution, tout passe par les Signals et `OnPush`.

### Autres choix techniques

* **Standalone** : aucun `NgModule` applicatif ; `imports` par composant.
* **Lazy loading** : une route = un chunk (`loadComponent`).
* **Tailwind CSS v4** : configuration en CSS via `@theme` (tokens de couleur,
  typographie, ombres) et `@layer components` pour les classes métier.
* **Contrôles 100 % customisés** : `input`, `select` (chevron SVG, `appearance-none`),
  `option`, `checkbox` (case SVG), `toggle` (piste + pouce animés), `range`
  (piste et curseur stylés), puces de sélection (`chip`).
* **Lucide** : `LUCIDE_ICONS` + `LucideIconProvider` avec un sous-ensemble
  déclaré (`shared/ui/lucide-icons.ts`) → tree-shaking, usage standalone.
* **Interceptors fonctionnels** : `authInterceptor` (Bearer + purge session sur
  401) et `loadingInterceptor` (compteur de requêtes en vol).

### Écrans

1. **Connexion / Inscription** — split-screen marketing, validation en direct,
   indicateur de robustesse du mot de passe.
2. **Mon profil** — formulaire complet (poste, expérience, compétences pondérées
   1–5, ville + rayon, prétentions, contrats, modes de travail, présentation,
   profil actif) avec panneau de complétion en temps réel.
3. **Offres recommandées** — panneau de filtres (mot-clé, ville, contrats,
   modes, niveau, score minimum, fraîcheur, salaire, tri), cartes avec anneau
   de score, raisons/vigilances, favoris et candidature, pagination.
4. **Détail d'offre** — description, analyse critère par critère, points forts
   et points de vigilance, compétences demandées vs possédées.
5. **Mon suivi** — colonnes par étape, avancement en un clic, notes, prochaine
   action, historique journalisé.
6. **Tableau de bord** — indicateurs, meilleures correspondances, relances,
   entonnoir de candidature, compétences clés.

---

## 8. Sécurité

* **JWT** signés (HS256), `issuer` fixé, expiration configurable ;
  `JwtStrategy` recharge l'utilisateur à chaque requête et compare
  `tokenVersion` → déconnexion globale immédiate.
* **Sécurité fermée par défaut** : `JwtAuthGuard` global, routes ouvertes
  explicitement via `@Public()` ; `RolesGuard` pour `@Roles('ADMIN')`.
* **Mots de passe** : bcrypt (12 rounds) ; comparaison systématique même si
  l'e-mail est inconnu (anti-timing).
* **Validation stricte** : `class-validator` + `ValidationPipe`
  (`whitelist`, `forbidNonWhitelisted`, `transform`), DTO par route.
* **Isolation des données** : chaque requête filtre par `userId` issu du JWT
  (aucun identifiant utilisateur dans les URLs).
* **Configuration validée au boot** (`env.validation.ts`) : l'API refuse de
  démarrer si `DATABASE_URL` ou `JWT_SECRET` sont absents/faibles.

---

## 9. Tests

```bash
cd backend  && npm test    # Jest   — 30 tests : scoring, extraction, mappers, salaires
cd frontend && npm test    # Vitest — 8 tests  : rendu JobCard, ProfileForm (Signals)
```

Le backend est testé avec **Jest + ts-jest**. Les modules purs (scoring,
extraction de compétences, mapping fournisseurs) sont couverts sans base ni
réseau : `fetch` est remplacé par un double, `prisma` n'intervient jamais.
Les suites sont organisées par responsabilité :

| Suite | Cas | Objet |
|---|---|---|
| `scoring/match-scoring.spec.ts` | 12 | poids, redistribution, plafonnement, explications |
| `scoring/skill-extractor.spec.ts` | 6 | détection de compétences et de niveaux |
| `scoring/providers.spec.ts` | 4 | contrats de providers, normalisation des sources |
| `providers/remotive.mapper.spec.ts` | 8 | contrat, télétravail, salaire, HTML, stage |

Côté frontend, `@angular/build:unit-test` exécute **Vitest** sur **jsdom** ;
`src/test-setup.ts` fournit les API navigateur manquantes (`matchMedia`,
`ResizeObserver`). Les composants sont montés via `TestBed` et interrogés par
leur DOM réel (rôle, `aria-*`, texte visible), pas par leurs internes.

Couverture fonctionnelle vérifiée manuellement de bout en bout (PostgreSQL +
API + proxy Angular) : inscription/connexion, upsert de profil (validation
stricte), recherche classée, filtres multivalués, détail, favoris, transitions
de statut, idempotence de l'agrégation, 401/409/400.

---

## 10. Aller plus loin

* **Cache de recherche** : Redis + clé `hash(profil, filtres)` (le scoring est
  déterministe, donc cacheable).
* **Recherche plein texte** : index `pg_trgm`/`tsvector` ou OpenSearch quand le
  catalogue dépasse quelques milliers d'offres (aujourd'hui : filtrage SQL +
  scoring en mémoire borné à 400 offres).
* **Planification** : CRON (`@nestjs/schedule`) sur `JobAggregatorService.aggregate`
  + notifications sur nouvelles offres à score élevé.
* **Scraping** : le contrat `JobProvider` accepte aussi un provider HTML
  (Playwright) sans toucher au reste de la chaîne.
