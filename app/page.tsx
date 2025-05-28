"use client"

import { useState, useEffect } from "react"
import Auth from "@/components/auth"
import Chat from "@/components/chat"

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize socket server
    fetch("/api/socket")

    const savedUsername = localStorage.getItem("chat-username")
    if (savedUsername) {
      setUsername(savedUsername)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (newUsername: string) => {
    console.log("Login with username:", newUsername)
    setUsername(newUsername)
    localStorage.setItem("chat-username", newUsername)
  }

  const handleLogout = () => {
    console.log("Logout called")
    setUsername(null)
    localStorage.removeItem("chat-username")
    // Force a page refresh to clear any cached state
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading secure chat...</p>
        </div>
      </div>
    )
  }

  return <>{username ? <Chat username={username} onLogout={handleLogout} /> : <Auth onLogin={handleLogin} />}</>
}
