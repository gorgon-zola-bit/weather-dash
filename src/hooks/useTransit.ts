import { useState, useEffect, useCallback } from 'react';
import type { TransitRoute } from '../types';
import { TRANSIT_STOPS, TRANSIT_REFRESH_MS } from '../config';

// Use the NextBus/Umo public XML feed for SF Muni real-time predictions.
// This API is free, requires no key, and supports CORS.
const NEXTBUS_BASE =
  'https://retro.umoiq.com/service/publicXMLFeed';

function parseMinutes(epochMs: string): number {
  return Math.max(0, Math.round((parseInt(epochMs, 10) - Date.now()) / 60000));
}

async function fetchStopPredictions(
  stopId: string
): Promise<{ minutes: number }[]> {
  const url = `${NEXTBUS_BASE}?command=predictions&a=sf-muni&stopId=${stopId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NextBus: ${res.status}`);
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const arrivals: { minutes: number }[] = [];
  const predictions = doc.querySelectorAll('prediction');
  predictions.forEach((el) => {
    const epochTime = el.getAttribute('epochTime');
    if (epochTime) {
      arrivals.push({ minutes: parseMinutes(epochTime) });
    }
  });

  // Sort by soonest and take top 3
  arrivals.sort((a, b) => a.minutes - b.minutes);
  return arrivals.slice(0, 3);
}

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
            const arrivals = await fetchStopPredictions(stop.stopId);
            return {
              routeName: stop.routeName,
              direction: stop.direction,
              stopName: stop.stopName,
              arrivals,
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
