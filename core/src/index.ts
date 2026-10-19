import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from './db'
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
    await sql`SELECT 1`
    return c.json({ status: 'ok', database: 'up' })
  } catch (error) {
    console.error('Health check failed', error)
    return c.json({ status: 'error', database: 'down' }, 503)
  }
})

app.route('/api/hotzones', hotzonesRoute)
app.route('/api/pois', poisRoute)

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
