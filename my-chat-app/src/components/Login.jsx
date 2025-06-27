"use client"

import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"
import { EncryptionContext } from "../context/EncryptionContext"
import "../styles/Login.css"

const Login = () => {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { setUser } = useContext(AuthContext)
  const { generateKeyPair } = useContext(EncryptionContext)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }
    if (!usernameRegex.test(username)) {
      setError("Username must be 3-20 alphanumeric characters")
      return
    }

    setIsLoading(true)
    setError("")

    const keyGenTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Key generation timed out")), 10000) // 10 seconds
    )

    try {
      const { publicKey } = await Promise.race([generateKeyPair(), keyGenTimeout])
      if (!publicKey) {
        throw new Error("Web Crypto API did not return a public key")
      }
      setUser({ username })
      navigate("/chat")
    } catch (error) {
      setError(`Failed to generate encryption keys: ${error.message}`)
      console.error("Key generation error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Secure Chat Application with End-to-End Encryption</h1>
        <p className="subtitle">Computer Networks Project - Spring'25</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Generating Keys..." : "Join Chat"}
          </button>
        </form>

        <div className="security-info">
          <p><b>Developed by:</b></p>
          <p>Amna Mansoor - 22K-5159</p>
          <p>Faiza Khan - 22K-5160</p>
        </div>
      </div>
    </div>
  )
}

export default Login
