"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useChat } from "@/hooks/useChat"
import { SimpleCrypto } from "@/lib/crypto"
import { ShieldIcon, PeopleIcon, LogoutIcon, MenuIcon, SendIcon, LockIcon, ExclamationIcon } from "./icons"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  isEncrypted: boolean
  isError?: boolean
}

interface ChatProps {
  username: string
  onLogout: () => void
}

export default function Chat({ username, onLogout }: ChatProps) {
  const [displayMessages, setDisplayMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoReady, setCryptoReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  const { messages, users, publicKeys, isConnected, joinChat, sendMessage } = useChat(username)
  const crypto = useRef(new SimpleCrypto())
  const publicKeyCache = useRef<Map<string, CryptoKey>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())

  // Initialize crypto and join chat
  useEffect(() => {
    const initializeCrypto = async () => {
      try {
        setError(null)
        console.log("Initializing crypto...")
        await crypto.current.generateKeyPair()
        const publicKey = await crypto.current.exportPublicKey()

        console.log("Joining chat...")
        await joinChat(publicKey)
        setCryptoReady(true)

        // Add welcome message
        setDisplayMessages([
          {
            id: "welcome",
            sender: "System",
            content:
              "🔐 End-to-end encryption enabled. Your messages are secure!\n✅ Now supports up to 1000 characters per message\n✅ Hybrid AES+RSA encryption for long messages",
            timestamp: new Date(),
            isEncrypted: false,
          },
        ])
      } catch (error) {
        console.error("Failed to initialize:", error)
        setError("Failed to initialize encryption. Please refresh the page.")
        setDisplayMessages([
          {
            id: "error",
            sender: "System",
            content: "❌ Failed to initialize encryption. Please refresh the page.",
            timestamp: new Date(),
            isEncrypted: false,
            isError: true,
          },
        ])
      }
    }

    initializeCrypto()
  }, [username, joinChat])

  // Import public keys when they change
  useEffect(() => {
    const importKeys = async () => {
      for (const [user, keyB64] of Object.entries(publicKeys)) {
        if (!publicKeyCache.current.has(user)) {
          try {
            const publicKey = await crypto.current.importPublicKey(keyB64)
            publicKeyCache.current.set(user, publicKey)
            console.log(`Imported public key for ${user}`)
          } catch (error) {
            console.error(`Failed to import public key for ${user}:`, error)
          }
        }
      }
    }

    importKeys()
  }, [publicKeys])

  // Process incoming messages
  useEffect(() => {
    const processMessages = async () => {
      const newDisplayMessages: Message[] = []

      for (const msg of messages) {
        // Skip if we already processed this message
        if (processedMessageIds.current.has(msg.id)) continue

        try {
          let content = msg.content
          let isEncrypted = msg.encrypted

          // Only decrypt messages from other users
          if (msg.encrypted && msg.sender !== username) {
            try {
              // Handle new format with per-user encryption
              if (typeof msg.content === "object" && msg.content.encryptedMessage) {
                content = await crypto.current.decryptMessage(
                  msg.content.encryptedMessage,
                  msg.content.encryptedKey,
                  msg.content.iv,
                )
              }
              // Handle legacy format (direct string)
              else if (typeof msg.content === "string") {
                // Try to parse as JSON first (new format)
                try {
                  const parsed = JSON.parse(msg.content)
                  if (parsed.encryptedMessage && parsed.encryptedKey && parsed.iv) {
                    content = await crypto.current.decryptMessage(
                      parsed.encryptedMessage,
                      parsed.encryptedKey,
                      parsed.iv,
                    )
                  } else {
                    // Old format - direct RSA decryption
                    content = await crypto.current.decryptMessage(msg.content, "", "")
                  }
                } catch (parseError) {
                  // If not JSON, treat as old format
                  content = await crypto.current.decryptMessage(msg.content, "", "")
                }
              }
              console.log(`Decrypted message from ${msg.sender}`)
            } catch (error) {
              console.error("Failed to decrypt message:", error)
              content = "❌ Failed to decrypt message"
              isEncrypted = false
            }
          }

          // For our own encrypted messages, skip them (we handle them locally)
          if (msg.sender === username && msg.encrypted) {
            processedMessageIds.current.add(msg.id)
            continue
          }

          newDisplayMessages.push({
            id: msg.id,
            sender: msg.sender,
            content,
            timestamp: new Date(Number.parseInt(msg.timestamp)),
            isEncrypted,
          })

          processedMessageIds.current.add(msg.id)
        } catch (error) {
          console.error("Error processing message:", error)
        }
      }

      if (newDisplayMessages.length > 0) {
        setDisplayMessages((prev) => [...prev, ...newDisplayMessages])
      }
    }

    processMessages()
  }, [messages, username])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !cryptoReady) return

    setIsLoading(true)
    try {
      // Generate unique message ID
      const messageId = `${username}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Get other users (excluding ourselves)
      const otherUsers = users.filter((user) => user !== username)

      let messageContent: string | { [username: string]: any } = newMessage
      let isEncrypted = false

      // If there are other users and we have their keys, encrypt the message
      if (otherUsers.length > 0) {
        try {
          // Validate message length (1000 characters max)
          if (newMessage.length > 1000) {
            throw new Error("Message too long (max 1000 characters)")
          }

          // Get public keys for other users
          const otherUserKeys = new Map<string, CryptoKey>()
          for (const user of otherUsers) {
            const key = publicKeyCache.current.get(user)
            if (key) {
              otherUserKeys.set(user, key)
            }
          }

          if (otherUserKeys.size > 0) {
            // Encrypt for all other users using hybrid encryption (supports 1000 chars)
            const encryptedForUsers = await crypto.current.encryptMessageForMultipleUsers(newMessage, otherUserKeys)

            if (Object.keys(encryptedForUsers).length > 0) {
              messageContent = encryptedForUsers
              isEncrypted = true
              console.log(
                `Encrypted ${newMessage.length} character message for ${Object.keys(encryptedForUsers).length} users`,
              )
            }
          }
        } catch (error) {
          console.error("Encryption failed:", error)
          setError("Message too long (max 1000 characters) or encryption failed.")
          setTimeout(() => setError(null), 3000)
          setIsLoading(false)
          return
        }
      }

      // Add message to local display FIRST (with original content)
      const localMessage: Message = {
        id: messageId,
        sender: username,
        content: newMessage, // Always show original content for sender
        timestamp: new Date(),
        isEncrypted,
      }

      setDisplayMessages((prev) => [...prev, localMessage])
      processedMessageIds.current.add(messageId)

      // Then send to server
      await sendMessage(messageContent, isEncrypted, messageId)
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    console.log("Logout clicked")
    // Clear any stored data
    localStorage.removeItem("chat-username")
    // Call the parent logout function
    onLogout()
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  const closeSidebar = () => {
    setShowSidebar(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const characterCount = newMessage.length
  const maxLength = 1000
  const isNearLimit = characterCount > 800

  return (
    <div className="vh-100 d-flex flex-column position-relative">
      {/* Mobile Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary d-lg-none">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <ShieldIcon className="me-2" size={20} />
            Secure Chat
          </span>
          <button className="btn btn-outline-light" type="button" onClick={toggleSidebar}>
            <PeopleIcon size={16} />
            <span className="ms-1">({users.length})</span>
          </button>
        </div>
      </nav>

      <div className="flex-grow-1 d-flex overflow-hidden position-relative">
        {/* Sidebar */}
        <div
          className={`bg-white border-end position-relative ${
            showSidebar ? "d-block position-fixed position-lg-relative" : "d-none d-lg-block"
          }`}
          style={{
            width: "280px",
            minWidth: "280px",
            height: showSidebar ? "100%" : "auto",
            top: showSidebar ? "0" : "auto",
            left: showSidebar ? "0" : "auto",
            zIndex: showSidebar ? 1050 : "auto",
          }}
        >
          {/* Mobile close button */}
          <div className="d-lg-none d-flex justify-content-end p-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={closeSidebar}>
              ✕
            </button>
          </div>

          <div className="p-3 border-bottom">
            <div className="d-flex align-items-center mb-3">
              <ShieldIcon className="text-primary me-2" size={20} />
              <h5 className="mb-0 fw-bold">Secure Chat</h5>
            </div>

            <div className="d-flex flex-column gap-1">
              <div className="d-flex align-items-center">
                <div
                  className={`rounded-circle me-2 ${isConnected ? "bg-success" : "bg-danger"}`}
                  style={{ width: "8px", height: "8px" }}
                ></div>
                <small className="text-muted">{isConnected ? "Connected" : "Disconnected"}</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  className={`rounded-circle me-2 ${cryptoReady ? "bg-success" : "bg-warning"}`}
                  style={{ width: "8px", height: "8px" }}
                ></div>
                <small className="text-muted">{cryptoReady ? "Encrypted (1000 chars)" : "Setting up..."}</small>
              </div>
            </div>
          </div>

          <div className="p-3 flex-grow-1">
            <div className="d-flex align-items-center mb-3">
              <PeopleIcon className="text-muted me-2" size={16} />
              <span className="fw-medium">Online ({users.length})</span>
            </div>

            <div className="list-group list-group-flush">
              {users.map((user) => (
                <div key={user} className="list-group-item border-0 px-0 py-2">
                  <div className="d-flex align-items-center">
                    <div className="bg-success rounded-circle me-2" style={{ width: "8px", height: "8px" }}></div>
                    <span className={user === username ? "fw-bold text-primary" : "text-dark"}>
                      {user} {user === username && "(you)"}
                    </span>
                    {publicKeyCache.current.has(user) && user !== username && (
                      <LockIcon className="ms-auto text-success" size={12} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button onClick={handleLogout} className="btn btn-outline-danger btn-sm w-100">
                <LogoutIcon className="me-2" size={14} />
                Logout
              </button>
            </div>
          </div>

        {/* Main Chat Area */}
        <div className="flex-grow-1 d-flex flex-column">
          {/* Chat Header */}
          <div className="bg-white border-bottom p-3">
            <div className="d-flex align-items-center justify-content-between">
              <button className="btn btn-link d-lg-none p-0 text-dark" onClick={toggleSidebar}>
                <MenuIcon size={24} />
              </button>
              <h5 className="mb-0 fw-bold d-none d-lg-block">Chat Room</h5>
              <span className="badge bg-secondary">
                <LockIcon className="me-1" size={12} />
                1000 Chars • End-to-End Encrypted
              </span>
            </div>

            {error && (
              <div className="alert alert-warning alert-dismissible fade show mt-2 mb-0" role="alert">
                <ExclamationIcon className="me-2" size={16} />
                {error}
                <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: "#f8f9fa" }}>
            <div className="d-flex flex-column gap-3">
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`d-flex ${message.sender === username ? "justify-content-end" : "justify-content-start"}`}
                >
                  <div
                    className={`card border-0 shadow-sm ${
                      message.sender === username
                        ? "bg-primary text-white"
                        : message.sender === "System"
                          ? message.isError
                            ? "bg-danger text-white"
                            : "bg-light text-dark"
                          : "bg-white text-dark"
                    }`}
                    style={{ maxWidth: "75%" }}
                  >
                    <div className="card-body p-3">
                      {message.sender !== username && message.sender !== "System" && (
                        <div className="small opacity-75 mb-1">{message.sender}</div>
                      )}
                      <div className="mb-1" style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                        {message.content}
                      </div>
                      <div className="d-flex align-items-center justify-content-end">
                        <small className="opacity-75 me-1">{formatTime(message.timestamp)}</small>
                        {message.isEncrypted && <LockIcon size={12} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white border-top p-3">
            <form onSubmit={handleSendMessage}>
              <div className="mb-2">
                <textarea
                  className="form-control"
                  placeholder={
                    cryptoReady ? "Type your message (up to 1000 characters)..." : "Setting up encryption..."
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!cryptoReady || isLoading}
                  maxLength={maxLength}
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-primary me-2"
                    type="submit"
                    disabled={!newMessage.trim() || !cryptoReady || isLoading}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <>
                        <SendIcon size={16} className="me-1" />
                        Send
                      </>
                    )}
                  </button>
                  <small className="text-muted d-flex align-items-center">
                    <LockIcon className="me-1" size={12} />
                    End-to-end encrypted • {users.length} user(s) online
                  </small>
                </div>
                <small className={`text-muted ${isNearLimit ? "text-warning fw-bold" : ""}`}>
                  {characterCount}/{maxLength}
                </small>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
