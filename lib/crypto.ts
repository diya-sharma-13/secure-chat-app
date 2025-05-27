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

  async encryptMessageForMultipleUsers(
    message: string,
    publicKeys: Map<string, CryptoKey>,
  ): Promise<{ [username: string]: string }> {
    const encryptedMessages: { [username: string]: string } = {}

    for (const [username, publicKey] of publicKeys.entries()) {
      try {
        const encrypted = await this.encryptMessage(message, publicKey)
        encryptedMessages[username] = encrypted
      } catch (error) {
        console.error(`Failed to encrypt for ${username}:`, error)
        // Continue with other users even if one fails
      }
    }

    return encryptedMessages
  }

  async encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(message)

      // RSA can only encrypt small amounts of data
      if (data.length > 190) {
        throw new Error("Message too long for RSA encryption")
      }

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicKey,
        data,
      )

      return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    } catch (error) {
      console.error("Failed to encrypt message:", error)
      throw error
    }
  }

  async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair) throw new Error("No key pair generated")

    try {
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
    } catch (error) {
      console.error("Failed to decrypt message:", error)
      throw error
    }
  }
}
