import { Server } from 'socket.io'
import { Logger } from './src/lib/logger'

const { createAdapter } = require('@socket.io/redis-adapter')
const { createClient } = require('redis')

let io: any

export const initSocket = async (server: any) => {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  })

  const pubClient = createClient({ url: 'redis://localhost:6379' })
  const subClient = pubClient.duplicate()

  await pubClient.connect()
  await subClient.connect()

  io.adapter(createAdapter(pubClient, subClient))

  io.on('connection', (socket: any) => {
    Logger('Socket connected', { socketId: socket.id })

    socket.on('joinRoom', (roomId: string) => {
      socket.join(roomId)
      Logger('Socket joined room', { roomId, socketId: socket.id })
    })
  })
}

export const getIO = () => io
