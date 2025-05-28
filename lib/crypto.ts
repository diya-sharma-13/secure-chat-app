export class SimpleCrypto {
  private keyPair: CryptoKeyPair | null = null

  async generateKeyPair(): Promise<void> {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
      )
    } catch (error) {
      console.error("Failed to generate key pair:", error)
      throw error
    }
  }

  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error("No key pair generated")

    try {
      const exported = await window.crypto.subtle.exportKey("spki", this.keyPair.publicKey)
      return btoa(String.fromCharCode(...new Uint8Array(exported)))
    } catch (error) {
      console.error("Failed to export public key:", error)
      throw error
    }
  }

  async importPublicKey(publicKeyB64: string): Promise<CryptoKey> {
    try {
      const publicKeyBuffer = Uint8Array.from(atob(publicKeyB64), (c) => c.charCodeAt(0))
      return await window.crypto.subtle.importKey(
        "spki",
        publicKeyBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"],
      )
    } catch (error) {
      console.error("Failed to import public key:", error)
      throw error
    }
  }

  // Generate AES key for message encryption
  async generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  // Encrypt message with AES (supports long messages)
  async encryptMessageWithAES(message: string, aesKey: CryptoKey): Promise<{ encryptedData: string; iv: string }> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(message)

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        aesKey,
        data,
      )

      return {
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
      }
    } catch (error) {
      console.error("Failed to encrypt message with AES:", error)
      throw error
    }
  }

  // Decrypt message with AES
  async decryptMessageWithAES(encryptedData: string, iv: string, aesKey: CryptoKey): Promise<string> {
    try {
      const encrypted = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))
      const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivArray,
        },
        aesKey,
        encrypted,
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error("Failed to decrypt message with AES:", error)
      throw error
    }
  }

  // Encrypt AES key with RSA
  async encryptAESKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey("raw", aesKey)

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicKey,
        exported,
      )

      return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    } catch (error) {
      console.error("Failed to encrypt AES key:", error)
      throw error
    }
  }

  // Decrypt AES key with RSA
  async decryptAESKey(encryptedKey: string): Promise<CryptoKey> {
    if (!this.keyPair) throw new Error("No key pair generated")

    try {
      const encrypted = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0))

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        this.keyPair.privateKey,
        encrypted,
      )

      return await window.crypto.subtle.importKey(
        "raw",
        decrypted,
        {
          name: "AES-GCM",
        },
        true,
        ["encrypt", "decrypt"],
      )
    } catch (error) {
      console.error("Failed to decrypt AES key:", error)
      throw error
    }
  }

  // Main encryption method for multiple users (hybrid encryption)
  async encryptMessageForMultipleUsers(
    message: string,
    publicKeys: Map<string, CryptoKey>,
  ): Promise<{ [username: string]: { encryptedMessage: string; encryptedKey: string; iv: string } }> {
    const encryptedMessages: { [username: string]: { encryptedMessage: string; encryptedKey: string; iv: string } } = {}

    // Generate one AES key for this message
    const aesKey = await this.generateAESKey()

    // Encrypt the message with AES
    const { encryptedData, iv } = await this.encryptMessageWithAES(message, aesKey)

    // Encrypt the AES key for each recipient with their RSA public key
    for (const [username, publicKey] of publicKeys.entries()) {
      try {
        const encryptedKey = await this.encryptAESKey(aesKey, publicKey)
        encryptedMessages[username] = {
          encryptedMessage: encryptedData,
          encryptedKey: encryptedKey,
          iv: iv,
        }
      } catch (error) {
        console.error(`Failed to encrypt for ${username}:`, error)
      }
    }

    return encryptedMessages
  }

  // Decrypt message (hybrid decryption)
  async decryptMessage(encryptedMessage: string, encryptedKey: string, iv: string): Promise<string> {
    if (!this.keyPair) throw new Error("No key pair generated")

    try {
      // Handle legacy format (direct RSA encryption)
      if (!encryptedKey && !iv) {
        const encrypted = Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0))
        const decrypted = await window.crypto.subtle.decrypt(
          {
            name: "RSA-OAEP",
          },
          this.keyPair.privateKey,
          encrypted,
        )
        const decoder = new TextDecoder()
        return decoder.decode(decrypted)
      }

      // Handle new hybrid format
      const aesKey = await this.decryptAESKey(encryptedKey)
      return await this.decryptMessageWithAES(encryptedMessage, iv, aesKey)
    } catch (error) {
      console.error("Failed to decrypt message:", error)
      throw error
    }
  }

  // Legacy method for backward compatibility (now uses hybrid encryption)
  async encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
    const aesKey = await this.generateAESKey()
    const { encryptedData, iv } = await this.encryptMessageWithAES(message, aesKey)
    const encryptedKey = await this.encryptAESKey(aesKey, publicKey)

    // Return combined data
    return JSON.stringify({
      encryptedMessage: encryptedData,
      encryptedKey: encryptedKey,
      iv: iv,
    })
  }
}
