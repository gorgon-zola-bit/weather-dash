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
      <div className="rounded-lg p-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <p className="text-[0.75rem] text-muted-light dark:text-muted-dark">
          {weather.error}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
      {/* Hourly forecast */}
      {weather.hourly.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {weather.hourly.map((h) => (
            <div
              key={h.time}
              className={`flex-shrink-0 rounded-md px-1.5 py-1 min-w-[3.2rem] text-center border ${
                isCurrentHour(h.time)
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border-light dark:border-border-dark'
              }`}
            >
              <div className="text-[0.6rem] font-medium text-muted-light dark:text-muted-dark">
                {isCurrentHour(h.time) ? 'Now' : formatHour(h.time)}
              </div>
              <img
                src={weatherIconUrl(h.icon)}
                alt={h.description}
                className="w-6 h-6 mx-auto"
              />
              <div className="text-[0.75rem] font-bold text-text-light dark:text-text-dark">
                {Math.round(h.temp)}°
              </div>
              {h.precipProbability > 0 && (
                <div className="text-[0.55rem] text-primary-light">
                  {Math.round(h.precipProbability * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tomorrow summary */}
      {weather.tomorrow && (
        <div className="flex items-center gap-2 pt-1.5 mt-1.5 border-t border-border-light dark:border-border-dark">
          <span className="text-[0.65rem] font-medium text-muted-light dark:text-muted-dark">
            Tomorrow
          </span>
          <img
            src={weatherIconUrl(weather.tomorrow.icon)}
            alt={weather.tomorrow.description}
            className="w-5 h-5"
          />
          <div className="text-[0.75rem] text-text-light dark:text-text-dark">
            <span className="font-bold">
              {Math.round(weather.tomorrow.tempHigh)}°
            </span>
            <span className="text-muted-light dark:text-muted-dark mx-0.5">/</span>
            <span className="text-muted-light dark:text-muted-dark">
              {Math.round(weather.tomorrow.tempLow)}°
            </span>
          </div>
          <div className="text-[0.65rem] text-muted-light dark:text-muted-dark capitalize">
            {weather.tomorrow.description}
          </div>
        </div>
      )}
    </div>
  );
}
