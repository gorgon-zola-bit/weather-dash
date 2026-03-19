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
      <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2">
        {routes.map((r, i) => (
          <TransitRow key={i} route={r} />
        ))}
      </div>
    </div>
  );
}
