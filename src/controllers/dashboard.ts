import { Request, Response } from 'express';
import pool from '../config/database';

export class DashboardController {
  /**
   * Get dashboard stats for the current user
   */
  static async getStats(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      // 1. Fetch user's budget limit
      const userRes = await pool.query(
        'SELECT budget_mensuel FROM utilisateurs WHERE id = $1',
        [userPayload.id]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      const budget_mensuel = parseFloat(userRes.rows[0].budget_mensuel || 0);

      // 2. Fetch monthly invoices stats
      const statsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN service = 'SENELEC' THEN montant_ttc ELSE 0 END), 0) as depenses_senelec,
          COALESCE(SUM(CASE WHEN service = 'SENEAU' THEN montant_ttc ELSE 0 END), 0) as depenses_seneau,
          COALESCE(SUM(CASE WHEN service = 'SENELEC' THEN consommation ELSE 0 END), 0) as consommation_senelec_kwh,
          COALESCE(SUM(CASE WHEN service = 'SENEAU' THEN consommation ELSE 0 END), 0) as consommation_seneau_m3
        FROM factures
        WHERE utilisateur_id = $1 
          AND cree_a >= date_trunc('month', CURRENT_TIMESTAMP)
      `;

      const statsRes = await pool.query(statsQuery, [userPayload.id]);
      const dbStats = statsRes.rows[0];

      const depenses_senelec = parseFloat(dbStats.depenses_senelec);
      const depenses_seneau = parseFloat(dbStats.depenses_seneau);
      const consommation_senelec_kwh = parseFloat(dbStats.consommation_senelec_kwh);
      const consommation_seneau_m3 = parseFloat(dbStats.consommation_seneau_m3);

      const total_depenses = depenses_senelec + depenses_seneau;
      const budget_alerte = budget_mensuel > 0 && total_depenses >= budget_mensuel;
      
      let alerte_message = '';
      if (budget_alerte) {
        alerte_message = `Attention ! Vous avez dépassé votre budget mensuel limite de ${budget_mensuel.toLocaleString()} FCFA !`;
      } else if (budget_mensuel > 0 && total_depenses >= budget_mensuel * 0.85) {
        alerte_message = `Attention ! Vous approchez de votre limite de budget (${Math.round((total_depenses / budget_mensuel) * 100)}% consommés).`;
      }

      let recompense_economie = '';
      if (budget_mensuel > 0) {
        if (total_depenses === 0) {
          recompense_economie = 'Commencez à enregistrer vos factures pour suivre vos dépenses !';
        } else if (total_depenses < budget_mensuel * 0.5) {
          recompense_economie = 'Excellent ! Vous êtes à moins de 50% de votre budget.';
        } else if (total_depenses < budget_mensuel) {
          recompense_economie = 'Bravo ! Vous respectez votre budget limite.';
        } else {
          recompense_economie = 'Attention ! Vous avez dépassé votre budget mensuel.';
        }
      } else {
        recompense_economie = 'Définissez un budget limite dans l\'onglet profil pour suivre vos économies.';
      }

      res.status(200).json({
        total_depenses,
        budget_mensuel,
        consommation_senelec_kwh,
        depenses_senelec,
        consommation_seneau_m3,
        depenses_seneau,
        budget_alerte: budget_mensuel > 0 && (total_depenses >= budget_mensuel * 0.85), // trigger alert banner if >85%
        alerte_message,
        recompense_economie
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      res.status(500).json({ error: 'Erreur lors du calcul des statistiques du tableau de bord.' });
    }
  }

  /**
   * Update budget limit for the current user
   */
  static async updateBudget(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const { budget_mensuel } = req.body;

    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (budget_mensuel === undefined || isNaN(Number(budget_mensuel))) {
      return res.status(400).json({ error: 'Budget mensuel invalide.' });
    }

    try {
      const result = await pool.query(
        'UPDATE utilisateurs SET budget_mensuel = $1 WHERE id = $2 RETURNING budget_mensuel',
        [Number(budget_mensuel), userPayload.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      res.status(200).json({
        message: 'Budget limite mis à jour avec succès.',
        budget_mensuel: parseFloat(result.rows[0].budget_mensuel)
      });
    } catch (err) {
      console.error('Error updating budget:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du budget.' });
    }
  }
}
