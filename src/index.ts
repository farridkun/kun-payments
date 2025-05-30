import { Hono } from 'hono'
import { createServer } from 'http'

import payment from './route/payment.js'
// import { initSocket } from '../mc-socket.js'

const app = new Hono()
app.get('/', (c) => c.text('Kun Payments - Midtrans Integration!'))
app.route('/payment', payment)

const server = createServer(app.fetch)

// initSocket(server)

server.listen(3023, () => {
  console.log('Kun Payments running at Port 3023')
})
