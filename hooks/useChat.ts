"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface Message {
  id: string
  sender: string
  content: any // Support both string and hybrid encryption object
  encrypted: boolean
  timestamp: string
}

interface ChatData {
  messages: Message[]
  users: string[]
  publicKeys: Record<string, string>
}

export function useChat(username: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [publicKeys, setPublicKeys] = useState<Record<string, string>>({})
  const [isConnected, setIsConnected] = useState(false)

  const lastMessageTime = useRef(0)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  const pollMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/chat?since=${lastMessageTime.current}&username=${encodeURIComponent(username)}`,
      )
      if (response.ok) {
        const data: ChatData = await response.json()

        if (data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages])
          lastMessageTime.current = Math.max(...data.messages.map((m) => Number.parseInt(m.timestamp)))
        }

        setUsers(data.users)
        setPublicKeys(data.publicKeys)
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Polling error:", error)
      setIsConnected(false)
    }
  }, [username])

  const joinChat = useCallback(
    async (publicKey: string) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "join",
            username,
            publicKey,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
          setPublicKeys(data.publicKeys)
          setIsConnected(true)

          // Start polling
          lastMessageTime.current = Date.now()
          pollingInterval.current = setInterval(pollMessages, 1000) // Poll every second
        }
      } catch (error) {
        console.error("Join error:", error)
        setIsConnected(false)
      }
    },
    [username, pollMessages],
  )

  const sendMessage = useCallback(
    async (content: any, encrypted = false, messageId?: string) => {
      try {
        const message = {
          type: "message",
          id: messageId || Date.now().toString(),
          sender: username,
          content,
          encrypted,
          timestamp: Date.now().toString(),
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        })

        if (response.ok) {
          lastMessageTime.current = Number.parseInt(message.timestamp)
        }
      } catch (error) {
        console.error("Send message error:", error)
      }
    },
    [username],
  )

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [])

  return {
    messages,
    users,
    publicKeys,
    isConnected,
    joinChat,
    sendMessage,
  }
}
