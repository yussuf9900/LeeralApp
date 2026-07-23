import { Request, Response } from 'express';
import pool from '../config/database';
import { IdempotencyManager } from '../services/idempotency';
import { SenelecWoyofalCalculator, SenelecPostpaidCalculator } from '../services/senelec';
import { SeneauCalculator } from '../services/seneau';
import { RecommendationEngineService } from '../services/recommendationEngine';

export class FacturationController {
  /**
   * Helper to resolve target user id based on requester's role
   */
  private static resolveClientId(req: Request, bodyClientId?: string): string {
    const requester = (req as any).user;
    if (requester.role === 'ADMIN' && bodyClientId) {
      return bodyClientId;
    }
    return requester.id;
  }

  /**
   * Helper to extract idempotency key
   */
  private static getIdempotencyKey(req: Request): string {
    const key = req.headers['idempotency-key'] || req.body.idempotency_key;
    return key ? String(key).trim() : '';
  }

  /**
   * Handle Senelec calculation (Woyofal Prépaiement by Montant / kWh OR Senelec Postpayé by Index)
   */
  static async handleSenelecCalculation(req: Request, res: Response): Promise<any> {
    const { 
      consommation, 
      montant, 
      mode_paiement, 
      client_id, 
      save_to_history, 
      ancien_index, 
      nouvel_index, 
      type_transaction,
      mode_facturation, // 'WOYOFAL' or 'POSTPAID'
      type_calcul, // 'PAR_MONTANT' or 'PAR_KWH'
      conso_journaliere
    } = req.body;
    
    const saveToHistory = save_to_history !== false;
    const isWoyofal = mode_facturation === 'WOYOFAL' || type_transaction === 'RECHARGE_WOYOFAL' || montant !== undefined || (!ancien_index && !nouvel_index && mode_facturation !== 'POSTPAID');
    const isReverseMontant = (type_calcul === 'PAR_MONTANT' || (montant !== undefined && !consommation)) && isWoyofal;

    if (!mode_paiement) {
      return res.status(400).json({ error: 'Le champ mode_paiement (CASH ou DIGITAL) est requis.' });
    }

    if (mode_paiement !== 'CASH' && mode_paiement !== 'DIGITAL') {
      return res.status(400).json({ error: 'mode_paiement doit être CASH ou DIGITAL.' });
    }

    if (isReverseMontant && (!montant || Number(montant) <= 0)) {
      return res.status(400).json({ error: 'Le montant de la recharge Woyofal en FCFA est requis.' });
    }

    // Resolve consumption if index are sent
    let conso = consommation;
    if (conso === undefined && ancien_index !== undefined && nouvel_index !== undefined) {
      conso = Number(nouvel_index) - Number(ancien_index);
    }

    if (!isReverseMontant && conso === undefined) {
      return res.status(400).json({ error: 'Champs consommation (ou index nouveau/ancien) requis.' });
    }

    try {
      const targetClientId = FacturationController.resolveClientId(req, client_id);
      
      const clientCheck = await pool.query('SELECT id FROM utilisateurs WHERE id = $1', [targetClientId]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client introuvable.' });
      }

      let calc: any;
      if (isWoyofal) {
        if (isReverseMontant) {
          calc = await SenelecWoyofalCalculator.calculerParMontant(
            targetClientId,
            montant,
            mode_paiement,
            conso_journaliere ? Number(conso_journaliere) : 5
          );
        } else {
          calc = await SenelecWoyofalCalculator.calculer(targetClientId, conso, mode_paiement);
        }
      } else {
        // Postpaid 3-tranche calculation with TVA
        calc = await SenelecPostpaidCalculator.calculer(targetClientId, conso, mode_paiement);
      }

      const details = {
        consommation: Number(calc.consommation),
        montant_ht: Number(calc.montant_ht),
        tva: Number(calc.tva),
        redevance: Number(calc.redevance),
        droit_de_timbre: Number(calc.droit_de_timbre),
        montant_ttc: Number(calc.montant_ttc),
        montant_t1: Number(calc.montant_t1),
        montant_t2: Number(calc.montant_t2),
        montant_t3: Number(calc.montant_t3),
        taxe_communale: Number(calc.taxe_communale),
        kwh_t1: calc.kwh_t1 ? Number(calc.kwh_t1) : undefined,
        kwh_t2: calc.kwh_t2 ? Number(calc.kwh_t2) : undefined,
        kwh_cumules_mois_avant: calc.kwh_cumules_mois_avant ? Number(calc.kwh_cumules_mois_avant) : undefined,
        kwh_cumules_mois_apres: calc.kwh_cumules_mois_apres ? Number(calc.kwh_cumules_mois_apres) : undefined,
        basculement_tranche2: calc.basculement_tranche2,
        duree_estimee_jours: calc.duree_estimee_jours,
        is_first_recharge: calc.is_first_recharge
      };

      // Run recommendation engine analysis
      const recommandations = await RecommendationEngineService.analyserSenelec(targetClientId, details);

      if (!saveToHistory) {
        return res.status(200).json({
          details,
          recommandations
        });
      }

      let idempotencyKey = FacturationController.getIdempotencyKey(req);
      if (!idempotencyKey) {
        idempotencyKey = `IDEM-FALLBACK-${targetClientId}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const existingFacture = await IdempotencyManager.verifierCle(idempotencyKey);
      if (existingFacture) {
        return res.status(200).json({
          message: 'Requête dupliquée interceptée : renvoi de la transaction précédente.',
          facture: existingFacture,
          idempotent: true
        });
      }

      const refPrefix = isWoyofal ? 'SEN-WOY' : 'SEN-POST';
      const ref = `${refPrefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const echeance = new Date();
      echeance.setDate(echeance.getDate() + (isWoyofal ? 0 : 15));

      const txType = type_transaction || (isWoyofal ? 'RECHARGE_WOYOFAL' : 'FACTURE_SENELEC');
      const statusValue = isWoyofal ? 'PAYE' : 'NON_PAYE';
      const paidDateValue = isWoyofal ? new Date() : null;

      const insertQuery = `
        INSERT INTO factures (
          utilisateur_id, service, reference_facture, consommation, 
          montant_ht, tva, redevance, droit_de_timbre, 
          montant_ttc, mode_paiement, statut, date_echeance, 
          idempotency_key, paye_a, ancien_index, nouvel_index, taxe_communale,
          type_transaction
        )
        VALUES ($1, 'SENELEC', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        targetClientId,
        ref,
        calc.consommation.toString(),
        calc.montant_ht.toString(),
        calc.tva.toString(),
        calc.redevance.toString(),
        calc.droit_de_timbre.toString(),
        calc.montant_ttc.toString(),
        mode_paiement,
        statusValue,
        echeance,
        idempotencyKey,
        paidDateValue,
        ancien_index !== undefined ? Number(ancien_index) : 0,
        nouvel_index !== undefined ? Number(nouvel_index) : 0,
        calc.taxe_communale.toString(),
        txType
      ]);

      res.status(201).json({
        message: isWoyofal ? 'Recharge Woyofal effectuée et enregistrée avec succès.' : 'Facture Senelec générée avec succès.',
        facture: result.rows[0],
        details,
        recommandations,
        idempotent: false
      });

    } catch (err: any) {
      console.error('Error in Senelec handler:', err);
      res.status(500).json({ error: err.message || 'Erreur lors du calcul Senelec.' });
    }
  }

  /**
   * Handle Seneau Water bill creation
   */
  static async handleSeneauCalculation(req: Request, res: Response): Promise<any> {
    const { consommation, mode_paiement, client_id, include_caution, calibre, save_to_history, ancien_index, nouvel_index, type_transaction } = req.body;
    const saveToHistory = save_to_history !== false;

    let conso = consommation;
    if (conso === undefined && ancien_index !== undefined && nouvel_index !== undefined) {
      conso = Number(nouvel_index) - Number(ancien_index);
    }

    if (conso === undefined || !mode_paiement) {
      return res.status(400).json({ error: 'Champs consommation (ou index) et mode_paiement requis.' });
    }

    if (mode_paiement !== 'CASH' && mode_paiement !== 'DIGITAL') {
      return res.status(400).json({ error: 'mode_paiement doit être CASH ou DIGITAL.' });
    }

    if (include_caution && !calibre) {
      return res.status(400).json({ error: 'Le calibre du compteur est requis pour calculer la caution.' });
    }

    try {
      const targetClientId = FacturationController.resolveClientId(req, client_id);
      
      const clientCheck = await pool.query('SELECT id FROM utilisateurs WHERE id = $1', [targetClientId]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client introuvable.' });
      }

      const calc = await SeneauCalculator.calculer(targetClientId, conso, mode_paiement, {
        includeCaution: include_caution === true,
        calibre: calibre ? parseInt(calibre, 10) : undefined
      });

      const details = {
        consommation: Number(calc.consommation),
        montant_ht: Number(calc.montant_ht),
        tva: Number(calc.tva),
        redevance: Number(calc.redevance),
        droit_de_timbre: Number(calc.droit_de_timbre),
        montant_ttc: Number(calc.montant_ttc),
        montant_social: Number(calc.montant_social),
        montant_pleine: Number(calc.montant_pleine),
        montant_dissuasive: Number(calc.montant_dissuasive),
      };

      // Run recommendation engine analysis
      const recommandations = await RecommendationEngineService.analyserSeneau(targetClientId, details);

      if (!saveToHistory) {
        return res.status(200).json({
          details,
          recommandations
        });
      }

      let idempotencyKey = FacturationController.getIdempotencyKey(req);
      if (!idempotencyKey) {
        idempotencyKey = `IDEM-FALLBACK-${targetClientId}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const existingFacture = await IdempotencyManager.verifierCle(idempotencyKey);
      if (existingFacture) {
        return res.status(200).json({
          message: 'Requête dupliquée interceptée : renvoi de la facture précédente.',
          facture: existingFacture,
          idempotent: true
        });
      }

      const ref = `SEN-EAU-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const echeance = new Date();
      echeance.setDate(echeance.getDate() + 30);

      const insertQuery = `
        INSERT INTO factures (
          utilisateur_id, service, reference_facture, consommation, 
          montant_ht, tva, redevance, droit_de_timbre, 
          montant_ttc, mode_paiement, statut, date_echeance, 
          idempotency_key, ancien_index, nouvel_index, type_transaction
        )
        VALUES ($1, 'SENEAU', $2, $3, $4, $5, $6, $7, $8, $9, 'NON_PAYE', $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        targetClientId,
        ref,
        calc.consommation.toString(),
        calc.montant_ht.toString(),
        calc.tva.toString(),
        calc.redevance.toString(),
        calc.droit_de_timbre.toString(),
        calc.montant_ttc.toString(),
        mode_paiement,
        echeance,
        idempotencyKey,
        ancien_index !== undefined ? Number(ancien_index) : 0,
        nouvel_index !== undefined ? Number(nouvel_index) : 0,
        type_transaction || 'FACTURE_EAU'
      ]);

      res.status(201).json({
        message: 'Facture d\'eau Sen\'Eau générée avec succès.',
        facture: result.rows[0],
        details,
        recommandations,
        idempotent: false
      });

    } catch (err: any) {
      console.error('Error in Seneau handler:', err);
      res.status(500).json({ error: err.message || 'Erreur lors du calcul Sen\'Eau.' });
    }
  }

  /**
   * Get user recommendations / conseils
   */
  static async getRecommendations(req: Request, res: Response): Promise<any> {
    const user = (req as any).user;
    try {
      const recs = await RecommendationEngineService.ObtenirConseilsUtilisateur(user.id);
      res.status(200).json(recs);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des conseils.' });
    }
  }

  /**
   * Get invoice history of a client
   */
  static async getHistory(req: Request, res: Response): Promise<any> {
    const user = (req as any).user;
    
    try {
      let query = '';
      let params: any[] = [];
      
      if (user.role === 'ADMIN') {
        query = `
          SELECT f.*, u.nom as client_name, u.email as client_email 
          FROM factures f
          JOIN utilisateurs u ON f.utilisateur_id = u.id
          ORDER BY f.cree_a DESC
        `;
      } else {
        query = `
          SELECT * 
          FROM factures 
          WHERE utilisateur_id = $1 
          ORDER BY cree_a DESC
        `;
        params = [user.id];
      }

      const result = await pool.query(query, params);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching billing history:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique.' });
    }
  }

  /**
   * Mark a water bill as paid (for clients paying their invoices)
   */
  static async payWaterBill(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const user = (req as any).user;

    try {
      const selectQuery = 'SELECT * FROM factures WHERE id = $1';
      const selectRes = await pool.query(selectQuery, [id]);

      if (selectRes.rows.length === 0) {
        return res.status(404).json({ error: 'Facture introuvable.' });
      }

      const bill = selectRes.rows[0];

      if (user.role !== 'ADMIN' && bill.utilisateur_id !== user.id) {
        return res.status(403).json({ error: 'Accès interdit.' });
      }

      if (bill.statut === 'PAYE') {
        return res.status(400).json({ error: 'Facture déjà payée.' });
      }

      const updateQuery = `
        UPDATE factures 
        SET statut = 'PAYE', paye_a = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *
      `;
      const updateRes = await pool.query(updateQuery, [id]);

      res.status(200).json({
        message: 'Facture réglée avec succès.',
        facture: updateRes.rows[0]
      });
    } catch (err) {
      console.error('Error paying bill:', err);
      res.status(500).json({ error: 'Erreur lors du paiement de la facture.' });
    }
  }
}
