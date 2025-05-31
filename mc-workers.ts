import { Logger } from "./src/lib/logger"
import { connectToMongo } from "./src/lib/mongo"
import { broadcastToRoom } from "./src/lib/ws-broadcast"

const amqp = require('amqplib')

const startWorker = async () => {
  const connection = await amqp.connect('amqp://localhost')
  const channel = await connection.createChannel()
  await channel.assertQueue('m_callback')

  Logger('Worker connected to RabbitMQ and ready to process messages')

  channel.consume('m_callback', async (msg: any) => {
    if (msg !== null) {
      try {
        const body = JSON.parse(msg.content.toString())
        Logger('Worker received message', body?.transaction_id)

        const db = await connectToMongo()
        const transactionId = body.transaction_id

        const updateResult = await db.collection('transactions').updateOne(
          { transaction_id: transactionId },
          { $set: { transaction_status: 'Payment Accept', updated_at: new Date() } }
        )

        if (updateResult.modifiedCount === 0) {
          Logger('Worker: No transaction found to update', { transaction_id: transactionId })
        }

        await db.collection('notifications').insertOne({
          notification_type: 'midtrans_notification',
          notification_details: { ...body },
          created_at: new Date(),
          updated_at: new Date(),
        })


        Logger('Worker: Callback processed and saved', {
          transaction_id: transactionId,
        })

        if (transactionId) {
          broadcastToRoom(transactionId, {
            event: 'transaction_status',
            transaction_id: transactionId,
            status: 'Payment Accept',
          })
        }

        channel.ack(msg)
      } catch (error) {
        Logger('Worker error while processing message', { error })
        channel.nack(msg, false, false)
      }
    }
  })
}

startWorker().catch((err) => {
  Logger('Worker failed to start', err)
  process.exit(1)
})
