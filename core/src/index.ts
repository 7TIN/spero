import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { OVERPASS_URLS } from './config/overpass'
import { OverpassError, probeOverpass } from './services/overpass'
import { cacheStats } from './services/tile-cache'
import { hotzonesRoute } from './routes/hotzones'
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
    const body = {
      status: 'ok' as const,
      cache: 'sqlite' as const,
      tiles: cache.tiles,
      pois: cache.pois,
      overpass: OVERPASS_URLS,
    }

    // Only hit Overpass when explicitly asked, so health checks stay cheap.
    if (c.req.query('probe') !== '1') {
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

app.route('/api/hotzones', hotzonesRoute)
app.route('/api/pois', poisRoute)

app.onError((error, c) => {
  if (error instanceof OverpassError) {
    console.error(error.message)
    return c.json({ error: error.message }, 502)
  }

  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
