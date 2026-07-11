import type { ReactNode, CSSProperties } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  hoverScale?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  style,
  hoverScale = true
}: GlassCardProps) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      whileHover={hoverScale && onClick ? { y: -4, scale: 1.01 } : hoverScale ? { y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
