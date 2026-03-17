import { useState, useEffect, useCallback } from 'react';
import type { TransitRoute } from '../types';
import { TRANSIT_STOPS, TRANSIT_REFRESH_MS } from '../config';

// Try fetching with CORS proxy fallback
async function fetchWithCorsFallback(url: string): Promise<string> {
  // Try direct first
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {
    // CORS or network error — try proxy
  }

  // Fallback: corsproxy.io
  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
  return await res.text();
}

function parseMinutesFromEpoch(epochMs: string): number {
  return Math.max(0, Math.round((parseInt(epochMs, 10) - Date.now()) / 60000));
}

async function fetchStopPredictions(
  stopId: string
): Promise<{ minutes: number }[]> {
  const url = `https://retro.umoiq.com/service/publicXMLFeed?command=predictions&a=sf-muni&stopId=${stopId}`;
  const text = await fetchWithCorsFallback(url);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const arrivals: { minutes: number }[] = [];
  const predictions = doc.querySelectorAll('prediction');
  predictions.forEach((el) => {
    const epochTime = el.getAttribute('epochTime');
    if (epochTime) {
      arrivals.push({ minutes: parseMinutesFromEpoch(epochTime) });
    }
  });

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
