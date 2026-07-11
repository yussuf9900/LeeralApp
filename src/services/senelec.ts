import pool from '../config/database';
import { MathUtils } from './math';
import Decimal from 'decimal.js';

export interface SenelecCalculationResult {
  consommation: Decimal;
  montant_ht: Decimal;
  tva: Decimal;
  redevance: Decimal;
  droit_de_timbre: Decimal;
  montant_ttc: Decimal;
  montant_t1: Decimal;
  montant_t2: Decimal;
  montant_t3: Decimal;
  taxe_communale: Decimal;
}

export class SenelecWoyofalCalculator {
  private static REDEVANCE_MONOPHASE = new Decimal(429);
  private static TAXE_COMMUNALE_RATE = new Decimal(0.025);
  private static TAXE_TIMBRE_CASH = new Decimal(0.01);
  private static TAXE_TVA_RATE = new Decimal(0.18);
  private static SEUIL_PIVOT_TVA = new Decimal(250);
  private static SEUIL_TRANCHE_1 = new Decimal(150);

  /**
   * Check if this is the user's first recharge of the current calendar month
   */
  private static async estPremiereRechargeDuMois(utilisateurId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM factures 
      WHERE utilisateur_id = $1 
        AND service = 'SENELEC' 
        AND EXTRACT(MONTH FROM cree_a) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
        AND EXTRACT(YEAR FROM cree_a) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
    `;
    const res = await pool.query(query, [utilisateurId]);
    const count = parseInt(res.rows[0].count, 10);
    return count === 0;
  }

  /**
   * Perform Senelec Woyofal billing calculation
   */
  static async calculer(
    utilisateurId: string,
    consommation: number | string | Decimal,
    modePaiement: 'CASH' | 'DIGITAL'
  ): Promise<SenelecCalculationResult> {
    const conso = MathUtils.toDecimal(consommation);
    if (conso.isNegative()) {
      throw new Error('La consommation ne peut pas être négative');
    }

    // Fetch active parameters for Senelec
    const configRes = await pool.query(
      `SELECT DISTINCT ON (cle) cle, valeur 
       FROM configurations 
       WHERE cle IN ('senelec_seuil_tva', 'senelec_reduction_t1')
       ORDER BY cle, effective_date DESC`
    );

    let seuilTva = new Decimal(250);
    let reductionT1 = new Decimal(0.10); // 10% reduction default

    for (const row of configRes.rows) {
      if (row.cle === 'senelec_seuil_tva') {
        seuilTva = new Decimal(row.valeur);
      } else if (row.cle === 'senelec_reduction_t1') {
        reductionT1 = new Decimal(row.valeur);
      }
    }

    // 1. Fetch Senelec tariffs from database to be dynamic (versioned)
    const tariffRes = await pool.query(
      `SELECT DISTINCT ON (type_tarif) * 
       FROM tarifs 
       WHERE service = 'SENELEC' AND effective_date <= CURRENT_TIMESTAMP
       ORDER BY type_tarif, effective_date DESC`
    );
    
    if (tariffRes.rows.length < 2) {
      throw new Error('Grille tarifaire Senelec incomplète ou manquante en base de données');
    }

    const sortedTariffs = tariffRes.rows.sort((a, b) => Number(a.palier_debut) - Number(b.palier_debut));
    const t1Db = sortedTariffs[0]; // Domestic Social (0 - 150)
    const t2Db = sortedTariffs[1]; // Domestic Non Social (150+)

    // Apply the dynamic discount on Tranche 1
    const priceT1 = MathUtils.safeMultiply(t1Db.prix_par_unite, new Decimal(1).minus(reductionT1));
    const priceT2 = new Decimal(t2Db.prix_par_unite);

    let htSubjectToTva = new Decimal(0);

    // 2. Calculate HT split by tranches
    let montantT1 = new Decimal(0);
    let montantT2 = new Decimal(0);
    let montantT3 = new Decimal(0);

    if (conso.lte(150)) {
      montantT1 = MathUtils.safeMultiply(conso, priceT1);
    } else if (conso.lte(250)) {
      montantT1 = MathUtils.safeMultiply(new Decimal(150), priceT1);
      montantT2 = MathUtils.safeMultiply(MathUtils.safeSubtract(conso, new Decimal(150)), priceT2);
    } else {
      montantT1 = MathUtils.safeMultiply(new Decimal(150), priceT1);
      montantT2 = MathUtils.safeMultiply(new Decimal(100), priceT2);
      montantT3 = MathUtils.safeMultiply(MathUtils.safeSubtract(conso, new Decimal(250)), priceT2);
    }

    const montantHt = MathUtils.safeAdd(MathUtils.safeAdd(montantT1, montantT2), montantT3);

    // Municipal Tax (2.5% of HT)
    const taxeCommunale = MathUtils.safeMultiply(montantHt, this.TAXE_COMMUNALE_RATE);

    // 3. Calculate TVA: 18% only on consumption exceeding dynamic pivot threshold
    if (conso.gt(seuilTva)) {
      const excessConso = MathUtils.safeSubtract(conso, seuilTva);
      // The excess consumption is priced at Tranche 2 rate
      htSubjectToTva = MathUtils.safeMultiply(excessConso, priceT2);
    }
    const tva = MathUtils.safeMultiply(htSubjectToTva, this.TAXE_TVA_RATE);

    // 4. Redevance (Frais fixes): only on the first transaction of the month
    const isFirst = await this.estPremiereRechargeDuMois(utilisateurId);
    const redevance = isFirst ? this.REDEVANCE_MONOPHASE : new Decimal(0);

    // 5. Timbre fiscal (1%): only if payment is CASH
    let droitDeTimbre = new Decimal(0);
    const rawTotal = MathUtils.safeAdd(
      MathUtils.safeAdd(
        MathUtils.safeAdd(montantHt, tva), 
        redevance
      ), 
      taxeCommunale
    );
    if (modePaiement === 'CASH') {
      droitDeTimbre = MathUtils.safeMultiply(rawTotal, this.TAXE_TIMBRE_CASH);
    }

    // 6. Montant TTC
    const montantTtc = MathUtils.safeAdd(rawTotal, droitDeTimbre);

    return {
      consommation: MathUtils.roundFinancial(conso),
      montant_ht: MathUtils.roundFinancial(montantHt),
      tva: MathUtils.roundFinancial(tva),
      redevance: MathUtils.roundFinancial(redevance),
      droit_de_timbre: MathUtils.roundFinancial(droitDeTimbre),
      montant_ttc: MathUtils.roundFinancial(montantTtc),
      montant_t1: MathUtils.roundFinancial(montantT1),
      montant_t2: MathUtils.roundFinancial(montantT2),
      montant_t3: MathUtils.roundFinancial(montantT3),
      taxe_communale: MathUtils.roundFinancial(taxeCommunale),
    };
  }
}
