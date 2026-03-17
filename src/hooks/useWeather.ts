import { useState, useEffect, useCallback } from 'react';
import type { WeatherData } from '../types';
import { API_BASE, WEATHER_REFRESH_MS } from '../config';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>({
    hourly: [],
    tomorrow: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/weather`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WeatherData = await res.json();
      setWeather(data);
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
