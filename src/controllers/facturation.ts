import { Request, Response } from 'express';
import pool from '../config/database';
import { IdempotencyManager } from '../services/idempotency';
import { SenelecWoyofalCalculator } from '../services/senelec';
import { SeneauCalculator } from '../services/seneau';
import { MathUtils } from '../services/math';

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
   * Handle Senelec Woyofal bill creation
   */
  static async handleSenelecCalculation(req: Request, res: Response): Promise<any> {
    const { consommation, mode_paiement, client_id } = req.body;
    const idempotencyKey = FacturationController.getIdempotencyKey(req);

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'La clé d\'idempotence (header Idempotency-Key) est requise pour cette transaction.' });
    }

    if (consommation === undefined || !mode_paiement) {
      return res.status(400).json({ error: 'Champs consommation et mode_paiement requis.' });
    }

    if (mode_paiement !== 'CASH' && mode_paiement !== 'DIGITAL') {
      return res.status(400).json({ error: 'mode_paiement doit être CASH ou DIGITAL.' });
    }

    try {
      // 1. Check idempotency shield
      const existingFacture = await IdempotencyManager.verifierCle(idempotencyKey);
      if (existingFacture) {
        return res.status(200).json({
          message: 'Requête dupliquée interceptée : renvoi de la facture précédente.',
          facture: existingFacture,
          idempotent: true
        });
      }

      // 2. Resolve client ID
      const targetClientId = FacturationController.resolveClientId(req, client_id);
      
      // Verify client exists
      const clientCheck = await pool.query('SELECT id FROM utilisateurs WHERE id = $1', [targetClientId]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client introuvable.' });
      }

      // 3. Compute costs
      const calc = await SenelecWoyofalCalculator.calculer(targetClientId, consommation, mode_paiement);

      // 4. Save to DB
      const ref = `SEN-WOY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const echeance = new Date();
      echeance.setDate(echeance.getDate() + 15); // 15 days deadline for payment or immediately paid

      const insertQuery = `
        INSERT INTO factures (
          utilisateur_id, service, reference_facture, consommation, 
          montant_ht, tva, redevance, droit_de_timbre, 
          montant_ttc, mode_paiement, statut, date_echeance, 
          idempotency_key, paye_a
        )
        VALUES ($1, 'SENELEC', $2, $3, $4, $5, $6, $7, $8, $9, 'PAYE', $10, $11, CURRENT_TIMESTAMP)
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
        idempotencyKey
      ]);

      res.status(201).json({
        message: 'Recharge Woyofal générée avec succès.',
        facture: result.rows[0],
        idempotent: false
      });

    } catch (err: any) {
      console.error('Error in Senelec handler:', err);
      res.status(500).json({ error: err.message || 'Erreur lors du calcul Woyofal.' });
    }
  }

  /**
   * Handle Seneau Water bill creation
   */
  static async handleSeneauCalculation(req: Request, res: Response): Promise<any> {
    const { consommation, mode_paiement, client_id, include_caution, calibre } = req.body;
    const idempotencyKey = FacturationController.getIdempotencyKey(req);

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'La clé d\'idempotence (header Idempotency-Key) est requise.' });
    }

    if (consommation === undefined || !mode_paiement) {
      return res.status(400).json({ error: 'Champs consommation et mode_paiement requis.' });
    }

    if (mode_paiement !== 'CASH' && mode_paiement !== 'DIGITAL') {
      return res.status(400).json({ error: 'mode_paiement doit être CASH ou DIGITAL.' });
    }

    if (include_caution && !calibre) {
      return res.status(400).json({ error: 'Le calibre du compteur est requis pour calculer la caution.' });
    }

    try {
      // 1. Check idempotency shield
      const existingFacture = await IdempotencyManager.verifierCle(idempotencyKey);
      if (existingFacture) {
        return res.status(200).json({
          message: 'Requête dupliquée interceptée : renvoi de la facture précédente.',
          facture: existingFacture,
          idempotent: true
        });
      }

      // 2. Resolve client ID
      const targetClientId = FacturationController.resolveClientId(req, client_id);
      
      // Verify client exists
      const clientCheck = await pool.query('SELECT id, is_subvented, ville_type FROM utilisateurs WHERE id = $1', [targetClientId]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client introuvable.' });
      }

      // 3. Compute costs
      const calc = await SeneauCalculator.calculer(targetClientId, consommation, mode_paiement, {
        includeCaution: include_caution === true,
        calibre: calibre ? parseInt(calibre, 10) : undefined
      });

      // 4. Save to DB
      const ref = `SEN-EAU-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const echeance = new Date();
      echeance.setDate(echeance.getDate() + 30); // 30 days echeance for water bill

      const insertQuery = `
        INSERT INTO factures (
          utilisateur_id, service, reference_facture, consommation, 
          montant_ht, tva, redevance, droit_de_timbre, 
          montant_ttc, mode_paiement, statut, date_echeance, 
          idempotency_key
        )
        VALUES ($1, 'SENEAU', $2, $3, $4, $5, $6, $7, $8, $9, 'NON_PAYE', $10, $11)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        targetClientId,
        ref,
        calc.consommation.toString(),
        calc.montant_ht.toString(),
        calc.tva.toString(),
        calc.redevance.toString(), // Holds caution if included
        calc.droit_de_timbre.toString(),
        calc.montant_ttc.toString(),
        mode_paiement,
        echeance,
        idempotencyKey
      ]);

      res.status(201).json({
        message: 'Facture d\'eau Sen\'Eau générée avec succès.',
        facture: result.rows[0],
        idempotent: false
      });

    } catch (err: any) {
      console.error('Error in Seneau handler:', err);
      res.status(500).json({ error: err.message || 'Erreur lors du calcul Sen\'Eau.' });
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
        // Admins see all invoices with client details
        query = `
          SELECT f.*, u.nom as client_name, u.email as client_email 
          FROM factures f
          JOIN utilisateurs u ON f.utilisateur_id = u.id
          ORDER BY f.cree_a DESC
        `;
      } else {
        // Clients see their own invoices
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

      // Security check: Clients can only pay their own bills
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
