import { WeatherCard } from './components/WeatherCard';
import { TransitGrid } from './components/TransitGrid';
import { useWeather } from './hooks/useWeather';
import { useTransit } from './hooks/useTransit';
import { useDarkMode } from './hooks/useDarkMode';

function App() {
  const { dark } = useDarkMode();
  const { weather, lastUpdated: weatherUpdated, isStale: weatherStale } = useWeather();
  const { routes, lastUpdated: transitUpdated, isStale: transitStale } = useTransit();

  return (
    <div className={`min-h-screen transition-colors ${dark ? 'bg-surface-dark' : 'bg-surface-light'}`}>
      <div className="max-w-[1280px] mx-auto px-4 py-2 flex flex-col gap-2">
        {/* Weather Section */}
        <WeatherCard
          weather={weather}
          lastUpdated={weatherUpdated}
          isStale={weatherStale}
        />

        {/* Transit Section */}
        <TransitGrid
          routes={routes}
          lastUpdated={transitUpdated}
          isStale={transitStale}
        />
      </div>
    </div>
  );
}

export default App;
