"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const initSocket = async () => {
      // Initialize socket connection
      socketRef.current = io({
        path: "/api/socket",
        addTrailingSlash: false,
      })

      socketRef.current.on("connect", () => {
        console.log("Connected to server")
        setIsConnected(true)
      })

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from server")
        setIsConnected(false)
      })

      socketRef.current.on("connect_error", (error) => {
        console.error("Connection error:", error)
      })
    }

    initSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
  }
}
