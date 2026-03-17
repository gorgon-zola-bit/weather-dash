import type { TransitRoute } from '../types';
import { TransitRow } from './TransitRow';

interface Props {
  routes: TransitRoute[];
  lastUpdated: Date | null;
  isStale: boolean;
}

export function TransitGrid({ routes, lastUpdated, isStale }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[1.4rem] font-semibold text-text-light dark:text-text-dark">
          SF Muni — Next Arrivals
        </h2>
        <div className="text-[0.7rem] text-muted-light dark:text-muted-dark">
          {isStale && (
            <span className="text-amber-500 mr-2">Stale data</span>
          )}
          {lastUpdated && <>Updated {lastUpdated.toLocaleTimeString()}</>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {routes.map((r, i) => (
          <TransitRow key={i} route={r} />
        ))}
      </div>
    </div>
  );
}
