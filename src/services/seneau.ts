import pool from '../config/database';
import { MathUtils } from './math';
import Decimal from 'decimal.js';

export interface SeneauCalculationResult {
  consommation: Decimal;
  montant_ht: Decimal;
  tva: Decimal;
  redevance: Decimal; // Can be caution de branchement if requested
  droit_de_timbre: Decimal;
  montant_ttc: Decimal;
}

export class SeneauCalculator {
  private static TAXE_TIMBRE_CASH = new Decimal(0.01);

  /**
   * Reference volume for caution based on meter calibre (for domestic usage)
   */
  static getVolumeReference(calibre: number): Decimal {
    switch (calibre) {
      case 15: return new Decimal(50);
      case 20: return new Decimal(225);
      case 25: return new Decimal(375);
      case 30: return new Decimal(600);
      case 40: return new Decimal(975);
      default: return new Decimal(50); // Default to smallest
    }
  }

  /**
   * Calculate caution de branchement (security deposit)
   */
  static async calculerCautionBranchement(
    calibre: number,
    isSubvented: boolean
  ): Promise<Decimal> {
    const volumeRef = this.getVolumeReference(calibre);
    
    // Always use "Ville avec Égouts" (Assainie) rates for caution
    const tariffSocial = new Decimal(202.00); // SOCIAL_ASSAINIE
    const tariffPleine = new Decimal(697.97); // PLEINE_ASSAINIE

    const pricePerM3 = isSubvented ? tariffSocial : tariffPleine;
    return MathUtils.safeMultiply(volumeRef, pricePerM3);
  }

  /**
   * Perform Sen'Eau billing calculation
   */
  static async calculer(
    utilisateurId: string,
    consommation: number | string | Decimal,
    modePaiement: 'CASH' | 'DIGITAL',
    options?: { includeCaution?: boolean; calibre?: number }
  ): Promise<SeneauCalculationResult> {
    const conso = MathUtils.toDecimal(consommation);
    if (conso.isNegative()) {
      throw new Error('La consommation ne peut pas être négative');
    }

    // 1. Fetch user details to get subvention status and city type
    const userRes = await pool.query(
      'SELECT is_subvented, ville_type FROM utilisateurs WHERE id = $1',
      [utilisateurId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    const { is_subvented, ville_type } = userRes.rows[0];
    const isAssainie = ville_type === 'ASSAINIE';

    // 2. Fetch Sen'Eau tariffs from database
    const tariffRes = await pool.query(
      `SELECT * FROM tarifs WHERE service = 'SENEAU' ORDER BY palier_debut ASC`
    );

    if (tariffRes.rows.length < 6) {
      throw new Error('Grille tarifaire Sen\'Eau incomplète ou manquante en base de données');
    }

    // Map database tariffs
    // The query returns ordered by palier_debut:
    // Index 0: SOCIAL_ASSAINIE (0-20)
    // Index 1: SOCIAL_NON_ASSAINIE (0-20)
    // Index 2: PLEINE_ASSAINIE (20-40)
    // Index 3: PLEINE_NON_ASSAINIE (20-40)
    // Index 4: DISSUASIVE_ASSAINIE (40+)
    // Index 5: DISSUASIVE_NON_ASSAINIE (40+)
    const tSocial = tariffRes.rows.find(t => t.type_tarif === (isAssainie ? 'SOCIAL_ASSAINIE' : 'SOCIAL_NON_ASSAINIE'));
    const tPleine = tariffRes.rows.find(t => t.type_tarif === (isAssainie ? 'PLEINE_ASSAINIE' : 'PLEINE_NON_ASSAINIE'));
    const tDissuasive = tariffRes.rows.find(t => t.type_tarif === (isAssainie ? 'DISSUASIVE_ASSAINIE' : 'DISSUASIVE_NON_ASSAINIE'));

    if (!tSocial || !tPleine || !tDissuasive) {
      throw new Error('Impossible de charger les tarifs pour la zone géographique spécifiée');
    }

    const priceSocial = new Decimal(tSocial.prix_par_unite);
    const pricePleine = new Decimal(tPleine.prix_par_unite);
    const priceDissuasive = new Decimal(tDissuasive.prix_par_unite);

    // Bimestrial brackets (monthly multiplied by 2):
    const limitSocial = new Decimal(20);
    const limitPleine = new Decimal(40);

    let montantHt = new Decimal(0);

    // 3. Compute progressive brackets
    if (conso.lte(limitSocial)) {
      montantHt = MathUtils.safeMultiply(conso, priceSocial);
    } else if (conso.lte(limitPleine)) {
      const htSocial = MathUtils.safeMultiply(limitSocial, priceSocial);
      const remainingConso = MathUtils.safeSubtract(conso, limitSocial);
      const htPleine = MathUtils.safeMultiply(remainingConso, pricePleine);
      montantHt = MathUtils.safeAdd(htSocial, htPleine);
    } else {
      const htSocial = MathUtils.safeMultiply(limitSocial, priceSocial);
      const htPleine = MathUtils.safeMultiply(MathUtils.safeSubtract(limitPleine, limitSocial), pricePleine);
      const remainingConso = MathUtils.safeSubtract(conso, limitPleine);
      const htDissuasive = MathUtils.safeMultiply(remainingConso, priceDissuasive);
      montantHt = MathUtils.safeAdd(MathUtils.safeAdd(htSocial, htPleine), htDissuasive);
    }

    // 4. TVA: 0% by default for domestic/particular contracts
    const tva = new Decimal(0);

    // 5. Caution de branchement (if requested)
    let redevance = new Decimal(0);
    if (options?.includeCaution && options?.calibre) {
      redevance = await this.calculerCautionBranchement(options.calibre, is_subvented);
    }

    // 6. Droit de timbre (1%): only if payment is CASH
    let droitDeTimbre = new Decimal(0);
    const rawTotal = MathUtils.safeAdd(MathUtils.safeAdd(montantHt, tva), redevance);
    if (modePaiement === 'CASH') {
      droitDeTimbre = MathUtils.safeMultiply(rawTotal, this.TAXE_TIMBRE_CASH);
    }

    // 7. Montant TTC
    const montantTtc = MathUtils.safeAdd(rawTotal, droitDeTimbre);

    return {
      consommation: MathUtils.roundFinancial(conso),
      montant_ht: MathUtils.roundFinancial(montantHt),
      tva: MathUtils.roundFinancial(tva),
      redevance: MathUtils.roundFinancial(redevance),
      droit_de_timbre: MathUtils.roundFinancial(droitDeTimbre),
      montant_ttc: MathUtils.roundFinancial(montantTtc),
    };
  }
}
