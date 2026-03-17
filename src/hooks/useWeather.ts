import { useState, useEffect, useCallback } from 'react';
import type { WeatherData, HourlyWeather, DailyWeather } from '../types';
import { SF_LAT, SF_LON, WEATHER_REFRESH_MS } from '../config';

// NWS icon URL to OpenWeatherMap-style icon code mapping
function nwsIconToOwm(iconUrl: string): string {
  const url = iconUrl.toLowerCase();
  const isNight = url.includes('/night/');
  if (url.includes('tsra') || url.includes('thunder')) return isNight ? '11n' : '11d';
  if (url.includes('rain') || url.includes('shower')) return isNight ? '10n' : '10d';
  if (url.includes('snow') || url.includes('blizzard')) return isNight ? '13n' : '13d';
  if (url.includes('fog') || url.includes('haze') || url.includes('smoke')) return isNight ? '50n' : '50d';
  if (url.includes('ovc')) return isNight ? '04n' : '04d';
  if (url.includes('bkn')) return isNight ? '04n' : '04d';
  if (url.includes('sct')) return isNight ? '03n' : '03d';
  if (url.includes('few')) return isNight ? '02n' : '02d';
  if (url.includes('skc') || url.includes('clear') || url.includes('sunny') || url.includes('hot')) return isNight ? '01n' : '01d';
  if (url.includes('wind')) return isNight ? '50n' : '50d';
  return isNight ? '02n' : '02d';
}

// Fahrenheit string like "65" or number to number
function toF(val: number | string): number {
  return typeof val === 'string' ? parseInt(val, 10) : Math.round(val);
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
      // Step 1: Get the forecast grid endpoint for SF coordinates
      const pointRes = await fetch(
        `https://api.weather.gov/points/${SF_LAT},${SF_LON}`,
        { headers: { 'User-Agent': 'weather-dash-app' } }
      );
      if (!pointRes.ok) throw new Error(`NWS points: ${pointRes.status}`);
      const pointData = await pointRes.json();

      const forecastHourlyUrl: string = pointData.properties.forecastHourly;
      const forecastUrl: string = pointData.properties.forecast;

      // Step 2: Fetch hourly and daily forecasts in parallel
      const [hourlyRes, dailyRes] = await Promise.all([
        fetch(forecastHourlyUrl, {
          headers: { 'User-Agent': 'weather-dash-app' },
        }),
        fetch(forecastUrl, {
          headers: { 'User-Agent': 'weather-dash-app' },
        }),
      ]);

      if (!hourlyRes.ok) throw new Error(`NWS hourly: ${hourlyRes.status}`);
      if (!dailyRes.ok) throw new Error(`NWS daily: ${dailyRes.status}`);

      const hourlyData = await hourlyRes.json();
      const dailyData = await dailyRes.json();

      // Step 3: Parse hourly forecast — get remaining hours today
      const now = new Date();
      const todayDate = now.toISOString().slice(0, 10);
      const hourlyPeriods = hourlyData.properties.periods || [];

      const hourly: HourlyWeather[] = hourlyPeriods
        .filter((p: { startTime: string }) => p.startTime.slice(0, 10) === todayDate)
        .slice(0, 12)
        .map((p: { startTime: string; temperature: number; icon: string; shortForecast: string; probabilityOfPrecipitation: { value: number | null } }) => {
          const time = Math.floor(new Date(p.startTime).getTime() / 1000);
          return {
            time,
            temp: toF(p.temperature),
            feelsLike: toF(p.temperature), // NWS doesn't give feels-like in hourly
            description: p.shortForecast,
            icon: nwsIconToOwm(p.icon),
            precipProbability: (p.probabilityOfPrecipitation?.value ?? 0) / 100,
            precipAmount: 0,
          } satisfies HourlyWeather;
        });

      // Step 4: Parse daily forecast — find tomorrow
      const dailyPeriods = dailyData.properties.periods || [];
      let tomorrow: DailyWeather | null = null;

      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      const tomorrowPeriods = dailyPeriods.filter(
        (p: { startTime: string }) => p.startTime.slice(0, 10) === tomorrowStr
      );

      if (tomorrowPeriods.length > 0) {
        const temps = tomorrowPeriods.map((p: { temperature: number }) => p.temperature);
        const dayPeriod = tomorrowPeriods.find((p: { isDaytime: boolean }) => p.isDaytime) || tomorrowPeriods[0];
        tomorrow = {
          tempHigh: Math.max(...temps),
          tempLow: Math.min(...temps),
          description: dayPeriod.shortForecast,
          icon: nwsIconToOwm(dayPeriod.icon),
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
