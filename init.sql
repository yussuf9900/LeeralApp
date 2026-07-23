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
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
    ancien_index NUMERIC(15,2) DEFAULT 0.00,
    nouvel_index NUMERIC(15,2) DEFAULT 0.00,
    taxe_communale NUMERIC(15,2) DEFAULT 0.00,
    type_transaction VARCHAR(50),
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paye_a TIMESTAMP WITH TIME ZONE
);

-- Table: configurations (System configurations / Parameters)
CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) NOT NULL,
    valeur NUMERIC(15,2) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: compteurs (Meters / Compteurs)
CREATE TABLE IF NOT EXISTS compteurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    numero_compteur VARCHAR(100) NOT NULL,
    service VARCHAR(50) NOT NULL, -- 'SENELEC' or 'SENEAU'
    dernier_index NUMERIC(15,2) DEFAULT 0.00,
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure compatibility for existing tables (in case they were created before these columns were added)
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS budget_mensuel NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tarifs ADD COLUMN IF NOT EXISTS effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS ancien_index NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS nouvel_index NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS taxe_communale NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS type_transaction VARCHAR(50);

-- Table: recommandations (User Recommendations & Energy Insights)
CREATE TABLE IF NOT EXISTS recommandations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL, -- 'SENELEC' or 'SENEAU'
    code_regle VARCHAR(50) NOT NULL, -- 'SENELEC_RULE_A', 'SENELEC_RULE_B', etc.
    titre VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type_conseil VARCHAR(20) NOT NULL DEFAULT 'WARNING', -- 'GOOD_PRACTICE', 'WARNING', 'INFO'
    lu BOOLEAN NOT NULL DEFAULT false,
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Basic indexes for query optimizations
CREATE INDEX IF NOT EXISTS idx_factures_utilisateur_id ON factures(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_factures_idempotency_key ON factures(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_factures_utilisateur_service_date ON factures(utilisateur_id, service, cree_a DESC);
CREATE INDEX IF NOT EXISTS idx_tarifs_service ON tarifs(service);
CREATE INDEX IF NOT EXISTS idx_tarifs_service_effective ON tarifs(service, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_configurations_cle_effective ON configurations(cle, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_compteurs_utilisateur_id ON compteurs(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_recommandations_utilisateur ON recommandations(utilisateur_id, cree_a DESC);


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

-- Seed basic configuration parameters if they don't exist
INSERT INTO configurations (cle, valeur)
SELECT 'senelec_seuil_tva', 250.00
WHERE NOT EXISTS (SELECT 1 FROM configurations WHERE cle = 'senelec_seuil_tva');

INSERT INTO configurations (cle, valeur)
SELECT 'senelec_reduction_t1', 0.10
WHERE NOT EXISTS (SELECT 1 FROM configurations WHERE cle = 'senelec_reduction_t1');
