"use client"

import { createContext, useState, useCallback, useRef, useEffect } from "react"

export const EncryptionContext = createContext()

export const EncryptionProvider = ({ children }) => {
  const [keyPair, setKeyPair] = useState(null)
  const [publicKey, setPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const sessionKeysRef = useRef({})
  const pendingKeyExchanges = useRef({})

  const generateKeyPair = useCallback(async () => {
    try {
      console.log("Generating key pair...")
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      )

      const publicKeySpki = await crypto.subtle.exportKey("spki", keyPair.publicKey)
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeySpki)))
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`

      const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(privateKeyPkcs8)))}\n-----END PRIVATE KEY-----`

      setKeyPair(keyPair)
      setPublicKey(publicKeyPem)
      setPrivateKey(privateKeyPem)
      console.log("Key pair generated, public key:", publicKeyPem.substring(0, 50) + "...")
      return { publicKey: publicKeyPem, privateKey: privateKeyPem }
    } catch (error) {
      console.error("Key generation failed:", error)
      throw new Error(`Key generation failed: ${error.message}`)
    }
  }, [])

  const exchangeKeys = useCallback((socket, username, userPublicKey) => {
    if (!socket || !username || !userPublicKey) {
      console.error("exchangeKeys: Invalid parameters", { socket: !!socket, username, userPublicKey: !!userPublicKey })
      return
    }
    console.log("Initiating key exchange with:", username)
    socket.emit("key_exchange", { to: username })
    pendingKeyExchanges.current[username] = { socket, userPublicKey }
  }, [])

  const receiveSessionKey = useCallback(async (encryptedSessionKey, fromUser, socket) => {
    if (!encryptedSessionKey) {
      console.error("receiveSessionKey: Missing encryptedSessionKey", { fromUser })
      return false
    }
    if (!keyPair?.privateKey) {
      console.warn("receiveSessionKey: Private key not ready, queuing", { fromUser })
      pendingKeyExchanges.current[fromUser] = { socket, encryptedSessionKey }
      return false
    }

    try {
      console.log("Processing session key from:", fromUser, "key:", encryptedSessionKey.substring(0, 50) + "...")
      const encryptedKey = Uint8Array.from(atob(encryptedSessionKey), c => c.charCodeAt(0))
      console.log("Encrypted key length:", encryptedKey.length)

      if (encryptedKey.length !== 256) {
        console.error("Invalid encrypted key length, expected 256:", encryptedKey.length)
        return false
      }

      const decryptedKey = await crypto.subtle.decrypt(
        { name: "RSA-OAEP", hash: "SHA-256" },
        keyPair.privateKey,
        encryptedKey
      )

      if (decryptedKey.byteLength !== 16) {
        console.error("Invalid decrypted key length, expected 16:", decryptedKey.byteLength)
        return false
      }

      const sessionKey = await crypto.subtle.importKey(
        "raw",
        decryptedKey,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      )

      console.log("Session key imported for:", fromUser)
      sessionKeysRef.current[fromUser] = sessionKey
      delete pendingKeyExchanges.current[fromUser]
      return true
    } catch (error) {
      console.error("Error processing session key:", error.name, error.message)
      return false
    }
  }, [keyPair])

  useEffect(() => {
    if (keyPair?.privateKey && Object.keys(pendingKeyExchanges.current).length > 0) {
      console.log("Retrying pending key exchanges:", Object.keys(pendingKeyExchanges.current))
      Object.entries(pendingKeyExchanges.current).forEach(([username, { socket, encryptedSessionKey, userPublicKey }]) => {
        if (encryptedSessionKey) {
          receiveSessionKey(encryptedSessionKey, username, socket)
        } else if (userPublicKey) {
          socket.emit("key_exchange", { to: username })
        }
      })
    }
  }, [keyPair, receiveSessionKey])

  const encryptMessage = useCallback(async (message, recipientUsername) => {
    const sessionKey = sessionKeysRef.current[recipientUsername]
    if (!sessionKey) {
      console.error("encryptMessage: No session key for:", recipientUsername)
      throw new Error("No session key available")
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      data
    )

    const ciphertext = new Uint8Array(encrypted)
    const tag = ciphertext.slice(-16)
    const encryptedData = ciphertext.slice(0, -16)

    return {
      ciphertext: btoa(String.fromCharCode(...encryptedData)),
      nonce: btoa(String.fromCharCode(...iv)),
      tag: btoa(String.fromCharCode(...tag)),
    }
  }, [])

  const decryptMessage = useCallback(async (encryptedMessage, senderUsername) => {
    const sessionKey = sessionKeysRef.current[senderUsername]
    if (!sessionKey) {
      console.error("decryptMessage: No session key for:", senderUsername)
      throw new Error("No session key available")
    }

    const { ciphertext, nonce, tag } = encryptedMessage
    const iv = Uint8Array.from(atob(nonce), c => c.charCodeAt(0))
    const encryptedData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    const authTag = Uint8Array.from(atob(tag), c => c.charCodeAt(0))
    const combinedData = new Uint8Array([...encryptedData, ...authTag])

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sessionKey,
        combinedData
      )
      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error("Decryption failed:", error)
      throw new Error("Decryption failed: " + error.message)
    }
  }, [])

  return (
    <EncryptionContext.Provider
      value={{
        generateKeyPair,
        publicKey,
        privateKey,
        exchangeKeys,
        receiveSessionKey,
        encryptMessage,
        decryptMessage,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  )
}

export default EncryptionProvider