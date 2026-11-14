-- À deux — schéma relationnel Supabase/PostgreSQL. Réexécutable sans perte de données.
-- Utilise text pour les identifiants historiques (UUID ou ids libres) et numeric(14,2) pour les euros.
create table if not exists public.foyers (
  code text primary key check (length(code) between 1 and 100),
  nom text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.personnes (
  id text primary key,
  home_code text not null references public.foyers(code) on delete cascade,
  nom text not null,
  cle text not null check (cle in ('julien','carla','commun')),
  unique(home_code,cle), unique(home_code,id)
);
create table if not exists public.comptes (
  id text primary key,
  home_code text not null references public.foyers(code) on delete cascade,
  personne_id text not null,
  nom text not null,
  devise char(3) not null default 'EUR' check (devise='EUR'),
  foreign key(home_code,personne_id) references public.personnes(home_code,id) on delete cascade,
  unique(home_code,id)
);
create table if not exists public.budget_months (
  home_code text not null references public.foyers(code) on delete cascade,
  month_key text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  state_meta jsonb not null default '{}'::jsonb,
  -- Compatibilité avec l'ancienne table public.budget_months(home_code,month,data).
  month text,
  data jsonb,
  -- États de réception propres au mois (clé revenu -> {received,date,day}).
  income_receipts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(home_code,month_key)
);
-- Migration transparente d'une installation antérieure qui ne contenait que month/data.
alter table public.budget_months add column if not exists month_key text;
alter table public.budget_months add column if not exists state_meta jsonb not null default '{}'::jsonb;
alter table public.budget_months add column if not exists month text;
alter table public.budget_months add column if not exists data jsonb;
-- Migration des bases existantes : reçus mensuels des revenus, distincts des données du revenu.
alter table public.budget_months add column if not exists income_receipts jsonb not null default '{}'::jsonb;
update public.budget_months set month_key=coalesce(month_key,month), state_meta=case when data is not null and state_meta='{}'::jsonb then data else state_meta end;
create unique index if not exists budget_months_home_month_key_uidx on public.budget_months(home_code,month_key);
create unique index if not exists budget_months_home_month_uidx on public.budget_months(home_code,month);

create table if not exists public.reglages_foyer (
  home_code text primary key references public.foyers(code) on delete cascade,
  logement jsonb not null default '{"habite":"julien","mode":"prorata"}'::jsonb,
  curseur_repartition numeric(5,2) check(curseur_repartition between 0 and 100),
  autres jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.revenus (
  id text not null,
  home_code text not null references public.foyers(code) on delete cascade,
  name text not null,
  personne text not null check(personne in ('julien','carla')),
  montant numeric(14,2) not null check(montant>=0),
  jour_versement smallint check(jour_versement between 1 and 31),
  attributes jsonb not null default '{}'::jsonb,
  primary key(home_code,id)
);
create table if not exists public.depenses (
  id text not null,
  home_code text not null references public.foyers(code) on delete cascade,
  name text not null,
  montant numeric(14,2) not null check(montant>=0),
  categorie text,
  proprietaire text check(proprietaire in ('Julien','Carla','Commun')),
  repartition text,
  part_julien numeric(5,2) check(part_julien between 0 and 100),
  mode_repartition text check(mode_repartition in ('prorata','custom')),
  type_depense text,
  payeur text check(payeur in ('julien','carla')),
  mode_prelevement text not null default 'Unique' check(mode_prelevement in ('Unique','Multiple')),
  mode_reglement text check(mode_reglement in ('avance','parts')),
  jour_prelevement smallint check(jour_prelevement between 1 and 31),
  active boolean not null default true,
  attributes jsonb not null default '{}'::jsonb,
  primary key(home_code,id)
);
create table if not exists public.depense_prelevements (
  id text primary key,
  home_code text not null,
  depense_id text not null,
  numero smallint not null check(numero>0),
  montant numeric(14,2) not null check(montant>=0),
  jour_prelevement smallint check(jour_prelevement between 1 and 31),
  date_prelevement date,
  unique(home_code,depense_id,numero),
  foreign key(home_code,depense_id) references public.depenses(home_code,id) on delete cascade
);
create table if not exists public.depense_etats_mensuels (
  home_code text not null,
  depense_id text not null,
  month_key text not null check(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  paye boolean not null default false,
  date_paiement date,
  jour_ajuste smallint check(jour_ajuste between 1 and 31),
  paye_julien boolean,
  paye_carla boolean,
  date_julien date,
  date_carla date,
  jour_julien smallint check(jour_julien between 1 and 31),
  jour_carla smallint check(jour_carla between 1 and 31),
  primary key(home_code,depense_id,month_key),
  foreign key(home_code,depense_id) references public.depenses(home_code,id) on delete cascade
);
create table if not exists public.depense_paiements (
  id text not null,
  home_code text not null,
  depense_id text not null,
  month_key text not null check(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  montant numeric(14,2) not null check(montant>=0),
  personne text not null check(personne in ('julien','carla')),
  date_paiement date,
  attributs jsonb not null default '{}'::jsonb,
  primary key(home_code,id),
  foreign key(home_code,depense_id) references public.depenses(home_code,id) on delete cascade
);
create table if not exists public.soldes_reels (
  home_code text not null references public.foyers(code) on delete cascade,
  personne text not null check(personne in ('julien','carla')),
  date_solde date not null,
  montant numeric(14,2) not null,
  primary key(home_code,personne,date_solde)
);
create table if not exists public.remboursements (
  id text not null,
  home_code text not null references public.foyers(code) on delete cascade,
  month_key text not null check(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  date_remboursement date,
  montant numeric(14,2) not null check(montant>=0),
  debiteur text not null check(debiteur in ('julien','carla')),
  creancier text not null check(creancier in ('julien','carla')),
  attributes jsonb not null default '{}'::jsonb,
  primary key(home_code,id), check(debiteur<>creancier)
);
create table if not exists public.ajustements (
  home_code text not null references public.foyers(code) on delete cascade,
  month_key text not null check(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  cle text not null,
  donnees jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(home_code,month_key,cle)
);
create index if not exists depenses_home_category_idx on public.depenses(home_code,categorie);
-- Migration des bases existantes : retirer les anciennes colonnes de période.
-- À exécuter explicitement (ou décommenter) après vérification de la sauvegarde.
-- drop index if exists public.revenus_home_period_idx;
-- drop index if exists public.depenses_home_period_idx;
-- alter table public.revenus drop column if exists date_debut cascade;
-- alter table public.revenus drop column if exists date_fin cascade;
-- alter table public.depenses drop column if exists date_debut cascade;
-- alter table public.depenses drop column if exists date_fin cascade;
create index if not exists depense_etats_month_idx on public.depense_etats_mensuels(home_code,month_key);
create index if not exists depense_paiements_month_idx on public.depense_paiements(home_code,month_key,depense_id);
create index if not exists soldes_reels_history_idx on public.soldes_reels(home_code,date_solde desc);
create index if not exists remboursements_month_idx on public.remboursements(home_code,month_key);
-- Les identifiants de personnes/comptes restent liés à un foyer, pas à un utilisateur :
-- amorçage des personnes fixes effectué par le navigateur à la première sauvegarde (voir README).
-- RLS simple compatible anon sans Auth : accès global ouvert. C'est un compromis délibéré,
-- adapté uniquement à un foyer non sensible / usage privé non sécurisé. Code foyer n'est pas un secret.
do $$ declare t text; begin
  foreach t in array array['foyers','personnes','comptes','budget_months','reglages_foyer','revenus','depenses','depense_prelevements','depense_etats_mensuels','depense_paiements','soldes_reels','remboursements','ajustements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists anon_all on public.%I',t);
    execute format('create policy anon_all on public.%I for all to anon using (true) with check (true)',t);
  end loop;
end $$;
-- Création des personnes et comptes de couple correspondants est alimentée à la demande dans l'app.
grant usage on schema public to anon;
grant select, insert, update, delete on table public.foyers, public.personnes, public.comptes, public.budget_months, public.reglages_foyer, public.revenus, public.depenses, public.depense_prelevements, public.depense_etats_mensuels, public.depense_paiements, public.soldes_reels, public.remboursements, public.ajustements to anon;
