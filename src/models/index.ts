import Decimal from 'decimal.js';

// Table: utilisateurs (Users)
export interface Utilisateur {
  id: string; // UUID
  nom: string;
  email: string;
  mot_de_passe: string; // password_hash
  cree_a?: Date;
  mis_a_jour_a?: Date;
}

// Alias Client for Utilisateur to align with both nomenclatures
export type Client = Utilisateur;

// Table: tarifs (Tariffs for Senelec & Sen'Eau)
export interface Tarif {
  id?: number;
  service: 'SENELEC' | 'SENEAU';
  type_tarif: string; // e.g., 'DOMESTIQUE_SOCIAL', 'DOMESTIQUE_NON_SOCIAL', 'COMMERCIAL', 'PROFESSIONNEL'
  prix_par_unite: number | string | Decimal; // Financial field
  palier_debut?: number | string | Decimal; // Consumption field
  palier_fin?: number | string | Decimal | null; // Consumption field
  cree_a?: Date;
}

// Table: factures (Bills / Invoices)
export interface Facture {
  id: string; // UUID
  utilisateur_id: string; // UUID
  service: 'SENELEC' | 'SENEAU';
  reference_facture: string;
  consommation: number | string | Decimal; // Consumption field
  montant_ht: number | string | Decimal; // Financial field
  tva: number | string | Decimal; // Financial field
  montant_ttc: number | string | Decimal; // Financial field
  statut: 'PAYE' | 'NON_PAYE' | 'ANNULE';
  date_echeance: Date | string;
  idempotency_key: string; // Strict uniqueness constraint for stateless billing
  cree_a?: Date;
  paye_a?: Date | null;
}
