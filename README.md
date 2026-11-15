# SBF Pulse

Application de suivi des **marchés, appels d'offres, chiffrages et chantiers** de SBF
(Terrassement · VRD & Infrastructure · Hydraulique & Portuaire).

Elle remplace le prototype `SBFPulse_v7.html` + fichier JSON local par une base de données
cloud partagée : Ahmed et la Direction Générale voient **les mêmes chiffres en direct**, sur
téléphone comme sur ordinateur.

## Fonctionnalités

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Carnet de commandes, offres en attente, offres perdues, taux d'acceptation, évolution du carnet vs offres, résultat réel cumulé, points d'attention, répartitions par type et par client |
| **Marchés** | Recherche instantanée (nom, client, lieu, chef de projet…, sans tenir compte des accents) + filtres statut / type ; création dans une fenêtre modale |
| **Fiche marché** | Tous les chiffres d'un marché sur une page : montants HT/TTC, avance, retenue, délais client vs objectif SBF, dates de fin, avancement, contrôle des KPI, intervenants, PDF, planning d'exécution |
| **Planning** | Planning hebdomadaire des remises d'offres : calendrier 7 jours, codes `T/CATÉGORIE/N°/ANNÉE` générés automatiquement, recherche par segment d'identifiant, export CSV et rapport PDF imprimable |
| **Importer** | CSV, Excel, TXT ou JSON : détection automatique des colonnes, vérification avant import, création ou mise à jour. L'import JSON du prototype déplace aussi les PDF en base64 vers le stockage cloud |

- **Temps réel** : toute modification apparaît immédiatement sur les autres appareils connectés.
- **Mobile** : barre de navigation en bas de l'écran ; installable sur l'écran d'accueil (PWA).
- **Accès** : uniquement les comptes créés par l'administrateur ; tout utilisateur connecté peut consulter et modifier.

### Planning hebdomadaire

Chaque ligne du planning correspond à une **remise d'offre** sur une fenêtre de **7 jours maximum** :

- le code `T/CATÉGORIE/N°/ANNÉE` (ex. `T/VRD/31/2026`) est généré par la base, avec une
  numérotation propre à chaque catégorie et chaque année ;
- l'année du code est toujours déduite de la date de début ; changer la catégorie ou l'année
  renumérote l'entrée automatiquement ;
- un marché existant peut être lié (facultatif) pour retrouver la fiche correspondante ;
- le tableau se filtre par préfixe, catégorie, numéro et année, puis s'exporte en CSV ou
  s'imprime en rapport PDF (Ctrl+P → Enregistrer au format PDF).

## Mise en route

### 1. Base de données Supabase

1. Ouvrez votre projet sur https://supabase.com/dashboard
2. **SQL Editor** → **New query** → exécutez les migrations **dans l'ordre** :
   - [`supabase/migrations/0001_sbf_pulse.sql`](supabase/migrations/0001_sbf_pulse.sql)
   - [`supabase/migrations/0002_prd_foundation.sql`](supabase/migrations/0002_prd_foundation.sql)
   - [`supabase/migrations/0003_weekly_planning.sql`](supabase/migrations/0003_weekly_planning.sql)
   - [`supabase/migrations/0004_planning_hardening.sql`](supabase/migrations/0004_planning_hardening.sql)

   (tables, sécurité, stockage des PDF, temps réel, statuts PRD, code/passation/cautions, planning hebdomadaire des remises d'offres et durcissement de la numérotation)
3. **Authentication → Sign In / Providers** : désactivez **Allow new users to sign up**
   (personne ne peut créer de compte tout seul)
4. **Authentication → Users → Add user → Create new user** : créez un compte (e-mail + mot de passe)
   pour Ahmed et pour chaque directeur, en cochant **Auto Confirm User**

### 2. Clés de connexion

Copiez `env.example.txt` en `.env.local` et remplissez avec **Project Settings → API Keys** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

### 3. Lancer en local

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000, connectez-vous, puis **Importer** → choisissez un fichier CSV, Excel, TXT ou JSON. Vérifiez les colonnes détectées, puis lancez l'import.

### 4. Mettre en ligne (accès depuis la maison / le téléphone)

Le plus simple : [Vercel](https://vercel.com) (gratuit pour ce volume).
Importez le dépôt Git, ajoutez les deux variables `NEXT_PUBLIC_SUPABASE_*` dans
**Settings → Environment Variables**, puis déployez. Ajoutez ensuite l'adresse obtenue dans
Supabase → **Authentication → URL Configuration → Site URL**.

### 5. Installer sur le téléphone

Ouvrez l'adresse du site dans le navigateur du téléphone :
- **iPhone (Safari)** : bouton Partager → *Sur l'écran d'accueil*
- **Android (Chrome)** : menu ⋮ → *Installer l'application*

## Réglages métier

Dans [`src/config/sbf.ts`](src/config/sbf.ts) :

| Réglage | Valeur | Rôle |
|---|---|---|
| `objectifTauxReussite` | 30 % | Objectif interne de taux d'acceptation (win rate) |
| `tauxTva` | 19 % | Calcul du TTC quand il n'est pas saisi |
| `uniteDelai` | mois | Unité de « délai client » et « objectif SBF » |
| `toleranceAvancement` | 10 pts | Écart toléré entre avancement physique et délai consommé |
| `autoLockMinutes` | 10 min | Verrouillage automatique de l'application après inactivité |

Les listes de statuts et de types de travaux se modifient dans le même fichier.

## Structure

```
supabase/migrations/   Schéma SQL (tables, sécurité RLS, stockage, temps réel)
src/app/login/         Page de connexion
src/app/dashboard/     Tableau de bord, marches/, planning/, import/
src/features/sbf/      Composants d'écran (fiche, formulaires, listes, planning, imports)
src/lib/sbf/           Types, calculs financiers & KPI, planning, accès aux données, import multi-format
src/lib/supabase/      Clients Supabase (navigateur / serveur)
src/proxy.ts           Protection des pages (redirection vers /login)
src/config/sbf.ts      Réglages métier
```

Construit sur [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
(Next.js 16, shadcn/ui, Tailwind CSS v4) — licence MIT.
