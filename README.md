# SBF Pulse

Application de suivi des **marchés, appels d'offres, chiffrages et chantiers** de SBF
(Terrassement · VRD & Infrastructure · Hydraulique & Portuaire).

Elle remplace le prototype `SBFPulse_v7.html` + fichier JSON local par une base de données
cloud partagée : Ahmed et la Direction Générale voient **les mêmes chiffres en direct**, sur
téléphone comme sur ordinateur.

## Fonctionnalités

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Contrats en cours, reste à réaliser, marge prévue, résultat réel (facturé − coûts), offres en attente, taux de réussite, chantiers en retard, KPI non respectés, répartition par type et par client |
| **Marchés** | Recherche instantanée (nom, client, lieu, chef de projet…, sans tenir compte des accents) + filtres statut / type |
| **Fiche marché** | Tous les chiffres d'un marché sur une page : montants HT/TTC, marge en % et en DT, avance, retenue, délais client vs objectif SBF, dates de fin, avancement, contrôle des KPI, intervenants, PDF, planning |
| **Planning** | Diagramme de Gantt de tous les chantiers (OS → objectif SBF, échéance client en rouge) + tâches par marché |
| **Importer** | Reprise du fichier `sbf_marches_chiffrage_*.json` ; les PDF en base64 sont déplacés dans le stockage cloud |

- **Temps réel** : toute modification apparaît immédiatement sur les autres appareils connectés.
- **Mobile** : barre de navigation en bas de l'écran ; installable sur l'écran d'accueil (PWA).
- **Accès** : uniquement les comptes créés par l'administrateur ; tout utilisateur connecté peut consulter et modifier.

## Mise en route

### 1. Base de données Supabase

1. Ouvrez votre projet sur https://supabase.com/dashboard
2. **SQL Editor** → **New query** → collez le contenu de [`supabase/migrations/0001_sbf_pulse.sql`](supabase/migrations/0001_sbf_pulse.sql) → **Run**
   (crée les tables, la sécurité, le stockage des PDF et le temps réel)
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

Ouvrez http://localhost:3000, connectez-vous, puis **Importer** → choisissez le fichier JSON.

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
| `margeObjectif` | 8 % | Marge prévue minimale ; en dessous, le marché est signalé |
| `tauxTva` | 19 % | Calcul du TTC quand il n'est pas saisi |
| `uniteDelai` | mois | Unité de « délai client » et « objectif SBF » |
| `toleranceAvancement` | 10 pts | Écart toléré entre avancement physique et délai consommé |

Les listes de statuts et de types de travaux se modifient dans le même fichier.

## Structure

```
supabase/migrations/   Schéma SQL (tables, sécurité RLS, stockage, temps réel)
src/app/login/         Page de connexion
src/app/dashboard/     Tableau de bord, marches/, planning/, import/
src/features/sbf/      Composants d'écran (fiche, formulaire, liste, Gantt…)
src/lib/sbf/           Types, calculs financiers & KPI, accès aux données, import JSON
src/lib/supabase/      Clients Supabase (navigateur / serveur)
src/proxy.ts           Protection des pages (redirection vers /login)
src/config/sbf.ts      Réglages métier
```

Construit sur [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
(Next.js 16, shadcn/ui, Tailwind CSS v4) — licence MIT.
