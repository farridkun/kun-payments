import { Hono } from 'hono'

import { connectToMongo } from '../lib/mongo'
import { CardDummy } from '../helper/dummyCard'
import { MidtransPayment } from '../lib/coreApi'
import { DummyPayment } from '../helper/dummyPayment'
import { Logger } from '../lib/logger'
import { connectRabbitMQ } from '../lib/rabbitmq'
import { broadcastToRoom } from '../lib/ws-broadcast'

const payment = new Hono()
const dbPayments = connectToMongo()
const channel = connectRabbitMQ()
const isDummy = true;

payment.get('/', (c) => {
  return c.text(`Kun Payments - ${process.env.MIDTRANS_MERCHANT_ID || 'No merchant set'}`)
})

payment.post('/getCardToken', async (c) => {
  const body = await c.req.json()

  let cardData;

  if (isDummy) {
    const dummyCard = CardDummy('visa')
    cardData = {
      card_number: dummyCard.card_number,
      card_cvv: dummyCard.card_cvv,
      card_exp_month: dummyCard.card_exp_month,
      card_exp_year: dummyCard.card_exp_year,
      client_key: process.env.MIDTRANS_CLIENT_KEY,
    }
  } else {
    if (!body.card_number || !body.card_cvv || !body.card_exp_month || !body.card_exp_year) {
      Logger('Missing card details', body)
      return c.json({ error: 'Missing card details' }, 400)
    }

    cardData = {
      card_number: body.card_number,
      card_cvv: body.card_cvv,
      card_exp_month: body.card_exp_month,
      card_exp_year: body.card_exp_year,
      client_key: process.env.MIDTRANS_CLIENT_KEY,
    }
  }

  try {
    const cardToken = await MidtransPayment.cardToken(cardData)

    return c.json({
      message: 'Card token retrieved successfully',
      data: cardToken,
    })
  } catch (error) {
    Logger('Failed to get card token', error)
    return c.json({ error: 'Failed to get card token' }, 500)
  }
})

payment.post('/charge', async (c) => {
  const body = await c.req.json()

  if (!body.payment_type) {
    Logger('Payment type is required', body)
    return c.json({ error: 'Payment type is required' }, 400)
  }

  let payload;

  if (body?.gross_amount) {
    payload = {
      transaction_details: {
        order_id: `order-id-${Math.random().toString(36).substring(2, 6)}`,
        gross_amount: body.gross_amount,
      },
      bank_transfer: {
        bank: body.bank || 'permata',
      },
      payment_type: 'bank_transfer',
      customer_details: {
        first_name: 'Farrid',
        last_name: 'Kuntoro',
        email: 'farridpastikaya@gmail.com',
        phone: '08979829907',
        customer_details_required_fields: ['email', 'first_name', 'phone'],
      },
      custom_expiry: { expiry_duration: 60, unit: 'minute' },
      metadata: { you: 'can', put: 'any', parameter: 'you like' },
    }
  } else {
    payload = DummyPayment(
      body?.payment_type,
      body?.bank ? body?.bank : undefined
    )
  }
  
  try {
    const chargeResponse = await MidtransPayment.charge(payload)

    if (chargeResponse.status_code !== '201') {
      return c.json({ error: 'Payment failed', details: chargeResponse }, 400)
    }

    const db = await dbPayments
    const paymentData = {
      payment_type: body.payment_type,
      order_id: chargeResponse.order_id,
      transaction_id: chargeResponse.transaction_id,
      transaction_status: chargeResponse.transaction_status,
      gross_amount: chargeResponse.gross_amount.replaceAll('.', '').toString(),
      expiry_time: chargeResponse.expiry_time,
      created_at: new Date(),
      updated_at: new Date(),
      ...body?.payment_type === 'bank_transfer' && {
        va_number: chargeResponse?.permata_va_number || chargeResponse?.va_numbers?.[0]?.va_number,
        bank: chargeResponse?.va_numbers?.[0]?.bank || 'Permata VA',
      }
    }

    await db.collection('transactions').insertOne(paymentData)
    Logger('Transaction was records', paymentData.order_id)

    if (paymentData.transaction_id) {
      broadcastToRoom(paymentData.transaction_id, {
        event: 'transaction_status',
        transaction_id: paymentData.transaction_id,
        status: paymentData.transaction_status,
      })
    }

    return c.json({
      message: 'Payment processed successfully',
      data: chargeResponse,
    })
  } catch (error) {
    Logger('Failed to process payment', error)
    return c.json({ error: 'Failed to process payment' }, 500)
  }
})

payment.post('/callback', async (c) => {
  const cb = await c.req.json()
  const body = cb?.data || cb

  if (!body || !body.transaction_id) {
    Logger('Invalid callback data', body)
    return c.json({ error: 'Invalid callback data' }, 400)
  }

  if (body.transaction_status !== 'capture' && body.transaction_status !== 'settlement') {
    Logger('Transaction status is not capture or settlement', { order_id:body.order_id ,transaction_status: body.transaction_status })
    return c.json({ error: 'Transaction status is not capture or settlement' }, 400)
  }

  try {
    const payload = JSON.stringify(body)
    const resolvedChannel = await channel
    resolvedChannel.sendToQueue('m_callback', Buffer.from(payload))
    Logger('Message pushed to RabbitMQ', body.transaction_id)

    if (body.transaction_id) {
      broadcastToRoom(body.transaction_id, {
        event: 'transaction_status',
        transaction_id: body.transaction_id,
        status: 'Payment Accept',
      })
    }
  } catch (error) {
    Logger('Failed to send message to RabbitMQ', { error, body })
    return c.json({ error: 'Failed to push message to queue' }, 500)
  }

  return c.json({ message: 'Callback received and queued', data: body.transaction_id })
})

payment.get('/transactionData', async (c) => {
  const transactionId = c.req.query('transaction_id')

  if (!transactionId) {
    Logger('Transaction ID is required', { transactionId })
    return c.json({ error: 'Transaction ID is required' }, 400)
  }

  try {
    const db = await dbPayments
    const transaction = await db.collection('transactions').findOne({ transaction_id: transactionId })

    if (!transaction) {
      Logger('Transaction not found', { transactionId })
      return c.json({ error: 'Transaction not found' }, 404)
    }

    return c.json({
      message: 'Transaction data retrieved successfully',
      data: transaction,
    })
  } catch (error) {
    Logger('Failed to retrieve transaction data', error)
    return c.json({ error: 'Failed to retrieve transaction data' }, 500)
  }
})

export default payment
