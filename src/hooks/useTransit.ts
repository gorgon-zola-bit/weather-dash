import { useState, useEffect, useCallback } from 'react';
import type { TransitRoute } from '../types';
import { API_BASE, TRANSIT_STOPS, TRANSIT_REFRESH_MS } from '../config';

export function useTransit() {
  const [routes, setRoutes] = useState<TransitRoute[]>(
    TRANSIT_STOPS.map((s) => ({
      routeName: s.routeName,
      direction: s.direction,
      stopName: s.stopName,
      arrivals: [],
    }))
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchTransit = useCallback(async () => {
    try {
      const results = await Promise.all(
        TRANSIT_STOPS.map(async (stop) => {
          try {
            const res = await fetch(
              `${API_BASE}/transit?stopId=${stop.stopId}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return {
              routeName: stop.routeName,
              direction: stop.direction,
              stopName: stop.stopName,
              arrivals: (data.arrivals || []).slice(0, 3),
            } as TransitRoute;
          } catch {
            return {
              routeName: stop.routeName,
              direction: stop.direction,
              stopName: stop.stopName,
              arrivals: [],
              error: 'Unable to load',
            } as TransitRoute;
          }
        })
      );
      setRoutes(results);
      setLastUpdated(new Date());
      setIsStale(false);
    } catch {
      setIsStale(true);
    }
  }, []);

  useEffect(() => {
    fetchTransit();
    const interval = setInterval(fetchTransit, TRANSIT_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchTransit]);

  return { routes, lastUpdated, isStale, refetch: fetchTransit };
}
