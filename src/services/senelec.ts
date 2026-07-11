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
}

export class SenelecWoyofalCalculator {
  private static REDEVANCE_MONOPHASE = new Decimal(429);
  private static TAUX_TVA = new Decimal(0.18);
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

    // 1. Fetch Senelec tariffs from database to be dynamic
    const tariffRes = await pool.query(
      `SELECT * FROM tarifs WHERE service = 'SENELEC' ORDER BY palier_debut ASC`
    );
    
    if (tariffRes.rows.length < 2) {
      throw new Error('Grille tarifaire Senelec incomplète ou manquante en base de données');
    }

    const t1Db = tariffRes.rows[0]; // Domestic Social (0 - 150)
    const t2Db = tariffRes.rows[1]; // Domestic Non Social (150+)

    // Apply the 10% discount on Tranche 1 (CRSE N°2025-140)
    const priceT1 = MathUtils.safeMultiply(t1Db.prix_par_unite, new Decimal(0.9));
    const priceT2 = new Decimal(t2Db.prix_par_unite);

    let montantHt = new Decimal(0);
    let htSubjectToTva = new Decimal(0);

    // 2. Calculate HT split by tranches
    if (conso.lte(this.SEUIL_TRANCHE_1)) {
      // All in Tranche 1
      montantHt = MathUtils.safeMultiply(conso, priceT1);
    } else {
      // Part in Tranche 1 (first 150 kWh) and the rest in Tranche 2
      const htT1 = MathUtils.safeMultiply(this.SEUIL_TRANCHE_1, priceT1);
      const remainingConso = MathUtils.safeSubtract(conso, this.SEUIL_TRANCHE_1);
      const htT2 = MathUtils.safeMultiply(remainingConso, priceT2);
      montantHt = MathUtils.safeAdd(htT1, htT2);
    }

    // 3. Calculate TVA: 18% only on consumption exceeding 250 kWh
    if (conso.gt(this.SEUIL_PIVOT_TVA)) {
      const excessConso = MathUtils.safeSubtract(conso, this.SEUIL_PIVOT_TVA);
      // The excess consumption is priced at Tranche 2 rate
      htSubjectToTva = MathUtils.safeMultiply(excessConso, priceT2);
    }
    const tva = MathUtils.safeMultiply(htSubjectToTva, this.TAUX_TVA);

    // 4. Redevance (Frais fixes): only on the first transaction of the month
    const isFirst = await this.estPremiereRechargeDuMois(utilisateurId);
    const redevance = isFirst ? this.REDEVANCE_MONOPHASE : new Decimal(0);

    // 5. Timbre fiscal (1%): only if payment is CASH
    let droitDeTimbre = new Decimal(0);
    const rawTotal = MathUtils.safeAdd(MathUtils.safeAdd(montantHt, tva), redevance);
    if (modePaiement === 'CASH') {
      droitDeTimbre = MathUtils.safeMultiply(rawTotal, new Decimal(0.01));
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
    };
  }
}
