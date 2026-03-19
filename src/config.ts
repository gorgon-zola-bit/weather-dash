import type { TransitStop } from './types';

// SF Muni GTFS Stop Configuration
// To find stop IDs: visit https://511.org/transit/schedules-maps
// or use the 511.org API: GET /transit/stops?operator_id=SF&api_key=YOUR_KEY
//
// Each entry represents one route+direction combo.
// Change stopId values to match your preferred stops.

export const TRANSIT_STOPS: TransitStop[] = [
  {
    stopId: '14632',
    routeName: '22 Fillmore',
    direction: 'SB',
    stopName: 'Fillmore St & Oak St',
  },
  {
    stopId: '14631',
    routeName: '22 Fillmore',
    direction: 'NB',
    stopName: 'Fillmore St & Oak St',
  },
  {
    stopId: '14447',
    routeName: 'N Judah',
    direction: 'EB',
    stopName: 'Duboce Ave & Church St',
  },
  {
    stopId: '14448',
    routeName: 'N Judah',
    direction: 'WB',
    stopName: 'Duboce Ave & Church St',
  },
  {
    stopId: '14953',
    routeName: '7 Haight/Noriega',
    direction: 'EB',
    stopName: 'Haight St & Fillmore St',
  },
  {
    stopId: '14952',
    routeName: '7 Haight/Noriega',
    direction: 'WB',
    stopName: 'Haight St & Fillmore St',
  },
];

// API proxy base URL — in development, Vite proxies /api to localhost:3001.
// In production (GitHub Pages), set this to your Cloudflare Worker URL.
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Refresh intervals (ms)
export const TRANSIT_REFRESH_MS = 480_000; // 8 min → 6 stops × 7.5 refreshes/hr ≈ 45 req/hr (under 60 limit)
export const WEATHER_REFRESH_MS = 900_000; // 15 minutes

// San Francisco coordinates
export const SF_LAT = 37.7749;
export const SF_LON = -122.4194;
