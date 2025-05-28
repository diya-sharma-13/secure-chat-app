import { type NextRequest, NextResponse } from "next/server"

// In-memory storage (in production, use Redis or a database)
let messages: Array<{
  id: string
  sender: string
  content: string | { [username: string]: any } // Support both plain text and per-user encryption
  encrypted: boolean
  timestamp: string
}> = []

const users: Map<string, { publicKey: string; lastSeen: number }> = new Map()

// Clean up inactive users (older than 30 seconds)
function cleanupUsers() {
  const now = Date.now()
  for (const [username, user] of users.entries()) {
    if (now - user.lastSeen > 30000) {
      users.delete(username)
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get("since")
  const username = searchParams.get("username")

  // Update user's last seen
  if (username) {
    const existingUser = users.get(username)
    if (existingUser) {
      users.set(username, { ...existingUser, lastSeen: Date.now() })
    }
  }

  cleanupUsers()

  // Filter messages since the given timestamp
  const sinceTime = since ? Number.parseInt(since) : 0
  const recentMessages = messages
    .filter((msg) => Number.parseInt(msg.timestamp) > sinceTime)
    .map((msg) => {
      // If message is encrypted and has per-user content, return only the content for this user
      if (msg.encrypted && typeof msg.content === "object" && username) {
        const userContent = msg.content[username]
        if (userContent) {
          return {
            ...msg,
            content: userContent,
          }
        }
        // If no content for this user, return a placeholder
        return {
          ...msg,
          content: "Encrypted message",
        }
      }
      return msg
    })

  return NextResponse.json({
    messages: recentMessages,
    users: Array.from(users.keys()),
    publicKeys: Object.fromEntries(Array.from(users.entries()).map(([name, data]) => [name, data.publicKey])),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.type === "join") {
    // User joining
    users.set(body.username, {
      publicKey: body.publicKey,
      lastSeen: Date.now(),
    })

    return NextResponse.json({
      success: true,
      users: Array.from(users.keys()),
      publicKeys: Object.fromEntries(
        Array.from(users.entries())
          .filter(([name]) => name !== body.username)
          .map(([name, data]) => [name, data.publicKey]),
      ),
    })
  }

  if (body.type === "message") {
    // New message
    const message = {
      id: body.id,
      sender: body.sender,
      content: body.content, // This can be a string or object with per-user encrypted content
      encrypted: body.encrypted || false,
      timestamp: body.timestamp,
    }

    messages.push(message)

    // Keep only last 200 messages (increased from 100 to handle longer conversations)
    if (messages.length > 200) {
      messages = messages.slice(-200)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
