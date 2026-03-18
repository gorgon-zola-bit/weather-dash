import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

const TRANSIT_API_KEY = '3ca48652-5b64-47fe-b4e4-15ef24009429';

function transitApiPlugin(): Plugin {
  return {
    name: 'transit-api',
    configureServer(server) {
      server.middlewares.use('/api/transit', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const stopId = url.searchParams.get('stopId');
        if (!stopId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing stopId' }));
          return;
        }

        try {
          const apiUrl =
            `https://api.511.org/transit/StopMonitoring` +
            `?api_key=${TRANSIT_API_KEY}` +
            `&agency=SF` +
            `&stopCode=${stopId}` +
            `&format=json`;

          const apiRes = await fetch(apiUrl);
          if (!apiRes.ok) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `511 API error: ${apiRes.status}` }));
            return;
          }

          let text = await apiRes.text();
          // 511.org sometimes prepends a BOM character
          if (text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
          }
          const data = JSON.parse(text);

          // StopMonitoringDelivery can be an array or a single object
          const delivery = data?.ServiceDelivery?.StopMonitoringDelivery;
          let visits: unknown[] = [];
          if (Array.isArray(delivery)) {
            visits = delivery[0]?.MonitoredStopVisit ?? [];
          } else if (delivery && typeof delivery === 'object') {
            visits = (delivery as Record<string, unknown>).MonitoredStopVisit as unknown[] ?? [];
          }

          const arrivals = (visits as Record<string, unknown>[])
            .map((visit) => {
              const mvj = visit.MonitoredVehicleJourney as Record<string, unknown> | undefined;
              const call = mvj?.MonitoredCall as Record<string, unknown> | undefined;
              if (!call) return null;
              const expected =
                (call.ExpectedArrivalTime as string) ||
                (call.ExpectedDepartureTime as string) ||
                (call.AimedArrivalTime as string);
              if (!expected) return null;
              const mins = Math.max(
                0,
                Math.round((new Date(expected).getTime() - Date.now()) / 60000)
              );
              return { minutes: mins };
            })
            .filter(Boolean)
            .sort((a: { minutes: number } | null, b: { minutes: number } | null) =>
              a!.minutes - b!.minutes
            )
            .slice(0, 3);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ arrivals }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Transit fetch failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), transitApiPlugin()],
  base: '/weather-dash/',
})
