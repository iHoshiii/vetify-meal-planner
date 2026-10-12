import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';

export function usePlannerToday(timeZone: string) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [timeZone]);
  return todayInTimeZone(timeZone, new Date(now));
}
