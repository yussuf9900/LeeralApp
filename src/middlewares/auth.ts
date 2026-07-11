import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required (Bearer)' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach decoded user information to request
  (req as any).user = decoded;
  next();
};

export const restrictTo = (...roles: Array<'ADMIN' | 'CLIENT'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }

    next();
  };
};
