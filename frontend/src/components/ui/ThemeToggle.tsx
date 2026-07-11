
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onChange: () => void;
}

export default function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <button className="theme-toggle-btn" onClick={onChange} aria-label="Toggle theme">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -10, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 10, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2 }}
        >
          {theme === 'light' ? (
            <Moon size={20} className="text-secondary" />
          ) : (
            <Sun size={20} className="text-warning" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
