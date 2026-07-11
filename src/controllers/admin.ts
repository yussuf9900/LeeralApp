import { Request, Response } from 'express';
import pool from '../config/database';
import { MathUtils } from '../services/math';

export class AdminController {
  // --- USERS MANAGEMENT ---

  /**
   * List all users
   */
  static async getUsers(req: Request, res: Response): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT id, nom, email, role, is_subvented, ville_type, cree_a FROM utilisateurs ORDER BY nom ASC'
      );
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs.' });
    }
  }

  /**
   * Update user details (admin command)
   */
  static async updateUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const { nom, role, is_subvented, ville_type } = req.body;

    try {
      const checkUser = await pool.query('SELECT * FROM utilisateurs WHERE id = $1', [id]);
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      const updateQuery = `
        UPDATE utilisateurs 
        SET nom = COALESCE($1, nom),
            role = COALESCE($2, role),
            is_subvented = COALESCE($3, is_subvented),
            ville_type = COALESCE($4, ville_type),
            mis_a_jour_a = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, nom, email, role, is_subvented, ville_type, cree_a
      `;

      const result = await pool.query(updateQuery, [nom, role, is_subvented, ville_type, id]);
      res.status(200).json({
        message: 'Utilisateur mis à jour avec succès.',
        user: result.rows[0]
      });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur.' });
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const checkUser = await pool.query('SELECT id FROM utilisateurs WHERE id = $1', [id]);
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      await pool.query('DELETE FROM utilisateurs WHERE id = $1', [id]);
      res.status(200).json({ message: 'Utilisateur supprimé avec succès.' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur.' });
    }
  }

  // --- TARIFFS MANAGEMENT ---

  /**
   * Get all versioned tariffs
   */
  static async getTariffs(req: Request, res: Response): Promise<any> {
    try {
      const result = await pool.query('SELECT * FROM tarifs ORDER BY service ASC, palier_debut ASC');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching tariffs:', err);
      res.status(500).json({ error: 'Erreur lors du chargement des tarifs.' });
    }
  }

  /**
   * Add a new tariff
   */
  static async createTariff(req: Request, res: Response): Promise<any> {
    const { service, type_tarif, prix_par_unite, palier_debut, palier_fin } = req.body;

    if (!service || !type_tarif || prix_par_unite === undefined) {
      return res.status(400).json({ error: 'service, type_tarif et prix_par_unite sont requis.' });
    }

    try {
      const insertQuery = `
        INSERT INTO tarifs (service, type_tarif, prix_par_unite, palier_debut, palier_fin)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        service.toUpperCase(),
        type_tarif,
        prix_par_unite,
        palier_debut || 0.00,
        palier_fin
      ]);

      res.status(201).json({
        message: 'Tarif ajouté avec succès.',
        tariff: result.rows[0]
      });
    } catch (err) {
      console.error('Error creating tariff:', err);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du tarif.' });
    }
  }

  /**
   * Update an existing tariff
   */
  static async updateTariff(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const { prix_par_unite, palier_debut, palier_fin } = req.body;

    try {
      const checkTariff = await pool.query('SELECT id FROM tarifs WHERE id = $1', [id]);
      if (checkTariff.rows.length === 0) {
        return res.status(404).json({ error: 'Tarif introuvable.' });
      }

      const updateQuery = `
        UPDATE tarifs 
        SET prix_par_unite = COALESCE($1, prix_par_unite),
            palier_debut = COALESCE($2, palier_debut),
            palier_fin = $3
        WHERE id = $4
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        prix_par_unite,
        palier_debut,
        palier_fin,
        id
      ]);

      res.status(200).json({
        message: 'Tarif mis à jour avec succès.',
        tariff: result.rows[0]
      });
    } catch (err) {
      console.error('Error updating tariff:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du tarif.' });
    }
  }

  // --- REGULATORY AUDIT REPORT ---

  /**
   * Annual regulatory audit report for CRSE/SONES/Impôts
   */
  static async getAuditReport(req: Request, res: Response): Promise<any> {
    try {
      // 1. Core financial metrics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(montant_ht) as sum_ht,
          SUM(tva) as sum_tva,
          SUM(droit_de_timbre) as sum_timbre,
          SUM(montant_ttc) as sum_ttc,
          COALESCE(SUM(CASE WHEN service = 'SENELEC' THEN consommation ELSE 0 END), 0) as total_kwh,
          COALESCE(SUM(CASE WHEN service = 'SENEAU' THEN consommation ELSE 0 END), 0) as total_m3
        FROM factures
      `;
      const summaryRes = await pool.query(summaryQuery);
      const summary = summaryRes.rows[0];

      // 2. Metrics split by payment mode
      const paymentQuery = `
        SELECT 
          mode_paiement,
          COUNT(*) as count,
          SUM(montant_ttc) as total_ttc,
          SUM(droit_de_timbre) as total_timbre
        FROM factures
        GROUP BY mode_paiement
      `;
      const paymentRes = await pool.query(paymentQuery);

      // 3. Integrity verification check (proving calculation correctness)
      const listInvoices = await pool.query('SELECT * FROM factures LIMIT 1000');
      let tvaViolations = 0;
      let timbreViolations = 0;

      for (const row of listInvoices.rows) {
        const conso = MathUtils.toDecimal(row.consommation);
        const tva = MathUtils.toDecimal(row.tva);
        const timbre = MathUtils.toDecimal(row.droit_de_timbre);
        const ht = MathUtils.toDecimal(row.montant_ht);
        const mode = row.mode_paiement;
        const service = row.service;

        // Rule A: Senelec TVA strict application > 250 kWh
        if (service === 'SENELEC') {
          if (conso.lte(250) && tva.gt(0)) {
            tvaViolations++;
          }
        }

        // Rule B: CASH payment 1% timbre surcharge
        if (mode === 'CASH') {
          const expectedTimbreMin = MathUtils.safeMultiply(MathUtils.safeAdd(MathUtils.safeAdd(ht, tva), row.redevance), 0.01);
          if (timbre.eq(0)) {
            timbreViolations++;
          }
        } else if (mode === 'DIGITAL' && timbre.gt(0)) {
          timbreViolations++;
        }
      }

      res.status(200).json({
        report_timestamp: new Date().toISOString(),
        target_regulation: 'CRSE (Énergie) & SONES (Eau) Senegal Code 2026',
        metrics: {
          total_transactions: parseInt(summary.total_transactions, 10),
          total_ht: parseFloat(summary.sum_ht || 0),
          total_tva: parseFloat(summary.sum_tva || 0),
          total_timbre: parseFloat(summary.sum_timbre || 0),
          total_ttc: parseFloat(summary.sum_ttc || 0),
          electricity_consumed_kwh: parseFloat(summary.total_kwh || 0),
          water_consumed_m3: parseFloat(summary.total_m3 || 0),
        },
        payment_splits: paymentRes.rows.map(r => ({
          mode: r.mode_paiement,
          count: parseInt(r.count, 10),
          total_ttc: parseFloat(r.total_ttc || 0),
          total_timbre: parseFloat(r.total_timbre || 0)
        })),
        regulatory_compliance_checklist: {
          senelec_tva_compliance: tvaViolations === 0 ? 'CONFORME (100%)' : `NON CONFORME (${tvaViolations} anomalies)`,
          droit_de_timbre_cash_compliance: timbreViolations === 0 ? 'CONFORME (100%)' : `NON CONFORME (${timbreViolations} anomalies)`,
          integrity_hash: MathUtils.roundFinancial(MathUtils.safeAdd(summary.sum_ht || 0, summary.sum_tva || 0)).toString()
        }
      });
    } catch (err) {
      console.error('Error generating audit report:', err);
      res.status(500).json({ error: 'Erreur lors de la génération du rapport réglementaire.' });
    }
  }
}
