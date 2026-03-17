import { WeatherCard } from './components/WeatherCard';
import { TransitGrid } from './components/TransitGrid';
import { DarkModeToggle } from './components/DarkModeToggle';
import { useWeather } from './hooks/useWeather';
import { useTransit } from './hooks/useTransit';
import { useDarkMode } from './hooks/useDarkMode';

function App() {
  const { dark, toggle } = useDarkMode();
  const { weather, lastUpdated: weatherUpdated, isStale: weatherStale } = useWeather();
  const { routes, lastUpdated: transitUpdated, isStale: transitStale } = useTransit();

  return (
    <div className={`min-h-screen transition-colors ${dark ? 'bg-surface-dark' : 'bg-surface-light'}`}>
      <div className="max-w-[1280px] mx-auto px-4 py-5 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[1.1rem] font-semibold text-text-light dark:text-text-dark">
            SF Dashboard
          </h1>
          <DarkModeToggle dark={dark} toggle={toggle} />
        </div>

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
