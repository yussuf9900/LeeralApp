import React from 'react';
import { motion } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: Option[];
  selectedValue: string;
  onChange: (value: any) => void;
  activeColorClass?: 'senelec' | 'seneau' | 'primary';
}

export default function SegmentedControl({
  options,
  selectedValue,
  onChange,
  activeColorClass = 'primary'
}: SegmentedControlProps) {
  const activeIndex = options.findIndex((opt) => opt.value === selectedValue);

  return (
    <div className="segmented-control">
      {/* Sliding background container */}
      <motion.div
        className={`segmented-slider ${activeColorClass}`}
        animate={{
          x: `${activeIndex * 100}%`,
          width: `${100 / options.length}%`
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          width: `${100 / options.length}%`
        }}
      />

      {options.map((option) => {
        const isActive = option.value === selectedValue;
        return (
          <button
            key={option.value}
            type="button"
            className="segmented-btn"
            style={{ color: isActive ? '#ffffff' : 'var(--text-secondary)' }}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
