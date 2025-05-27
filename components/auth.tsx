"use client"

import type React from "react"
import { useState } from "react"
import { ShieldIcon, PersonIcon } from "./icons"

interface AuthProps {
  onLogin: (username: string) => void
}

export default function Auth({ onLogin }: AuthProps) {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    // Simulate brief loading for better UX
    await new Promise((resolve) => setTimeout(resolve, 500))
    onLogin(username.trim())
    setIsLoading(false)
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <ShieldIcon className="text-white" size={24} />
                  </div>
                  <h2 className="card-title fw-bold">Secure Chat</h2>
                  <p className="text-muted">End-to-end encrypted messaging</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label fw-medium">
                      Username
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <PersonIcon size={16} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-100 py-2" disabled={!username.trim() || isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Joining...
                      </>
                    ) : (
                      "Join Chat"
                    )}
                  </button>
                </form>

                <div className="mt-4">
                  <div className="border-top pt-3">
                    <small className="text-muted d-block mb-1">🔒 Messages are encrypted end-to-end</small>
                    <small className="text-muted d-block mb-1">🔑 Keys are generated locally in your browser</small>
                    <small className="text-muted d-block">🛡️ No messages are stored on the server</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
