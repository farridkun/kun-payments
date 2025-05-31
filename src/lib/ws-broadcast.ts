import type { ServerWebSocket } from 'bun'

const wsRooms = new Map<string, Set<ServerWebSocket>>()

export function broadcastToRoom(transactionId: string, data: any) {
  const sockets = wsRooms.get(transactionId)
  if (sockets) {
    for (const ws of sockets) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(data))
      }
    }
  }
}

export function addSocketToRoom(transactionId: string, ws: ServerWebSocket) {
  if (!wsRooms.has(transactionId)) wsRooms.set(transactionId, new Set())
  wsRooms.get(transactionId)!.add(ws)
}

export function removeSocketFromAllRooms(ws: ServerWebSocket) {
  for (const set of wsRooms.values()) set.delete(ws)
}
