"use client"

import type React from "react"
import { useState } from "react"
import { ShieldIcon, PersonIcon, LockIcon, KeyIcon, ServerIcon } from "./icons"

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
                    style={{ width: "80px", height: "80px" }}
                  >
                    <ShieldIcon className="text-white" size={36} />
                  </div>
                  <h2 className="card-title fw-bold">Secure Chat</h2>
                  <p className="text-muted">End-to-end encrypted messaging</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
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

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 mb-4"
                    disabled={!username.trim() || isLoading}
                    style={{ backgroundColor: "#4285F4", borderColor: "#4285F4" }}
                  >
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

                <hr className="my-3" />

                <div className="mt-3">
                  <div className="d-flex align-items-center mb-2">
                    <LockIcon className="text-warning me-2" size={16} />
                    <small className="text-muted">Messages are encrypted end-to-end</small>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <KeyIcon className="text-warning me-2" size={16} />
                    <small className="text-muted">Keys are generated locally in your browser</small>
                  </div>
                  <div className="d-flex align-items-center">
                    <ServerIcon className="text-danger me-2" size={16} />
                    <small className="text-muted">No messages are stored on the server</small>
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
