-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: utilisateurs (Users)
CREATE TABLE IF NOT EXISTS utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
    is_subvented BOOLEAN NOT NULL DEFAULT false,
    ville_type VARCHAR(50) NOT NULL DEFAULT 'NON_ASSAINIE',
    budget_mensuel NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: tarifs (Tariffs for Senelec & Sen'Eau)
CREATE TABLE IF NOT EXISTS tarifs (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL, -- 'Senelec' or 'Sen_Eau'
    type_tarif VARCHAR(50) NOT NULL, -- e.g., 'DOMESTIQUE_SOCIAL', 'DOMESTIQUE_NON_SOCIAL', 'COMMERCIAL', 'PROFESSIONNEL'
    prix_par_unite NUMERIC(15,2) NOT NULL, -- Financial field
    palier_debut NUMERIC(15,2) DEFAULT 0.00, -- Consumption field
    palier_fin NUMERIC(15,2), -- Consumption field
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: factures (Bills / Invoices)
CREATE TABLE IF NOT EXISTS factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL, -- 'Senelec' or 'Sen_Eau'
    reference_facture VARCHAR(100) NOT NULL,
    consommation NUMERIC(15,2) NOT NULL, -- Consumption field
    montant_ht NUMERIC(15,2) NOT NULL, -- Financial field
    tva NUMERIC(15,2) NOT NULL, -- Financial field
    redevance NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- Financial field
    droit_de_timbre NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- Financial field
    montant_ttc NUMERIC(15,2) NOT NULL, -- Financial field
    mode_paiement VARCHAR(20) NOT NULL DEFAULT 'DIGITAL', -- 'CASH' or 'DIGITAL'
    statut VARCHAR(20) NOT NULL DEFAULT 'NON_PAYE', -- 'PAYE', 'NON_PAYE', 'ANNULE'
    date_echeance DATE NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL, -- Strict uniqueness constraint for stateless billing
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paye_a TIMESTAMP WITH TIME ZONE
);

-- Basic indexes for query optimizations
CREATE INDEX IF NOT EXISTS idx_factures_utilisateur_id ON factures(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_factures_idempotency_key ON factures(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tarifs_service ON tarifs(service);

-- Seed basic tariff values for Senelec & Sen'Eau
INSERT INTO tarifs (service, type_tarif, prix_par_unite, palier_debut, palier_fin) VALUES
('SENELEC', 'DOMESTIQUE_SOCIAL', 91.00, 0.00, 150.00),
('SENELEC', 'DOMESTIQUE_NON_SOCIAL', 136.49, 150.00, NULL),
('SENEAU', 'SOCIAL_ASSAINIE', 202.00, 0.00, 20.00),
('SENEAU', 'SOCIAL_NON_ASSAINIE', 188.50, 0.00, 20.00),
('SENEAU', 'PLEINE_ASSAINIE', 697.97, 20.00, 40.00),
('SENEAU', 'PLEINE_NON_ASSAINIE', 636.34, 20.00, 40.00),
('SENEAU', 'DISSUASIVE_ASSAINIE', 878.35, 40.00, NULL),
('SENEAU', 'DISSUASIVE_NON_ASSAINIE', 778.87, 40.00, NULL)
ON CONFLICT DO NOTHING;
