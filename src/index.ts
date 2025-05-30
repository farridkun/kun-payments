import { Hono } from 'hono'

import { Logger } from './lib/logger'
import { connectRabbitMQ } from './lib/rabbitmq'

import payment from './route/payment'

const app = new Hono()

connectRabbitMQ().catch((err) => {
  Logger('Error connecting to RabbitMQ:', err)
})

app.get('/', async (c) => {
  return c.text('Kun Payments - Midtrans Integration!')
})
app.route('/payment', payment)

export default { 
  port: 3023, 
  fetch: app.fetch,
} 
