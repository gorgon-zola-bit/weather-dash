import { useState, useEffect, useCallback } from 'react';
import type { WeatherData, HourlyWeather, DailyWeather } from '../types';
import { SF_LAT, SF_LON, WEATHER_REFRESH_MS } from '../config';

// Open-Meteo WMO weather code → OpenWeatherMap icon code
function wmoToOwmIcon(code: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';
  if (code === 0) return `01${suffix}`;                          // clear
  if (code === 1) return `01${suffix}`;                          // mainly clear
  if (code === 2) return `02${suffix}`;                          // partly cloudy
  if (code === 3) return `04${suffix}`;                          // overcast
  if (code === 45 || code === 48) return `50${suffix}`;          // fog
  if (code >= 51 && code <= 55) return `09${suffix}`;            // drizzle
  if (code >= 56 && code <= 57) return `09${suffix}`;            // freezing drizzle
  if (code >= 61 && code <= 65) return `10${suffix}`;            // rain
  if (code >= 66 && code <= 67) return `13${suffix}`;            // freezing rain
  if (code >= 71 && code <= 77) return `13${suffix}`;            // snow
  if (code >= 80 && code <= 82) return `09${suffix}`;            // rain showers
  if (code >= 85 && code <= 86) return `13${suffix}`;            // snow showers
  if (code >= 95) return `11${suffix}`;                          // thunderstorm
  return `02${suffix}`;
}

function wmoDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45) return 'Fog';
  if (code === 48) return 'Rime fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 63) return 'Rain';
  if (code === 65) return 'Heavy rain';
  if (code >= 66 && code <= 67) return 'Freezing rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code >= 96) return 'Thunderstorm with hail';
  return 'Unknown';
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>({
    hourly: [],
    tomorrow: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchWeather = useCallback(async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${SF_LAT}&longitude=${SF_LON}` +
        `&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation` +
        `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&temperature_unit=fahrenheit` +
        `&timezone=America/Los_Angeles` +
        `&forecast_days=2`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
      const data = await res.json();

      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

      // Build "Now" entry from current conditions (real-time, not forecast)
      const current = data.current;
      const currentWeatherCode = current.weather_code;
      const currentIsDay = current.is_day === 1;
      const nowEntry: HourlyWeather = {
        time: Math.floor(now.getTime() / 1000), // use actual now so isCurrentHour() matches
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        description: wmoDescription(currentWeatherCode),
        icon: wmoToOwmIcon(currentWeatherCode, currentIsDay),
        precipProbability: 0,
        precipAmount: current.precipitation ?? 0,
      };

      // Parse hourly data for today (future hours only, skip current hour)
      const hourlyTimes: string[] = data.hourly.time;
      const hourly: HourlyWeather[] = [nowEntry];

      for (let i = 0; i < hourlyTimes.length; i++) {
        const timeStr = hourlyTimes[i]; // "2026-03-17T14:00"
        const date = timeStr.slice(0, 10);
        const hour = parseInt(timeStr.slice(11, 13), 10);

        if (date === todayStr && hour > currentHour) {
          const weatherCode = data.hourly.weather_code[i];
          const isDay = data.hourly.is_day[i] === 1;
          hourly.push({
            time: Math.floor(new Date(timeStr).getTime() / 1000),
            temp: Math.round(data.hourly.temperature_2m[i]),
            feelsLike: Math.round(data.hourly.apparent_temperature[i]),
            description: wmoDescription(weatherCode),
            icon: wmoToOwmIcon(weatherCode, isDay),
            precipProbability: (data.hourly.precipitation_probability[i] ?? 0) / 100,
            precipAmount: data.hourly.precipitation[i] ?? 0,
          });
        }
      }

      // Parse tomorrow's daily forecast
      let tomorrow: DailyWeather | null = null;
      if (data.daily.time.length >= 2) {
        const code = data.daily.weather_code[1];
        tomorrow = {
          tempHigh: Math.round(data.daily.temperature_2m_max[1]),
          tempLow: Math.round(data.daily.temperature_2m_min[1]),
          description: wmoDescription(code),
          icon: wmoToOwmIcon(code, true),
        };
      }

      setWeather({ hourly, tomorrow });
      setLastUpdated(new Date());
      setIsStale(false);
    } catch {
      setIsStale(true);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, WEATHER_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  return { weather, lastUpdated, isStale, refetch: fetchWeather };
}
