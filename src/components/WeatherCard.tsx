import type { WeatherData } from '../types';

interface Props {
  weather: WeatherData;
  lastUpdated: Date | null;
  isStale: boolean;
}

function weatherIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function formatHour(unix: number) {
  return new Date(unix * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

function isCurrentHour(unix: number) {
  const now = new Date();
  const d = new Date(unix * 1000);
  return d.getHours() === now.getHours() && d.getDate() === now.getDate();
}

export function WeatherCard({ weather, lastUpdated, isStale }: Props) {
  if (weather.error) {
    return (
      <div className="rounded-2xl p-5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <h2 className="text-[1.4rem] font-semibold text-text-light dark:text-text-dark mb-2">
          Weather
        </h2>
        <p className="text-muted-light dark:text-muted-dark">
          {weather.error}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[1.4rem] font-semibold text-text-light dark:text-text-dark">
          San Francisco Weather
        </h2>
        <div className="text-[0.7rem] text-muted-light dark:text-muted-dark">
          {isStale && (
            <span className="text-amber-500 mr-2">Stale data</span>
          )}
          {lastUpdated && <>Updated {lastUpdated.toLocaleTimeString()}</>}
        </div>
      </div>

      {/* Hourly forecast */}
      {weather.hourly.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[0.85rem] font-medium text-muted-light dark:text-muted-dark mb-2">
            Today — Hourly
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {weather.hourly.map((h) => (
              <div
                key={h.time}
                className={`flex-shrink-0 rounded-xl p-3 min-w-[5rem] text-center border ${
                  isCurrentHour(h.time)
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <div className="text-[0.75rem] font-medium text-muted-light dark:text-muted-dark">
                  {isCurrentHour(h.time) ? 'Now' : formatHour(h.time)}
                </div>
                <img
                  src={weatherIconUrl(h.icon)}
                  alt={h.description}
                  className="w-10 h-10 mx-auto"
                />
                <div className="text-[1rem] font-bold text-text-light dark:text-text-dark">
                  {Math.round(h.temp)}°
                </div>
                <div className="text-[0.65rem] text-muted-light dark:text-muted-dark">
                  Feels {Math.round(h.feelsLike)}°
                </div>
                {h.precipProbability > 0 && (
                  <div className="text-[0.65rem] text-primary-light mt-1">
                    {Math.round(h.precipProbability * 100)}% rain
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow summary */}
      {weather.tomorrow && (
        <div className="flex items-center gap-4 pt-3 border-t border-border-light dark:border-border-dark">
          <h3 className="text-[0.85rem] font-medium text-muted-light dark:text-muted-dark">
            Tomorrow
          </h3>
          <img
            src={weatherIconUrl(weather.tomorrow.icon)}
            alt={weather.tomorrow.description}
            className="w-10 h-10"
          />
          <div className="text-text-light dark:text-text-dark">
            <span className="font-bold">
              {Math.round(weather.tomorrow.tempHigh)}°
            </span>
            <span className="text-muted-light dark:text-muted-dark mx-1">/</span>
            <span className="text-muted-light dark:text-muted-dark">
              {Math.round(weather.tomorrow.tempLow)}°
            </span>
          </div>
          <div className="text-[0.85rem] text-muted-light dark:text-muted-dark capitalize">
            {weather.tomorrow.description}
          </div>
        </div>
      )}
    </div>
  );
}
