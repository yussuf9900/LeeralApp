import pool from '../config/database';
import { Facture } from '../models';

export class IdempotencyManager {
  /**
   * Verify if a transaction with the given idempotency key already exists.
   * If yes, return the recorded bill.
   */
  static async verifierCle(key: string): Promise<Facture | null> {
    if (!key) return null;
    
    const query = 'SELECT * FROM factures WHERE idempotency_key = $1';
    const res = await pool.query(query, [key]);
    
    if (res.rows.length > 0) {
      return res.rows[0] as Facture;
    }
    
    return null;
  }
}
