import pool from '../config/database';

export interface Recommendation {
  id?: string;
  utilisateur_id: string;
  service: 'SENELEC' | 'SENEAU';
  code_regle: string;
  titre: string;
  message: string;
  type_conseil: 'GOOD_PRACTICE' | 'WARNING' | 'INFO';
  lu?: boolean;
  cree_a?: string;
}

export class RecommendationEngineService {
  /**
   * Save a generated recommendation to database if not recently created
   */
  private static async enregistrerConseil(rec: Recommendation): Promise<void> {
    // Avoid duplicate unread recommendations of same rule within 24h
    const checkQuery = `
      SELECT id FROM recommandations 
      WHERE utilisateur_id = $1 
        AND code_regle = $2 
        AND cree_a >= NOW() - INTERVAL '24 hours'
    `;
    const checkRes = await pool.query(checkQuery, [rec.utilisateur_id, rec.code_regle]);
    if (checkRes.rows.length > 0) {
      return; // Already pushed recently
    }

    const insertQuery = `
      INSERT INTO recommandations (utilisateur_id, service, code_regle, titre, message, type_conseil)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(insertQuery, [
      rec.utilisateur_id,
      rec.service,
      rec.code_regle,
      rec.titre,
      rec.message,
      rec.type_conseil
    ]);
  }

  /**
   * Evaluate Senelec recommendation rules after a transaction/simulation
   */
  static async analyserSenelec(
    utilisateurId: string,
    detailsCalc: {
      consommation: number;
      montant_ttc: number;
      kwh_cumules_mois_avant?: number;
      kwh_cumules_mois_apres?: number;
      basculement_tranche2?: boolean;
      type_transaction?: string;
    }
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const kwhAvant = detailsCalc.kwh_cumules_mois_avant || 0;
    const kwhApres = detailsCalc.kwh_cumules_mois_apres || detailsCalc.consommation;
    const bascule = detailsCalc.basculement_tranche2 || (kwhAvant < 150 && kwhApres > 150);

    // --- Règle A : Basculement de tranche ---
    if (bascule) {
      const rec: Recommendation = {
        utilisateur_id: utilisateurId,
        service: 'SENELEC',
        code_regle: 'SENELEC_RULE_A',
        titre: 'Basculement en 2ème tranche tarifaire',
        message: 'Attention, avec cette recharge, vous allez basculer dans la 2ème tranche tarifaire (plus chère). Essayez de réduire votre consommation d\'ici la fin du mois.',
        type_conseil: 'WARNING'
      };
      recommendations.push(rec);
      await this.enregistrerConseil(rec);
    }

    // --- Règle B : Optimisation de fin de mois Woyofal ---
    const now = new Date();
    const currentDay = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isEndOfMonth = (lastDayOfMonth - currentDay) <= 3;

    if (isEndOfMonth && kwhApres > 150) {
      const rec: Recommendation = {
        utilisateur_id: utilisateurId,
        service: 'SENELEC',
        code_regle: 'SENELEC_RULE_B',
        titre: 'Astuce d\'optimisation Woyofal fin de mois',
        message: 'Astuce : Vous êtes à quelques jours de la fin du mois dans la tranche la plus chère. Ne rechargez que le strict minimum (ex: 2 000 FCFA) pour tenir jusqu\'au 1er et retrouver le tarif réduit !',
        type_conseil: 'INFO'
      };
      recommendations.push(rec);
      await this.enregistrerConseil(rec);
    }

    // --- Règle C : Fréquence vs Frais fixes ---
    const freqQuery = `
      SELECT cree_a FROM factures 
      WHERE utilisateur_id = $1 
        AND service = 'SENELEC' 
        AND type_transaction = 'RECHARGE_WOYOFAL'
        AND cree_a >= date_trunc('month', CURRENT_TIMESTAMP)
      ORDER BY cree_a ASC
    `;
    const freqRes = await pool.query(freqQuery, [utilisateurId]);
    if (freqRes.rows.length >= 3) {
      // Calculate average interval between purchases
      const dates = freqRes.rows.map(r => new Date(r.cree_a).getTime());
      let totalIntervalDays = 0;
      for (let i = 1; i < dates.length; i++) {
        totalIntervalDays += (dates[i] - dates[i - 1]) / (1000 * 3600 * 24);
      }
      const avgInterval = totalIntervalDays / (dates.length - 1);
      if (avgInterval <= 4) {
        const rec: Recommendation = {
          utilisateur_id: utilisateurId,
          service: 'SENELEC',
          code_regle: 'SENELEC_RULE_C',
          titre: 'Fréquence de recharge élevée',
          message: 'Vous rechargez très souvent. La Senelec prélève la prime fixe lors de la 1ère recharge du mois. Grouper vos achats en début de mois facilite le suivi.',
          type_conseil: 'INFO'
        };
        recommendations.push(rec);
        await this.enregistrerConseil(rec);
      }
    }

    return recommendations;
  }

  /**
   * Evaluate Sen'Eau recommendation rules after a bill transaction
   */
  static async analyserSeneau(
    utilisateurId: string,
    detailsCalc: {
      consommation: number;
      montant_ttc: number;
    }
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const volumeConso = detailsCalc.consommation;

    // --- Règle Eau A : Fuite probable (+50% par rapport à la moyenne) ---
    const historyQuery = `
      SELECT consommation FROM factures 
      WHERE utilisateur_id = $1 AND service = 'SENEAU' 
      ORDER BY cree_a DESC 
      LIMIT 6
    `;
    const historyRes = await pool.query(historyQuery, [utilisateurId]);
    if (historyRes.rows.length >= 2) {
      // Exclude current transaction from average
      const pastConsos = historyRes.rows.slice(1).map(r => Number(r.consommation));
      const avgConso = pastConsos.reduce((a, b) => a + b, 0) / pastConsos.length;
      
      if (avgConso > 0 && volumeConso >= avgConso * 1.5) {
        const pctIncrease = Math.round(((volumeConso - avgConso) / avgConso) * 100);
        const rec: Recommendation = {
          utilisateur_id: utilisateurId,
          service: 'SENEAU',
          code_regle: 'SENEAU_RULE_A',
          titre: 'Alerte Sama Facture : Surconsommation / Fuite d\'eau',
          message: `Alerte Sama Facture : Votre consommation d'eau a fortement augmenté (+${pctIncrease}% par rapport à votre moyenne). Vérifiez vos installations (chasses d'eau, robinets) pour vous assurer qu'il n'y a pas de fuite cachée !`,
          type_conseil: 'WARNING'
        };
        recommendations.push(rec);
        await this.enregistrerConseil(rec);
      }
    }

    // --- Règle Eau B : Tranche dissuasive (> 40 m³) ---
    if (volumeConso > 40) {
      const rec: Recommendation = {
        utilisateur_id: utilisateurId,
        service: 'SENEAU',
        code_regle: 'SENEAU_RULE_B',
        titre: 'Tranche Dissuasive atteinte',
        message: 'Attention, votre consommation actuelle vous fait basculer dans la tranche tarifaire la plus chère (Dissuasive). Pensez à limiter les arrosages ou lavages à grande eau.',
        type_conseil: 'WARNING'
      };
      recommendations.push(rec);
      await this.enregistrerConseil(rec);
    }

    // --- Règle Eau C : Félicitations Tranche Sociale (2 factures consécutives <= 20 m³) ---
    if (historyRes.rows.length >= 2) {
      const lastTwo = historyRes.rows.slice(0, 2).map(r => Number(r.consommation));
      if (lastTwo.every(c => c <= 20)) {
        const rec: Recommendation = {
          utilisateur_id: utilisateurId,
          service: 'SENEAU',
          code_regle: 'SENEAU_RULE_C',
          titre: 'Félicitations pour votre maîtrise d\'eau',
          message: 'Bravo ! Vous maîtrisez votre consommation d\'eau et bénéficiez exclusivement du tarif social, ce qui optimise votre budget.',
          type_conseil: 'GOOD_PRACTICE'
        };
        recommendations.push(rec);
        await this.enregistrerConseil(rec);
      }
    }

    return recommendations;
  }

  /**
   * Get active recommendations for a user
   */
  static async ObtenirConseilsUtilisateur(utilisateurId: string): Promise<Recommendation[]> {
    const query = `
      SELECT * FROM recommandations 
      WHERE utilisateur_id = $1 
      ORDER BY cree_a DESC 
      LIMIT 10
    `;
    const res = await pool.query(query, [utilisateurId]);
    return res.rows;
  }
}
