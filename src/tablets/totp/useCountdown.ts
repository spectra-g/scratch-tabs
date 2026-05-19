import { useState, useEffect } from 'react';

export function useCountdown(): { tick: number } {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.floor(Date.now() / 1000);
      setTick((prev) => (prev !== next ? next : prev));
    }, 250);
    return () => clearInterval(id);
  }, []);

  return { tick };
}
