import { useState, useEffect, useCallback, useRef } from 'react';
import type { TransitRoute } from '../types';
import { TRANSIT_STOPS, TRANSIT_REFRESH_MS, API_BASE } from '../config';

const COUNTDOWN_INTERVAL_MS = 15_000; // Recalculate displayed minutes every 15s

// Stored arrival with absolute timestamp so we can recompute minutes locally
interface StoredArrival {
  arrivalTime: number; // epoch ms
}

interface StoredRoute {
  routeName: string;
  direction: string;
  stopName: string;
  arrivals: StoredArrival[];
  error?: string;
}

async function fetchStopPredictions(
  stopId: string
): Promise<StoredArrival[]> {
  const res = await fetch(`${API_BASE}/transit?stopId=${stopId}`);
  if (!res.ok) throw new Error(`Transit proxy error: ${res.status}`);
  const data = await res.json();

  const now = Date.now();
  // The proxy returns { arrivals: [{ minutes: N }] }
  // Convert minutes back to absolute timestamps for local countdown
  const arrivals: StoredArrival[] = (data.arrivals ?? []).map(
    (a: { minutes: number }) => ({
      arrivalTime: now + a.minutes * 60000,
    })
  );

  return arrivals;
}

/** Recompute display minutes from stored absolute timestamps */
function computeDisplayRoutes(stored: StoredRoute[]): TransitRoute[] {
  const now = Date.now();
  return stored.map((r) => ({
    routeName: r.routeName,
    direction: r.direction,
    stopName: r.stopName,
    error: r.error,
    arrivals: r.arrivals
      .map((a) => ({
        minutes: Math.max(0, Math.round((a.arrivalTime - now) / 60000)),
      }))
      .filter((a) => a.minutes >= 0),
  }));
}

export function useTransit() {
  // Store absolute timestamps between API fetches
  const storedRef = useRef<StoredRoute[]>(
    TRANSIT_STOPS.map((s) => ({
      routeName: s.routeName,
      direction: s.direction,
      stopName: s.stopName,
      arrivals: [],
    }))
  );

  const [routes, setRoutes] = useState<TransitRoute[]>(
    computeDisplayRoutes(storedRef.current)
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
            } as StoredRoute;
          } catch {
            return {
              routeName: stop.routeName,
              direction: stop.direction,
              stopName: stop.stopName,
              arrivals: [],
              error: 'Unable to load',
            } as StoredRoute;
          }
        })
      );
      storedRef.current = results;
      setRoutes(computeDisplayRoutes(results));
      const anySuccess = results.some((r) => !r.error);
      if (anySuccess) {
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        setIsStale(true);
      }
    } catch {
      setIsStale(true);
    }
  }, []);

  // Fetch from 511 API at the configured interval
  useEffect(() => {
    fetchTransit();
    const interval = setInterval(fetchTransit, TRANSIT_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchTransit]);

  // Local countdown: recalculate displayed minutes every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRoutes(computeDisplayRoutes(storedRef.current));
    }, COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return { routes, lastUpdated, isStale, refetch: fetchTransit };
}
