import app from './index'

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  // Bun closes connections after 10 s of handler inactivity by default, which
  // cuts off a cold provider fetch before it can write a response. The browser
  // then reports "Failed to fetch" with an empty body.
  idleTimeout: 120,
  fetch: app.fetch,
})

console.log(`Spero API listening on http://localhost:${server.port}`)
