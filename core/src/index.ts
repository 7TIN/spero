import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { OVERPASS_URLS } from './config/overpass'
import { POI_PROVIDER } from './config/poi'
import { GeoapifyError } from './services/geoapify'
import { OverpassError, probeOverpass } from './services/overpass'
import { cacheStats, geoapifyCreditsToday } from './services/tile-cache'
import { geocodeRoute } from './routes/geocode'
import { hotzonesRoute } from './routes/hotzones'
import { placesRoute } from './routes/places'
import { poisRoute } from './routes/pois'

const allowedOrigins = (Bun.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = new Hono()

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'OPTIONS'],
  }),
)

app.get('/', (c) => {
  return c.json({ name: 'Spero API', status: 'ok' })
})

app.get('/health', async (c) => {
  try {
    const cache = cacheStats()
    const credits = geoapifyCreditsToday()
    const body = {
      status: 'ok' as const,
      cache: 'sqlite' as const,
      provider: POI_PROVIDER,
      tiles: cache.tiles,
      pois: cache.pois,
      competitorTiles: cache.competitorTiles,
      competitors: cache.competitors,
      geoapifyCredits: credits,
      overpass: OVERPASS_URLS,
    }

    // Only hit Overpass when explicitly asked, so health checks stay cheap.
    // Geoapify refreshes are already cached, so there is nothing to probe.
    if (c.req.query('probe') !== '1' || POI_PROVIDER !== 'overpass') {
      return c.json(body)
    }

    const reachable = await probeOverpass()
    if (!reachable) {
      return c.json({ ...body, status: 'error' as const, overpassReachable: false }, 503)
    }

    return c.json({ ...body, overpassReachable: true })
  } catch (error) {
    console.error('Health check failed', error)
    return c.json({ status: 'error', cache: 'sqlite' }, 503)
  }
})

app.route('/api/geocode', geocodeRoute)
app.route('/api/hotzones', hotzonesRoute)
app.route('/api/pois', poisRoute)
app.route('/api/places', placesRoute)

app.onError((error, c) => {
  if (error instanceof OverpassError || error instanceof GeoapifyError) {
    console.error(error.message)
    return c.json({ error: error.message }, 502)
  }

  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

export default {
  // Bun closes connections after 10 s of handler inactivity by default, which
  // cuts off a cold provider fetch before it can write a response. The browser
  // then reports "Failed to fetch" with an empty body.
  idleTimeout: 120,
  fetch: app.fetch,
}
