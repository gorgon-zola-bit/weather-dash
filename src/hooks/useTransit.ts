import { useState, useEffect, useCallback, useRef } from 'react';
import type { TransitRoute } from '../types';
import { TRANSIT_STOPS, TRANSIT_REFRESH_MS } from '../config';

const TRANSIT_API_KEY = '3ca48652-5b64-47fe-b4e4-15ef24009429';
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
  const apiUrl =
    `https://api.511.org/transit/StopMonitoring` +
    `?api_key=${TRANSIT_API_KEY}` +
    `&agency=SF` +
    `&stopCode=${stopId}` +
    `&format=json`;

  // Try multiple approaches to handle CORS
  let text: string | null = null;

  // 1. Try via Vite dev server proxy (works if dev server middleware is active)
  try {
    const proxyRes = await fetch(`/api/transit?stopId=${stopId}`);
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (proxyData.arrivals) {
        const now = Date.now();
        return (proxyData.arrivals as { minutes: number }[]).map((a) => ({
          arrivalTime: now + a.minutes * 60000,
        }));
      }
    }
  } catch {
    // Proxy not available, continue to fallback
  }

  // 2. Try direct fetch (works if 511 sends CORS headers)
  try {
    const res = await fetch(apiUrl);
    if (res.ok) {
      text = await res.text();
    }
  } catch {
    // CORS or network error — try proxy
  }

  // 3. Fallback: allorigins proxy
  if (!text) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        text = await res.text();
      }
    } catch {
      // Try next proxy
    }
  }

  // 4. Fallback: corsproxy.io
  if (!text) {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(apiUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`All fetch methods failed for stop ${stopId}`);
    text = await res.text();
  }

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const data = JSON.parse(text);

  // Log the response structure for debugging
  console.log(`[transit] Stop ${stopId} response keys:`, Object.keys(data?.ServiceDelivery ?? {}));
  const delivery = data?.ServiceDelivery?.StopMonitoringDelivery;
  console.log(`[transit] StopMonitoringDelivery type:`, Array.isArray(delivery) ? 'array' : typeof delivery);

  // Navigate the SIRI response structure
  // Handle StopMonitoringDelivery as either an array or a single object
  let visits: unknown[] = [];
  if (Array.isArray(delivery)) {
    // Could be an array of delivery objects
    for (const d of delivery) {
      const v = d?.MonitoredStopVisit;
      if (Array.isArray(v)) {
        visits = visits.concat(v);
      }
    }
  } else if (delivery) {
    visits = delivery.MonitoredStopVisit ?? [];
  }
  console.log(`[transit] Found ${visits.length} visits for stop ${stopId}`);

  const arrivals: StoredArrival[] = [];

  for (const visit of visits) {
    const mvj = (visit as Record<string, unknown>)?.MonitoredVehicleJourney as
      | Record<string, unknown>
      | undefined;
    const call = mvj?.MonitoredCall as Record<string, unknown> | undefined;
    const timeStr =
      (call?.ExpectedArrivalTime as string) ??
      (call?.ExpectedDepartureTime as string) ??
      (call?.AimedArrivalTime as string);
    if (!timeStr) continue;

    const arrivalTime = new Date(timeStr).getTime();
    if (!Number.isNaN(arrivalTime)) {
      arrivals.push({ arrivalTime });
    }
  }

  arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
  return arrivals.slice(0, 3);
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
          } catch (err) {
            console.error(`Transit fetch failed for ${stop.routeName} (${stop.stopId}):`, err);
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
