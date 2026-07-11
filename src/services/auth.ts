import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Utilisateur } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforyourapi';

/**
 * Service to handle secure password hashing and verification using Node's native crypto module (scrypt).
 */
export class AuthService {
  /**
   * Hash a plain password using scrypt
   */
  static hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verify password against a stored hash
   */
  static verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      if (!salt || !key) {
        return resolve(false);
      }
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
      });
    });
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(user: { id: string; email: string; role: 'ADMIN' | 'CLIENT' }): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }
}
