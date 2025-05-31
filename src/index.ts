import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'

import payment from './route/payment'
import { addSocketToRoom, removeSocketFromAllRooms } from './lib/ws-broadcast'

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()

const app = new Hono()

app.use('*', cors({ origin: '*' }))

app.get('/', async (c) => {
  return c.text('Kun Payments - Midtrans Integration!')
})
app.route('/payment', payment)
app.get(
  '/ws',
  upgradeWebSocket(() => {
    return {
      onMessage(event: any, ws: any) {
        // Expect: { join: transaction_id }
        try {
          const msg = JSON.parse(event.data)
          if (msg.join) {
            addSocketToRoom(msg.join, ws)
            ws.send(JSON.stringify({ joined: msg.join }))
          }
        } catch {}
      },
      onClose(ws: any) {
        removeSocketFromAllRooms(ws)
      },
    }
  })
)

export default { 
  port: 3023, 
  fetch: app.fetch,
  websocket
}