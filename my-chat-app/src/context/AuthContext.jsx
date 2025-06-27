"use client"

import { createContext, useState, useEffect } from "react"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("chatUser")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        console.log("Loaded user from localStorage:", parsedUser)
        setUser(parsedUser)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Error parsing stored user:", error)
      localStorage.removeItem("chatUser")
    }
  }, [])

  useEffect(() => {
    if (user) {
      console.log("Saving user to localStorage:", user)
      localStorage.setItem("chatUser", JSON.stringify(user))
      setIsAuthenticated(true)
    } else {
      localStorage.removeItem("chatUser")
      setIsAuthenticated(false)
    }
  }, [user])

  const logout = () => {
    console.log("Logging out user:", user)
    setUser(null)
    localStorage.removeItem("chatUser")
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
