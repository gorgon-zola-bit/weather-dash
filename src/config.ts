import type { TransitStop } from './types';

// SF Muni GTFS Stop Configuration
// To find stop IDs: visit https://511.org/transit/schedules-maps
// or use the 511.org API: GET /transit/stops?operator_id=SF&api_key=YOUR_KEY
//
// Each entry represents one route+direction combo.
// Change stopId values to match your preferred stops.

export const TRANSIT_STOPS: TransitStop[] = [
  {
    stopId: '15553',
    routeName: '22 Fillmore',
    direction: 'Inbound',
    stopName: 'Fillmore St & Haight St',
  },
  {
    stopId: '15554',
    routeName: '22 Fillmore',
    direction: 'Outbound',
    stopName: 'Fillmore St & Haight St',
  },
  {
    stopId: '16992',
    routeName: 'N Judah',
    direction: 'Inbound',
    stopName: 'Carl St & Cole St',
  },
  {
    stopId: '16993',
    routeName: 'N Judah',
    direction: 'Outbound',
    stopName: 'Carl St & Cole St',
  },
  {
    stopId: '15727',
    routeName: '7 Haight/Noriega',
    direction: 'Inbound',
    stopName: 'Haight St & Masonic Ave',
  },
  {
    stopId: '15726',
    routeName: '7 Haight/Noriega',
    direction: 'Outbound',
    stopName: 'Haight St & Masonic Ave',
  },
];

// API proxy base URL — in development, Vite proxies /api to localhost:3001.
// In production (GitHub Pages), set this to your Cloudflare Worker URL.
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Refresh intervals (ms)
export const TRANSIT_REFRESH_MS = 60_000; // 60 seconds
export const WEATHER_REFRESH_MS = 900_000; // 15 minutes

// San Francisco coordinates
export const SF_LAT = 37.7749;
export const SF_LON = -122.4194;
