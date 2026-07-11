import { useEffect, useState } from 'react';

interface CounterProps {
  value: number;
  duration?: number; // duration in ms
  formatter?: (val: number) => string;
}

export default function Counter({
  value,
  duration = 800,
  formatter = (val) => val.toLocaleString()
}: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = count;
    const endValue = value;
    
    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: cubic ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.floor(easeProgress * (endValue - startValue) + startValue);
      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{formatter(count)}</span>;
}
