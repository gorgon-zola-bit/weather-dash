# SF Transit & Weather Dashboard

A clean, tablet-optimized dashboard showing real-time SF Muni arrivals and San Francisco weather. Designed for a 10-inch tablet mounted at home.

## Features

- **Real-time transit**: Next 2-3 arrival times for 6 SF Muni route+direction combos
- **Hourly weather**: Scrollable hourly forecast cards for today
- **Tomorrow summary**: High/low temperature with weather icon
- **Auto-refresh**: Transit every 60s, weather every 15 min
- **Dark mode**: Toggle between light and dark themes
- **Responsive**: Optimized for 1280x800 tablets, works on phone and desktop
- **Error resilient**: Graceful per-section error handling with stale data warnings

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐
│  Static Frontend │────▶│  Cloudflare Worker    │
│  (GitHub Pages)  │     │  (API Proxy)          │
└─────────────────┘     └──────┬───────┬────────┘
                               │       │
                        ┌──────▼──┐ ┌──▼──────────┐
                        │ 511.org │ │ OpenWeather  │
                        │ Transit │ │ Map API      │
                        └─────────┘ └──────────────┘
```

API keys are kept server-side in the Cloudflare Worker — never exposed to the browser.

## Getting API Keys

### 511.org Transit API
1. Go to https://511.org/open-data/transit
2. Register for a free account
3. Request an API key (approved instantly)

### OpenWeatherMap API
1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Generate an API key from your dashboard
4. The free tier "5 Day / 3 Hour Forecast" API is used by default

## Bus Stop Configuration

The dashboard monitors these stops (configured in `src/config.ts`):

| Route | Direction | Stop | Stop ID |
|-------|-----------|------|---------|
| 22 Fillmore | Inbound | Fillmore St & Haight St | 15553 |
| 22 Fillmore | Outbound | Fillmore St & Haight St | 15554 |
| N Judah | Inbound | Carl St & Cole St | 16992 |
| N Judah | Outbound | Carl St & Cole St | 16993 |
| 7 Haight/Noriega | Inbound | Haight St & Masonic Ave | 15727 |
| 7 Haight/Noriega | Outbound | Haight St & Masonic Ave | 15726 |

### Changing Stops

Edit the `TRANSIT_STOPS` array in `src/config.ts`. To find SFMTA GTFS stop IDs:
- Use the 511.org API: `GET /transit/stops?operator_id=SF&api_key=YOUR_KEY`
- Or browse SFMTA's GTFS data at https://www.sfmta.com/reports/gtfs-transit-data

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USER/weather-dash.git
cd weather-dash

# 2. Install dependencies
npm install

# 3. Set environment variables
export TRANSIT_API_KEY=your_511_api_key
export WEATHER_API_KEY=your_openweathermap_key

# 4. Start the API dev server and frontend together
node api/dev-server.js &
npm run dev

# Frontend: http://localhost:5173
# API server: http://localhost:3001
```

The Vite dev server proxies `/api/*` requests to the local API server automatically.

## Deployment

### Frontend — GitHub Pages

1. Push to `main` branch — GitHub Actions will auto-build and deploy
2. Enable GitHub Pages in repo settings → Source: "GitHub Actions"
3. Set the `VITE_API_BASE` env var to point to your Cloudflare Worker URL

### API Proxy — Cloudflare Workers

```bash
cd api

# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Set secrets
wrangler secret put TRANSIT_API_KEY
wrangler secret put WEATHER_API_KEY

# Deploy
wrangler deploy
```

After deploying, update your frontend to use the Worker URL:

```bash
# In .env.local (for local dev with remote worker)
VITE_API_BASE=https://weather-dash-api.YOUR_SUBDOMAIN.workers.dev
```

### Alternative: Self-hosted

Run `api/dev-server.js` on any Node.js host (Fly.io, Railway, a home server) and point `VITE_API_BASE` to it.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **API Proxy**: Cloudflare Workers (production) / Node.js (development)
- **Deployment**: GitHub Pages + GitHub Actions
