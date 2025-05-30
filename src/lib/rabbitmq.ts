import { Logger } from "./logger"

const amqp = require('amqplib')

let channel: any

export const connectRabbitMQ = async () => {
  if (!channel) {
    const connection = await amqp.connect('amqp://localhost')
    channel = await connection.createChannel()
    await channel.assertQueue('m_callback')

    Logger('RabbitMQ connected and channel created')
  }
  return channel
}
