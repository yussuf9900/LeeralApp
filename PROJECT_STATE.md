# Projet Leeral - API Stateless de Facturation Multiservices

Ce document sert de mémoire d'état et de contexte pour les agents IA (comme Antigravity) et les développeurs travaillant sur le projet. **À lire en priorité lors de l'initialisation de chaque session.**

---

## 1. Vue d'Ensemble du Projet
* **Nom de code** : Leeral
* **Objectif** : API Stateless de facturation multiservices pour les réseaux **Senelec** (électricité) et **Sen'Eau** (eau) au Sénégal.
* **Philosophie d'Architecture** : API robuste, entièrement stateless, avec protection absolue contre la double facturation (idempotence) et calculs financiers de haute précision.

---

## 2. Stack Technique
* **Runtime** : Node.js (v18-alpine dans Docker)
* **Langage** : TypeScript (v5.4.5, mode strict activé)
* **Framework Web** : Express (v5.x)
* **Base de Données** : PostgreSQL 15
* **Bibliothèques clés** :
  * `decimal.js` : Utilisée pour tous les calculs monétaires et de consommation (évite les dérives de précision binaire des floats).
  * `pg` : Client PostgreSQL.
  * `jsonwebtoken` : Gestion de l'authentification et des sessions stateless.
  * `dotenv` : Gestion des variables d'environnement.

---

## 3. Workflow & Qualité
* **Git** : Dépôt initialisé. Branche principale de développement `dev`, branche de travail active `implement/init-architecture`.
* **Conventional Commits** : Imposé strictement via `commitlint` (config `@commitlint/config-conventional`) et `husky`.
* **Hooks de Qualité** (Husky) :
  * `commit-msg` : Valide le format du commit (ex: `feat: ...`, `fix: ...`, `chore: ...`).
  * `pre-commit` : Exécute une compilation TypeScript locale (`npm run build`) pour interdire la validation de code cassé.
  * *Note* : Le script de prepare husky est configuré pour s'ignorer en production et dans Docker (`test -d .git && husky || true`).

---

## 4. Architecture Docker & Ports (Mode Dev)
La stack est orchestrée avec Docker Compose et supporte le rechargement à chaud (Hot-Reload) :
* **Application Node (App)** :
  * Cible de build : stage `development` du Dockerfile.
  * Volume monté : `.:/app` (sauf `node_modules` isolé via volume anonyme) pour répercuter les changements en direct.
  * Port externe : **`3001`** (redirigé vers `3000` interne).
  * URL du Healthcheck : `http://localhost:3001/health`
* **Base de Données (DB)** :
  * Image : `postgres:15-alpine`
  * Port externe : **`5433`** (pour éviter les conflits avec un PostgreSQL local actif sur le port 5432).
  * Volume nommé : `pgdata` (persistance des données de la DB).
  * Script d'initialisation : [init.sql](file:///home/ichigo/Bureau/PROJETS-PERSO/Leeral/init.sql) (monté dans `/docker-entrypoint-initdb.d/`).

---

## 5. Schéma de la Base de Données (`init.sql`)
Trois tables principales ont été définies :
1. **`utilisateurs`** : Profils utilisateurs (id UUID, nom, email UNIQUE, password_hash, rôle, statut subventionné ou non, type de ville pour l'assainissement).
2. **`tarifs`** : Grille tarifaire dynamique par service (Senelec/Sen'Eau) avec paliers de consommation et prix unitaires.
3. **`factures`** : Suivi des factures générées (id UUID, utilisateur_id, service, consommation, montant HT, TVA, redevance, droit de timbre, total TTC).
   * **Contrainte Financière/Consommation** : Utilisation stricte et exclusive du type `NUMERIC(15,2)`. Le type `FLOAT` est strictement interdit pour des raisons de précision légale.
   * **Idempotence** : Le champ `idempotency_key` est marqué `UNIQUE` pour interdire les requêtes dupliquées.

---

## 6. Historique de l'Initialisation (Fait)
* [x] Dépôt Git configuré avec branches `dev` et `implement/init-architecture`.
* [x] Configuration Husky & Commitlint validée.
* [x] Package.json et tsconfig.json strict mis en place.
* [x] Écriture du script d'initialisation de la DB [init.sql](file:///home/ichigo/Bureau/PROJETS-PERSO/Leeral/init.sql).
* [x] Dockerfile multi-stage et docker-compose.yml créés et validés.
* [x] Stack déployée avec succès en mode dev.
* [x] Healthcheck de l'API validé à 100% sur `http://localhost:3001/health`.

---

## 7. Prochaines Étapes
1. **Authentification** : Implémenter le middleware de sécurité, le service JWT, et le `AuthController` (Inscription/Connexion).
2. **Logique Métier Senelec** : Implémenter `SenelecWoyofalCalculator` (prise en compte de la redevance fixe à la 1re recharge du mois, paliers tarifaires Senelec, exonération TVA si conso <= 250 kWh).
3. **Logique Métier Sen'Eau** : Implémenter `SeneauCalculator` (calcul par tranches bimestrielles, droit de timbre fiscal de 1% sur le montant HT si paiement `CASH`).
4. **Gestion de l'Idempotence** : Écrire le service `IdempotencyManager` et le middleware associé pour intercepter les requêtes avec `idempotency_key` et retourner directement le résultat déjà calculé si disponible en base de données.
