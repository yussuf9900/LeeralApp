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
  // Woyofal specific stateful metadata
  kwh_t1?: Decimal;
  kwh_t2?: Decimal;
  kwh_cumules_mois_avant?: Decimal;
  kwh_cumules_mois_apres?: Decimal;
  basculement_tranche2?: boolean;
  duree_estimee_jours?: number;
  is_first_recharge?: boolean;
}

export class SenelecWoyofalCalculator {
  private static REDEVANCE_MONOPHASE = new Decimal(429);
  private static TAXE_COMMUNALE_RATE = new Decimal(0.025);
  private static TAXE_TIMBRE_CASH = new Decimal(0.01);
  private static SEUIL_TRANCHE_1 = new Decimal(150);

  /**
   * Get total cumulative kWh purchased in target calendar month for Senelec Woyofal
   */
  static async getMontantCumuleMois(utilisateurId: string, dateAchat?: Date | string): Promise<Decimal> {
    const targetDate = dateAchat ? new Date(dateAchat) : new Date();
    const query = `
      SELECT COALESCE(SUM(consommation), 0) as total_kwh
      FROM factures 
      WHERE utilisateur_id = $1 
        AND service = 'SENELEC' 
        AND type_transaction = 'RECHARGE_WOYOFAL'
        AND EXTRACT(MONTH FROM cree_a) = EXTRACT(MONTH FROM $2::timestamp)
        AND EXTRACT(YEAR FROM cree_a) = EXTRACT(YEAR FROM $2::timestamp)
    `;
    const res = await pool.query(query, [utilisateurId, targetDate]);
    return new Decimal(res.rows[0].total_kwh || 0);
  }

  /**
   * Check if this is the user's first recharge of the target calendar month
   */
  static async estPremiereRechargeDuMois(utilisateurId: string, dateAchat?: Date | string): Promise<boolean> {
    const targetDate = dateAchat ? new Date(dateAchat) : new Date();
    const query = `
      SELECT COUNT(*) as count 
      FROM factures 
      WHERE utilisateur_id = $1 
        AND service = 'SENELEC' 
        AND type_transaction = 'RECHARGE_WOYOFAL'
        AND EXTRACT(MONTH FROM cree_a) = EXTRACT(MONTH FROM $2::timestamp)
        AND EXTRACT(YEAR FROM cree_a) = EXTRACT(YEAR FROM $2::timestamp)
    `;
    const res = await pool.query(query, [utilisateurId, targetDate]);
    const count = parseInt(res.rows[0].count, 10);
    return count === 0;
  }

  /**
   * Senelec Woyofal REVERSE calculation (Montant FCFA ➔ kWh obtenidos)
   * Note: CRSE regulation limits Woyofal to 2 tranches with NO TVA.
   */
  static async calculerParMontant(
    utilisateurId: string,
    montantPaye: number | string | Decimal,
    modePaiement: 'CASH' | 'DIGITAL',
    consoJournaliere: number = 5,
    dateAchat?: Date | string
  ): Promise<SenelecCalculationResult> {
    const montantTtcTarget = MathUtils.toDecimal(montantPaye);
    if (montantTtcTarget.lte(0)) {
      throw new Error('Le montant de la recharge doit être supérieur à 0 FCFA');
    }

    // 1. Fetch dynamic tariff parameters
    const configRes = await pool.query(
      `SELECT DISTINCT ON (cle) cle, valeur 
       FROM configurations 
       WHERE cle IN ('senelec_reduction_t1')
       ORDER BY cle, effective_date DESC`
    );
    let reductionT1 = new Decimal(0.10); // 10% discount default for 2026
    for (const row of configRes.rows) {
      if (row.cle === 'senelec_reduction_t1') {
        reductionT1 = new Decimal(row.valeur);
      }
    }

    const tariffRes = await pool.query(
      `SELECT DISTINCT ON (type_tarif) * 
       FROM tarifs 
       WHERE service = 'SENELEC' AND effective_date <= CURRENT_TIMESTAMP
       ORDER BY type_tarif, effective_date DESC`
    );
    
    if (tariffRes.rows.length < 2) {
      throw new Error('Grille tarifaire Senelec incomplète en base de données');
    }

    const sortedTariffs = tariffRes.rows.sort((a, b) => Number(a.palier_debut) - Number(b.palier_debut));
    const priceT1 = MathUtils.safeMultiply(sortedTariffs[0].prix_par_unite, new Decimal(1).minus(reductionT1)); // 82.00 FCFA
    const priceT2 = new Decimal(sortedTariffs[1].prix_par_unite); // 136.49 FCFA

    // 2. Fetch user's cumulative monthly consumption & check if 1st recharge for target month
    const kwhCumulesAvant = await this.getMontantCumuleMois(utilisateurId, dateAchat);
    const isFirst = await this.estPremiereRechargeDuMois(utilisateurId, dateAchat);

    // 3. Stamp duty handling
    let rawTotal: Decimal;
    let droitDeTimbre: Decimal;
    if (modePaiement === 'CASH') {
      // M_paid = rawTotal * 1.01
      rawTotal = montantTtcTarget.dividedBy(1.01);
      droitDeTimbre = MathUtils.safeSubtract(montantTtcTarget, rawTotal);
    } else {
      rawTotal = montantTtcTarget;
      droitDeTimbre = new Decimal(0);
    }

    // 4. Redevance (Frais fixes: 429 FCFA monophasé) deducted only on 1st buy of month
    const redevance = isFirst ? this.REDEVANCE_MONOPHASE : new Decimal(0);
    
    if (rawTotal.lte(redevance)) {
      throw new Error(`Le montant payé doit être supérieur aux frais fixes de ${redevance.toString()} FCFA`);
    }

    const moneyAfterRedevance = MathUtils.safeSubtract(rawTotal, redevance);

    // 5. Municipal Tax is 2.5% of Montant HT. (Montant Energy = HT * 1.025)
    // Therefore: Montant HT = moneyAfterRedevance / 1.025
    const montantHt = moneyAfterRedevance.dividedBy(new Decimal(1).plus(this.TAXE_COMMUNALE_RATE));
    const taxeCommunale = MathUtils.safeSubtract(moneyAfterRedevance, montantHt);

    // 6. Stateful allocation across Tranche 1 and Tranche 2 (NO 3rd tranche, NO TVA for Woyofal)
    const t1QuotaRemaining = Decimal.max(0, this.SEUIL_TRANCHE_1.minus(kwhCumulesAvant));
    const maxMontantT1Remaining = MathUtils.safeMultiply(t1QuotaRemaining, priceT1);

    let kwhT1 = new Decimal(0);
    let kwhT2 = new Decimal(0);
    let montantT1 = new Decimal(0);
    let montantT2 = new Decimal(0);

    if (montantHt.lte(maxMontantT1Remaining)) {
      // 100% of this top-up stays in Tranche 1
      montantT1 = montantHt;
      kwhT1 = montantT1.dividedBy(priceT1);
    } else {
      // Fills remaining Tranche 1 quota, rest goes into Tranche 2
      montantT1 = maxMontantT1Remaining;
      kwhT1 = t1QuotaRemaining;
      
      montantT2 = MathUtils.safeSubtract(montantHt, montantT1);
      kwhT2 = montantT2.dividedBy(priceT2);
    }

    const totalConsoKwh = MathUtils.safeAdd(kwhT1, kwhT2);
    const kwhCumulesApres = MathUtils.safeAdd(kwhCumulesAvant, totalConsoKwh);
    const basculementTranche2 = kwhCumulesAvant.lt(150) && kwhCumulesApres.gt(150);

    // Estimated duration in days
    const rate = consoJournaliere > 0 ? consoJournaliere : 5;
    const dureeEstimeeJours = Math.round(Number(totalConsoKwh) / rate);

    return {
      consommation: MathUtils.roundFinancial(totalConsoKwh),
      montant_ht: MathUtils.roundFinancial(montantHt),
      tva: new Decimal(0), // Woyofal has no TVA
      redevance: MathUtils.roundFinancial(redevance),
      droit_de_timbre: MathUtils.roundFinancial(droitDeTimbre),
      montant_ttc: MathUtils.roundFinancial(montantTtcTarget),
      montant_t1: MathUtils.roundFinancial(montantT1),
      montant_t2: MathUtils.roundFinancial(montantT2),
      montant_t3: new Decimal(0),
      taxe_communale: MathUtils.roundFinancial(taxeCommunale),
      kwh_t1: MathUtils.roundFinancial(kwhT1),
      kwh_t2: MathUtils.roundFinancial(kwhT2),
      kwh_cumules_mois_avant: MathUtils.roundFinancial(kwhCumulesAvant),
      kwh_cumules_mois_apres: MathUtils.roundFinancial(kwhCumulesApres),
      basculement_tranche2: basculementTranche2,
      duree_estimee_jours: dureeEstimeeJours,
      is_first_recharge: isFirst
    };
  }

  /**
   * Forward Senelec Woyofal calculation (kWh ➔ FCFA) considering cumulative position
   */
  static async calculer(
    utilisateurId: string,
    consommation: number | string | Decimal,
    modePaiement: 'CASH' | 'DIGITAL',
    dateAchat?: Date | string
  ): Promise<SenelecCalculationResult> {
    const conso = MathUtils.toDecimal(consommation);
    if (conso.isNegative()) {
      throw new Error('La consommation ne peut pas être négative');
    }

    const configRes = await pool.query(
      `SELECT DISTINCT ON (cle) cle, valeur 
       FROM configurations 
       WHERE cle IN ('senelec_reduction_t1')
       ORDER BY cle, effective_date DESC`
    );
    let reductionT1 = new Decimal(0.10);
    for (const row of configRes.rows) {
      if (row.cle === 'senelec_reduction_t1') {
        reductionT1 = new Decimal(row.valeur);
      }
    }

    const tariffRes = await pool.query(
      `SELECT DISTINCT ON (type_tarif) * 
       FROM tarifs 
       WHERE service = 'SENELEC' AND effective_date <= CURRENT_TIMESTAMP
       ORDER BY type_tarif, effective_date DESC`
    );
    
    if (tariffRes.rows.length < 2) {
      throw new Error('Grille tarifaire Senelec incomplète en base de données');
    }

    const sortedTariffs = tariffRes.rows.sort((a, b) => Number(a.palier_debut) - Number(b.palier_debut));
    const priceT1 = MathUtils.safeMultiply(sortedTariffs[0].prix_par_unite, new Decimal(1).minus(reductionT1)); // 82.00
    const priceT2 = new Decimal(sortedTariffs[1].prix_par_unite); // 136.49

    const kwhCumulesAvant = await this.getMontantCumuleMois(utilisateurId, dateAchat);
    const isFirst = await this.estPremiereRechargeDuMois(utilisateurId, dateAchat);

    const t1QuotaRemaining = Decimal.max(0, this.SEUIL_TRANCHE_1.minus(kwhCumulesAvant));

    let kwhT1 = new Decimal(0);
    let kwhT2 = new Decimal(0);

    if (conso.lte(t1QuotaRemaining)) {
      kwhT1 = conso;
    } else {
      kwhT1 = t1QuotaRemaining;
      kwhT2 = MathUtils.safeSubtract(conso, t1QuotaRemaining);
    }

    const montantT1 = MathUtils.safeMultiply(kwhT1, priceT1);
    const montantT2 = MathUtils.safeMultiply(kwhT2, priceT2);
    const montantHt = MathUtils.safeAdd(montantT1, montantT2);

    const taxeCommunale = MathUtils.safeMultiply(montantHt, this.TAXE_COMMUNALE_RATE);
    const redevance = isFirst ? this.REDEVANCE_MONOPHASE : new Decimal(0);

    const rawTotal = MathUtils.safeAdd(MathUtils.safeAdd(montantHt, taxeCommunale), redevance);

    let droitDeTimbre = new Decimal(0);
    if (modePaiement === 'CASH') {
      droitDeTimbre = MathUtils.safeMultiply(rawTotal, this.TAXE_TIMBRE_CASH);
    }

    const montantTtc = MathUtils.safeAdd(rawTotal, droitDeTimbre);
    const kwhCumulesApres = MathUtils.safeAdd(kwhCumulesAvant, conso);

    return {
      consommation: MathUtils.roundFinancial(conso),
      montant_ht: MathUtils.roundFinancial(montantHt),
      tva: new Decimal(0),
      redevance: MathUtils.roundFinancial(redevance),
      droit_de_timbre: MathUtils.roundFinancial(droitDeTimbre),
      montant_ttc: MathUtils.roundFinancial(montantTtc),
      montant_t1: MathUtils.roundFinancial(montantT1),
      montant_t2: MathUtils.roundFinancial(montantT2),
      montant_t3: new Decimal(0),
      taxe_communale: MathUtils.roundFinancial(taxeCommunale),
      kwh_t1: MathUtils.roundFinancial(kwhT1),
      kwh_t2: MathUtils.roundFinancial(kwhT2),
      kwh_cumules_mois_avant: MathUtils.roundFinancial(kwhCumulesAvant),
      kwh_cumules_mois_apres: MathUtils.roundFinancial(kwhCumulesApres),
      basculement_tranche2: kwhCumulesAvant.lt(150) && kwhCumulesApres.gt(150),
      is_first_recharge: isFirst
    };
  }
}

export class SenelecPostpaidCalculator {
  private static REDEVANCE_MONOPHASE = new Decimal(429);
  private static TAXE_COMMUNALE_RATE = new Decimal(0.025);
  private static TAXE_TIMBRE_CASH = new Decimal(0.01);
  private static TAXE_TVA_RATE = new Decimal(0.18);

  /**
   * Senelec Post-paid forward calculation (Index Nouveau - Index Ancien = kWh ➔ Montant FCFA)
   * Uses 3 tranches + TVA 18% on consumption exceeding 250 kWh.
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

    const configRes = await pool.query(
      `SELECT DISTINCT ON (cle) cle, valeur 
       FROM configurations 
       WHERE cle IN ('senelec_seuil_tva', 'senelec_reduction_t1')
       ORDER BY cle, effective_date DESC`
    );

    let seuilTva = new Decimal(250);
    let reductionT1 = new Decimal(0.10);

    for (const row of configRes.rows) {
      if (row.cle === 'senelec_seuil_tva') {
        seuilTva = new Decimal(row.valeur);
      } else if (row.cle === 'senelec_reduction_t1') {
        reductionT1 = new Decimal(row.valeur);
      }
    }

    const tariffRes = await pool.query(
      `SELECT DISTINCT ON (type_tarif) * 
       FROM tarifs 
       WHERE service = 'SENELEC' AND effective_date <= CURRENT_TIMESTAMP
       ORDER BY type_tarif, effective_date DESC`
    );
    
    if (tariffRes.rows.length < 2) {
      throw new Error('Grille tarifaire Senelec incomplète en base de données');
    }

    const sortedTariffs = tariffRes.rows.sort((a, b) => Number(a.palier_debut) - Number(b.palier_debut));
    const priceT1 = MathUtils.safeMultiply(sortedTariffs[0].prix_par_unite, new Decimal(1).minus(reductionT1)); // 82.00 FCFA
    const priceT2 = new Decimal(sortedTariffs[1].prix_par_unite); // 136.49 FCFA

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
    const taxeCommunale = MathUtils.safeMultiply(montantHt, this.TAXE_COMMUNALE_RATE);

    // TVA 18% only applies to consumption above 250 kWh
    let htSubjectToTva = new Decimal(0);
    if (conso.gt(seuilTva)) {
      const excessConso = MathUtils.safeSubtract(conso, seuilTva);
      htSubjectToTva = MathUtils.safeMultiply(excessConso, priceT2);
    }
    const tva = MathUtils.safeMultiply(htSubjectToTva, this.TAXE_TVA_RATE);
    const redevance = this.REDEVANCE_MONOPHASE;

    const rawTotal = MathUtils.safeAdd(MathUtils.safeAdd(MathUtils.safeAdd(montantHt, tva), redevance), taxeCommunale);

    let droitDeTimbre = new Decimal(0);
    if (modePaiement === 'CASH') {
      droitDeTimbre = MathUtils.safeMultiply(rawTotal, this.TAXE_TIMBRE_CASH);
    }

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
