import { useState, useEffect } from 'react';
import { backendService } from '../services/backend.service';
import type { RaceEvent } from '../types';

export function useSchedule(year: number) {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const data = await backendService.getSchedule(year);
        setEvents(data.events);
        setLoading(false);
      } catch (err) {
        setError('Erreur de chargement');
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [year]);

  return { events, loading, error };
}
