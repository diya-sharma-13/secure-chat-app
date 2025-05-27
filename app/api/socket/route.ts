import type { NextRequest } from "next/server"
import { Server as NetServer } from "http"
import { Server as SocketIOServer } from "socket.io"

export const dynamic = "force-dynamic"

// Store for active users and their public keys
const activeUsers = new Map<string, { socketId: string; publicKey: string }>()

let io: SocketIOServer

// Initialize Socket.io server
function initSocket(server: NetServer) {
  if (!io) {
    io = new SocketIOServer(server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      // Handle user joining
      socket.on("join", ({ username, publicKey }) => {
        activeUsers.set(username, { socketId: socket.id, publicKey })
        socket.join("chat-room")

        // Broadcast updated user list
        io.to("chat-room").emit("users-updated", Array.from(activeUsers.keys()))

        // Send public keys to new user
        const publicKeys: Record<string, string> = {}
        activeUsers.forEach((user, name) => {
          if (name !== username) {
            publicKeys[name] = user.publicKey
          }
        })
        socket.emit("public-keys", publicKeys)

        // Broadcast new user's public key to others
        socket.to("chat-room").emit("new-user-key", { username, publicKey })
      })

      // Handle encrypted messages
      socket.on("encrypted-message", (data) => {
        socket.to("chat-room").emit("encrypted-message", data)
      })

      // Handle disconnection
      socket.on("disconnect", () => {
        let disconnectedUser = ""
        activeUsers.forEach((user, username) => {
          if (user.socketId === socket.id) {
            disconnectedUser = username
            activeUsers.delete(username)
          }
        })

        if (disconnectedUser) {
          io.to("chat-room").emit("users-updated", Array.from(activeUsers.keys()))
          io.to("chat-room").emit("user-left", disconnectedUser)
        }
      })
    })
  }
}

export async function GET(req: NextRequest) {
  if (!(global as any).socketServer) {
    const server = new NetServer()
    initSocket(server)
    ;(global as any).socketServer = server
  }

  return new Response("Socket.io server initialized", { status: 200 })
}
