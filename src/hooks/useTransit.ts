import { useState, useEffect, useCallback } from 'react';
import type { TransitRoute } from '../types';
import { TRANSIT_STOPS, TRANSIT_REFRESH_MS } from '../config';

const TRANSIT_API_KEY = '3ca48652-5b64-47fe-b4e4-15ef24009429';

// 511.org doesn't send CORS headers, so we need a proxy for browser use
async function fetchWithCorsFallback(url: string): Promise<Response> {
  // Try direct first (works if CORS is enabled or same-origin)
  try {
    const res = await fetch(url);
    if (res.ok) return res;
  } catch {
    // CORS or network error — try proxy
  }

  // Fallback: corsproxy.io
  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
  return res;
}

interface SiriMonitoredCall {
  ExpectedArrivalTime?: string;
  AimedArrivalTime?: string;
}

interface SiriMonitoredVehicleJourney {
  PublishedLineName: string;
  DirectionRef: string;
  MonitoredCall?: SiriMonitoredCall;
}

interface SiriMonitoredStopVisit {
  MonitoredVehicleJourney: SiriMonitoredVehicleJourney;
}

async function fetchStopPredictions(
  stopId: string
): Promise<{ minutes: number }[]> {
  const url =
    `https://api.511.org/transit/StopMonitoring` +
    `?api_key=${TRANSIT_API_KEY}` +
    `&agency=SF` +
    `&stopcode=${stopId}` +
    `&format=json`;

  const res = await fetchWithCorsFallback(url);
  let text = await res.text();
  // 511.org sometimes prepends a BOM character
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const data = JSON.parse(text);

  const deliveries =
    data?.ServiceDelivery?.StopMonitoringDelivery;
  if (!deliveries || deliveries.length === 0) return [];

  const visits: SiriMonitoredStopVisit[] =
    deliveries[0]?.MonitoredStopVisit ?? [];

  const now = Date.now();
  const arrivals: { minutes: number }[] = [];

  for (const visit of visits) {
    const call = visit.MonitoredVehicleJourney?.MonitoredCall;
    const timeStr = call?.ExpectedArrivalTime ?? call?.AimedArrivalTime;
    if (!timeStr) continue;

    const arrivalMs = new Date(timeStr).getTime();
    const minutes = Math.max(0, Math.round((arrivalMs - now) / 60000));
    arrivals.push({ minutes });
  }

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
      // Mark as successfully updated if at least one route loaded
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

  useEffect(() => {
    fetchTransit();
    const interval = setInterval(fetchTransit, TRANSIT_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchTransit]);

  return { routes, lastUpdated, isStale, refetch: fetchTransit };
}
