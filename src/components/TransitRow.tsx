import type { TransitRoute } from '../types';

interface Props {
  route: TransitRoute;
}

export function TransitRow({ route }: Props) {
  return (
    <div className="rounded-lg px-2 py-1 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark flex items-center justify-between gap-1.5">
      <div className="min-w-0">
        <div className="text-[0.85rem] font-bold text-text-light dark:text-text-dark leading-tight truncate">
          {route.routeName}
        </div>
        <div className="text-[0.6rem] text-muted-light dark:text-muted-dark">
          {route.direction} — {route.stopName}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        {route.error ? (
          <span className="text-[0.65rem] text-amber-500">{route.error}</span>
        ) : route.arrivals.length === 0 ? (
          <span className="text-[0.65rem] text-muted-light dark:text-muted-dark">
            No arrivals
          </span>
        ) : (
          <div className="flex gap-1.5 items-baseline">
            {route.arrivals.map((a, i) => (
              <span key={i} className="inline-flex items-baseline gap-0.5">
                {i > 0 && (
                  <span className="text-muted-light dark:text-muted-dark text-[0.6rem] mr-0.5">
                    ,
                  </span>
                )}
                <span
                  className={`font-bold tabular-nums ${
                    i === 0
                      ? 'text-[1rem] text-primary'
                      : 'text-[0.8rem] text-text-light dark:text-text-dark'
                  }`}
                >
                  {a.minutes}
                </span>
                <span className="text-[0.55rem] text-muted-light dark:text-muted-dark">
                  min
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
