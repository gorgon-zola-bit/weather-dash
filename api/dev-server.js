/**
 * Local development API server.
 * Run: node api/dev-server.js
 *
 * Requires environment variables:
 *   TRANSIT_API_KEY — 511.org API key
 *   WEATHER_API_KEY — OpenWeatherMap API key
 */

import http from 'node:http';
import https from 'node:https';

const PORT = 3001;
const SF_LAT = 37.7749;
const SF_LON = -122.4194;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          // Strip BOM
          data = data.replace(/^\uFEFF/, '');
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/transit') {
    const stopId = url.searchParams.get('stopId');
    if (!stopId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing stopId' }));
      return;
    }

    try {
      const apiKey = process.env.TRANSIT_API_KEY;
      if (!apiKey) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'TRANSIT_API_KEY not set' }));
        return;
      }

      const apiUrl = `https://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=SF&stopCode=${stopId}&format=json`;
      const { status, body } = await fetchJSON(apiUrl);

      if (status !== 200) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: `511 API error: ${status}` }));
        return;
      }

      const deliveries =
        body?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit || [];

      const arrivals = deliveries
        .map((visit) => {
          const call = visit.MonitoredVehicleJourney?.MonitoredCall;
          if (!call) return null;
          const expected =
            call.ExpectedArrivalTime || call.ExpectedDepartureTime;
          if (!expected) return null;
          const mins = Math.max(
            0,
            Math.round((new Date(expected).getTime() - Date.now()) / 60000)
          );
          return { minutes: mins };
        })
        .filter(Boolean)
        .sort((a, b) => a.minutes - b.minutes)
        .slice(0, 3);

      res.writeHead(200);
      res.end(JSON.stringify({ arrivals }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Transit fetch failed' }));
    }
    return;
  }

  if (url.pathname === '/api/weather') {
    try {
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'WEATHER_API_KEY not set' }));
        return;
      }

      // Try free 2.5 forecast API first
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${SF_LAT}&lon=${SF_LON}&units=imperial&appid=${apiKey}`;
      const { status, body } = await fetchJSON(forecastUrl);

      if (status !== 200) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: `Weather API error: ${status}` }));
        return;
      }

      const now = new Date();
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const hourly = (body.list || [])
        .filter((item) => {
          const dt = new Date(item.dt * 1000);
          return dt >= now && dt <= todayEnd;
        })
        .map((item) => ({
          time: item.dt,
          temp: item.main.temp,
          feelsLike: item.main.feels_like,
          description: item.weather?.[0]?.description || '',
          icon: item.weather?.[0]?.icon || '01d',
          precipProbability: item.pop || 0,
          precipAmount: item.rain?.['3h'] || item.snow?.['3h'] || 0,
        }));

      const tomorrowItems = (body.list || []).filter((item) => {
        const dt = new Date(item.dt * 1000);
        return dt >= tomorrowStart && dt <= tomorrowEnd;
      });

      let tomorrow = null;
      if (tomorrowItems.length > 0) {
        const temps = tomorrowItems.map((i) => i.main.temp);
        const midday =
          tomorrowItems.find((i) => {
            const h = new Date(i.dt * 1000).getHours();
            return h >= 11 && h <= 14;
          }) || tomorrowItems[Math.floor(tomorrowItems.length / 2)];

        tomorrow = {
          tempHigh: Math.max(...temps),
          tempLow: Math.min(...temps),
          description: midday.weather?.[0]?.description || '',
          icon: midday.weather?.[0]?.icon || '01d',
        };
      }

      res.writeHead(200);
      res.end(JSON.stringify({ hourly, tomorrow }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Weather fetch failed' }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`);
});
