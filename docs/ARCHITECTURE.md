# JobRadar — décisions d'architecture

Document de référence pour les choix structurants : le *pourquoi*, les
arbitrages et les pistes d'évolution. Le `README.md` décrit le *quoi*.

---

## 1. Vue d'ensemble

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│  Angular 21 (SPA)            │  /api  │  NestJS 12                        │
│  • standalone + Signals      │◄──────►│  • AuthModule    (JWT, bcrypt)    │
│  • Signal Forms              │  proxy │  • UserProfileModule (profil)     │
│  • Tailwind v4 + Lucide      │        │  • JobsModule    (agrégation)     │
│  • zoneless, OnPush          │        │  • BookmarksModule (suivi)        │
└──────────────────────────────┘        └──────────────┬────────────────────┘
                                                       │ Prisma 7 + pg adapter
                                        ┌──────────────▼────────────────────┐
                                        │  PostgreSQL 18 (UUID, JSONB, [] ) │
                                        └───────────────────────────────────┘
                                        ┌───────────────────────────────────┐
                                        │  Providers d'offres               │
                                        │  France Travail · Remotive · Seed │
                                        └───────────────────────────────────┘
```

Trois couches, une seule direction de dépendance : le frontend ne connaît que
`/api`, l'API ne connaît que PostgreSQL et les providers.

---

## 2. Pourquoi Prisma 7 « sans moteur »

Prisma 7 supprime le moteur Rust côté application :

* **Schéma** — `datasource db { provider = "postgresql" }` uniquement ; l'URL
  vit dans `prisma.config.ts` (CLI) et dans le constructeur du client (runtime).
  Un même schéma sert donc plusieurs environnements sans variable d'env dans le
  fichier versionné.
* **Client** — générateur `prisma-client` : code TypeScript généré et importable
  (`src/generated/prisma`), donc typé de bout en bout et disponible pour
  l'autocomplétion des enums dans les DTO.
* **Connexion** — `@prisma/adapter-pg` réutilise le pool `pg` : pas de binaire
  à embarquer dans l'image Docker, réglages de pool standards (`max`, timeouts).

Conséquence opérationnelle : `prisma migrate` reste la voie normale
(`db:migrate`), mais un fallback `prisma/apply-sql-migrations.mjs` applique les
mêmes fichiers SQL en tenant le registre `_prisma_migrations`. Les deux chemins
sont interchangeables — utile en CI restreinte où `binaries.prisma.sh` est
bloqué.

---

## 3. Le scoring comme fonction pure

`scoreOffer(profile, offer)` ne touche ni la base ni le framework. Ce choix a
trois conséquences voulues :

1. **Testabilité** — 12 cas couvrent les cas limites (salaire inconnu, niveau
   supérieur, contrat incompatible, offre ancienne) sans mock.
2. **Réutilisabilité** — la même fonction score le catalogue (recherche), une
   offre seule (détail) et historise le score d'un favori
   (`BookmarksService.computeScore`). Un futur job batch de pré-calcul n'aura
   qu'à l'appeler.
3. **Portabilité** — transposable côté client pour un « matching live » pendant
   la saisie du profil.

### Redistribution des poids

Un critère absent **des deux côtés** vaut `null` et sort du dénominateur :

```
score = Σ(valeur_i × poids_i) / Σ(poids_i disponibles)
```

Une offre sans salaire publié n'est donc pas punie : les 13 points basculent sur
les critères renseignés. C'est la principale différence avec un score « additif
naïf », qui classerait systématiquement les offres transparentes en bas de pile.

### Anti-bruit sur les compétences

Le recouvrement seul surévalue les offres listant beaucoup de technos. On
compose donc :

* poids offre (1–5, 5 si la compétence apparaît dans l'intitulé) × poids profil
  (auto-évaluation 1–5) ;
* **bonus/malus sur les compétences explicitement requises** : sous 50 % de
  couverture des exigences, pénalité proportionnelle.

Résultat observé sur le catalogue de démo : l'offre idéale (Angular/NestJS à
Paris, CDI, 48–58 k€) sort à 92/100, une offre « même famille » à Nantes en
sur-site à 81, une offre senior 100 % remote à 72, une offre hors sujet sous 40.

---

## 4. Agrégation : contrats plutôt qu'héritage

`JobProvider` est une interface de 4 membres. L'agrégateur :

* **filtre** les providers actifs (`isEnabled()` — clés absentes ⇒ provider
  ignoré silencieusement) ;
* **exécute en parallèle** avec gestion d'erreur par provider (une API en
  panne ne doit jamais vider le catalogue) ;
* **déduplique** sur `(source, externalId)` puis **upsert** ;
* **trace** l'exécution (`search_runs`) pour répondre à « pourquoi cette offre
  n'apparaît pas ? ».

La normalisation est séparée du transport (`remotive.mapper.ts`,
`parse-salary.ts`, `skill-extractor.ts`) : ces modules sont purs, testés, et
réutilisables par un import batch.

**Pourquoi pas de scraping par défaut ?** Les sources retenues exposent des APIs
documentées (France Travail, Remotive). Le contrat `JobProvider` accepte un
provider HTML (Playwright) sans modifier le reste de la chaîne — c'est la porte
d'entrée prévue si un site sans API devient indispensable.

---

## 5. Frontend : Signals plutôt que state global

| Décision | Raison |
|---|---|
| Stores `providedIn: 'root'` exposant `signal` + `computed` | pas de dépendance externe (NgRx), état partagé typé, dérivations gratuites |
| `computed` pour tout ce qui est dérivable | une seule source de vérité ; les compteurs de filtres, facettes, entonnoir, pagination ne peuvent pas se désynchroniser |
| `linkedSignal` pour les compétences du profil | l'utilisateur édite une liste locale qui doit se réinitialiser quand un autre profil est chargé — exactement le cas d'usage du linked signal |
| `input.required<string>()` pour l'identifiant d'offre | `withComponentInputBinding` lie `:id` à l'entrée du composant, sans `ActivatedRoute` à interroger |
| Signal Forms pour les formulaires | validation déclarative, erreurs typées par champ, zéro `ReactiveFormsModule` |
| Zoneless + `OnPush` partout | cohérence : plus de « pourquoi ça ne se rafraîchit pas ? » lié à la zone |

### Interceptors

`authInterceptor` ajoute le Bearer et purge la session sur 401 (redirection avec
`redirect` mémorisé). `loadingInterceptor` incrémente un **compteur** (pas un
booléen) : plusieurs requêtes parallèles ne font pas clignoter la barre.

### Design system

Tailwind v4 se configure en CSS. Les tokens (`@theme`) produisent les classes
utilisées partout ; les classes métier (`@layer components`) encapsulent les
contrôles (`input`, `select`, `chip`, `toggle`, `checkbox`, `btn-*`). Aucun
style natif de navigateur n'est visible : `select` a un chevron SVG,
`appearance-none` et des `option` stylées, `checkbox`/`toggle`/`range` sont des
composants CSS pilotés par `:checked` et `:has()`.

---

## 6. Sécurité — défauts fermés

| Risque | Mesure |
|---|---|
| Route oubliée sans protection | `JwtAuthGuard` global ; ouverture explicite `@Public()` |
| JWT volé / session longue | `tokenVersion` en base, comparée à chaque requête → révocation immédiate |
| Énumération d'e-mails | bcrypt comparé même quand l'utilisateur n'existe pas |
| Mass assignment | `whitelist` + `forbidNonWhitelisted` ; DTO explicites, pas de `...body` |
| Fuite inter-comptes | `userId` toujours issu du token, jamais du payload |
| Config manquante en prod | validation d'environnement au démarrage (échec immédiat) |

---

## 7. Performances

* **Recherche** : filtrage SQL (index sur `publishedAt`, `city`, `contractType`,
  `title`, `company`) puis scoring en mémoire borné à 400 offres — sous 50 ms
  mesurées sur le catalogue de démo.
* **Facettes** calculées avant pagination : les compteurs restent exacts.
* **Pagination** condensée côté client, sans requête supplémentaire.
* **Frontend** : build initial ~111 kB transférés (hors polices), routes
  lazy, icônes tree-shakées.

### Seuils de bascule

| Volume | Action |
|---|---|
| > 5 000 offres | `tsvector` + `pg_trgm` (ou OpenSearch), scoring sur top-N |
| Trafic soutenu | cache Redis `hash(profil, filtres)` — le score est déterministe |
| Multi-régions | réplicas lecture pour la recherche, primaire pour les écritures |

---

## 8. Dette assumée & prochaines étapes

1. **Tests d'intégration HTTP** — scénario complet (register → profil →
   recherche → favori) à automatiser via `supertest` sur une base éphémère ; le
   parcours est aujourd'hui validé manuellement (cf. `README` §9).
   Les seuls tests automatisés portent sur les modules purs (30 tests).
2. **Distance géographique réelle** — le rayon s'appuie sur une table de villes
   voisines ; un géocodage (ou `PostGIS`) rendrait le critère exact.
3. **Synchronisation planifiée** — `@nestjs/schedule` + verrou distribué pour
   éviter deux agrégations concurrentes.
4. **Notifications** — e-mail sur nouvelle offre à score > seuil (file
   BullMQ).
5. **Accessibilité** — audit RGAA complet ; les bases sont posées (labels,
   `aria-*`, focus visible, `prefers-reduced-motion`, lien d'évitement).
