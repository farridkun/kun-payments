import { Hono } from 'hono'

import payment from './route/payment'

const app = new Hono()

app.get('/', async (c) => {
  return c.text('Kun Payments - Midtrans Integration!')
})
app.route('/payment', payment)

export default { 
  port: 3023, 
  fetch: app.fetch,
} 
