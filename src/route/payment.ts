import { Hono } from 'hono'

import { connectToMongo } from '../lib/mongo'
import { CardDummy } from '../helper/dummyCard'
import { MidtransPayment } from '../lib/coreApi'
import { DummyPayment } from '../helper/dummyPayment'
import { Logger } from '../lib/logger'

const payment = new Hono()
const dbPayments = connectToMongo()
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
  console.log("🚀 ~ payment.post ~ body:", body)

  if (!body.payment_type) {
    Logger('Payment type is required', body)
    return c.json({ error: 'Payment type is required' }, 400)
  }
  
  try {
    const chargeResponse = await MidtransPayment.charge(DummyPayment(
      body?.payment_type,
      body?.bank ? body?.bank : undefined
    ))

    if (chargeResponse.status_code !== '201') {
      return c.json({ error: 'Payment failed', details: chargeResponse }, 400)
    }

    const db = await dbPayments
    const paymentData = {
      payment_type: body.payment_type,
      order_id: chargeResponse.order_id,
      transaction_id: chargeResponse.transaction_id,
      transaction_status: chargeResponse.transaction_status,
      gross_amount: chargeResponse.gross_amount,
      expiry_time: chargeResponse.expiry_time,
      created_at: new Date(),
      updated_at: new Date(),
      ...body?.payment_type === 'bank_transfer' && {
        va_number: chargeResponse?.permata_va_number || chargeResponse?.va_numbers?.[0]?.va_number,
        bank: chargeResponse?.va_numbers?.[0]?.bank || 'Permata VA',
      }
    }

    await db.collection('transactions').insertOne(paymentData)
    Logger('Transaction was records', paymentData)

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
  Logger('Callback received', body)

  if (!body || !body.transaction_id) {
    Logger('Invalid callback data', body)
    return c.json({ error: 'Invalid callback data' }, 400)
  }

  if (body.transaction_status !== 'capture' && body.transaction_status !== 'settlement') {
    Logger('Transaction status is not capture or settlement', body)
    return c.json({ error: 'Transaction status is not capture or settlement' }, 400)
  }

  const db = await dbPayments
  const transactionId = body.transaction_id
  const updateResult = await db.collection('transactions').updateOne(
    { transaction_id: transactionId },
    { $set: { transaction_status: 'Payment Accept', updated_at: new Date() } }
  )

  if (updateResult.modifiedCount === 0) {
    Logger('No transaction found to update', { transaction_id: transactionId })
    return c.json({ error: 'No transaction found to update' }, 404)
  }

  await db.collection('notifications').insertOne({
    notification_type: 'midtrans_notification',
    notification_details: {
      ...body,
    },
    created_at: new Date(),
    updated_at: new Date(),
  })
  Logger('Callback processed and saved', { transaction_id: transactionId, notification_type: body.notification_type })

  return c.json({ message: 'Callback request received', data: body })
})

export default payment
