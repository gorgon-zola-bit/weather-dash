/**
 * Cloudflare Worker — API proxy for SF Transit & Weather Dashboard
 *
 * Deploy to Cloudflare Workers (free tier). Set these secrets:
 *   wrangler secret put TRANSIT_API_KEY
 *   wrangler secret put WEATHER_API_KEY
 *
 * Routes:
 *   GET /api/transit?stopId=XXXXX  — proxies 511.org real-time transit
 *   GET /api/weather                — proxies OpenWeatherMap forecast
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SF_LAT = 37.7749;
const SF_LON = -122.4194;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/transit') {
      return handleTransit(url, env);
    }

    if (url.pathname === '/api/weather') {
      return handleWeather(env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleTransit(url, env) {
  const stopId = url.searchParams.get('stopId');
  if (!stopId) {
    return jsonResponse({ error: 'Missing stopId' }, 400);
  }

  try {
    const apiUrl = `https://api.511.org/transit/StopMonitoring?api_key=${env.TRANSIT_API_KEY}&agency=SF&stopCode=${stopId}&format=json`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return jsonResponse({ error: `511 API error: ${res.status}` }, 502);
    }

    let text = await res.text();
    // 511.org sometimes returns BOM characters
    text = text.replace(/^\uFEFF/, '');
    const data = JSON.parse(text);

    // StopMonitoringDelivery can be an array or a single object
    const smd = data?.ServiceDelivery?.StopMonitoringDelivery;
    let deliveries = [];
    if (Array.isArray(smd)) {
      deliveries = smd[0]?.MonitoredStopVisit ?? [];
    } else if (smd) {
      deliveries = smd.MonitoredStopVisit ?? [];
    }

    const arrivals = deliveries
      .map((visit) => {
        const call = visit.MonitoredVehicleJourney?.MonitoredCall;
        if (!call) return null;
        const expected = call.ExpectedArrivalTime || call.ExpectedDepartureTime;
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

    return jsonResponse({ arrivals });
  } catch (e) {
    return jsonResponse({ error: 'Transit fetch failed' }, 500);
  }
}

async function handleWeather(env) {
  try {
    const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${SF_LAT}&lon=${SF_LON}&units=imperial&exclude=minutely,alerts&appid=${env.WEATHER_API_KEY}`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      // Fall back to 2.5 forecast API (free tier)
      return handleWeatherFallback(env);
    }

    const data = await res.json();
    return formatOneCallResponse(data);
  } catch {
    // Fall back to 2.5 API
    return handleWeatherFallback(env);
  }
}

async function handleWeatherFallback(env) {
  try {
    // Use the free 2.5 forecast API
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${SF_LAT}&lon=${SF_LON}&units=imperial&appid=${env.WEATHER_API_KEY}`;
    const res = await fetch(forecastUrl);
    if (!res.ok) {
      return jsonResponse({ error: `Weather API error: ${res.status}` }, 502);
    }

    const data = await res.json();
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const hourly = (data.list || [])
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

    // Tomorrow's data from forecast
    const tomorrowItems = (data.list || []).filter((item) => {
      const dt = new Date(item.dt * 1000);
      return dt >= tomorrowStart && dt <= tomorrowEnd;
    });

    let tomorrow = null;
    if (tomorrowItems.length > 0) {
      const temps = tomorrowItems.map((i) => i.main.temp);
      // Pick the midday entry for icon/description
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

    return jsonResponse({ hourly, tomorrow });
  } catch {
    return jsonResponse({ error: 'Weather fetch failed' }, 500);
  }
}

function formatOneCallResponse(data) {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const hourly = (data.hourly || [])
    .filter((h) => {
      const dt = new Date(h.dt * 1000);
      return dt >= now && dt <= todayEnd;
    })
    .map((h) => ({
      time: h.dt,
      temp: h.temp,
      feelsLike: h.feels_like,
      description: h.weather?.[0]?.description || '',
      icon: h.weather?.[0]?.icon || '01d',
      precipProbability: h.pop || 0,
      precipAmount: h.rain?.['1h'] || h.snow?.['1h'] || 0,
    }));

  const tomorrowData = data.daily?.[1];
  const tomorrow = tomorrowData
    ? {
        tempHigh: tomorrowData.temp.max,
        tempLow: tomorrowData.temp.min,
        description: tomorrowData.weather?.[0]?.description || '',
        icon: tomorrowData.weather?.[0]?.icon || '01d',
      }
    : null;

  return jsonResponse({ hourly, tomorrow });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
