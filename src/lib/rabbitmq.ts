import { Logger } from "./logger"

const amqp = require('amqplib')

let channel: any

export const connectRabbitMQ = async () => {
  if (!channel) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672')
    channel = await connection.createChannel()
    await channel.assertQueue('m_callback')

    Logger('RabbitMQ connected and channel created')
  }
  return channel
}
