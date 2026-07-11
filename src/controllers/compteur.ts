import { Request, Response } from 'express';
import pool from '../config/database';

export class CompteurController {
  /**
   * Get all meters for the authenticated user
   */
  static async getMeters(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const result = await pool.query(
        'SELECT id, nom, numero_compteur, service, dernier_index, cree_a FROM compteurs WHERE utilisateur_id = $1 ORDER BY nom ASC',
        [userPayload.id]
      );
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching meters:', err);
      res.status(500).json({ error: 'Erreur lors du chargement des compteurs.' });
    }
  }

  /**
   * Add a new meter
   */
  static async createMeter(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const { nom, numero_compteur, service, dernier_index } = req.body;

    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!nom || !numero_compteur || !service) {
      return res.status(400).json({ error: 'Champs nom, numero_compteur et service requis.' });
    }

    if (service !== 'SENELEC' && service !== 'SENEAU') {
      return res.status(400).json({ error: 'Le service doit être SENELEC ou SENEAU.' });
    }

    try {
      const dIndex = dernier_index !== undefined ? Number(dernier_index) : 0;
      const insertQuery = `
        INSERT INTO compteurs (utilisateur_id, nom, numero_compteur, service, dernier_index)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        userPayload.id,
        nom,
        numero_compteur,
        service,
        dIndex
      ]);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating meter:', err);
      res.status(500).json({ error: 'Erreur lors de la création du compteur.' });
    }
  }

  /**
   * Delete a meter
   */
  static async deleteMeter(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const { id } = req.params;

    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      // Find the meter first
      const checkRes = await pool.query('SELECT * FROM compteurs WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: 'Compteur introuvable.' });
      }

      const meter = checkRes.rows[0];

      // Security check
      if (userPayload.role !== 'ADMIN' && meter.utilisateur_id !== userPayload.id) {
        return res.status(403).json({ error: 'Accès interdit.' });
      }

      await pool.query('DELETE FROM compteurs WHERE id = $1', [id]);
      res.status(200).json({ message: 'Compteur supprimé avec succès.' });
    } catch (err) {
      console.error('Error deleting meter:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression du compteur.' });
    }
  }
}
