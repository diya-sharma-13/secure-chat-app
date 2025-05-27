# 🔐 Secure Chat App

A modern, secure end-to-end encrypted chat application built with Next.js, featuring real-time messaging and client-side encryption that ensures your conversations remain private.

![Chat App Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Encryption](https://img.shields.io/badge/Encryption-RSA--2048%20%2B%20AES--256-red)

## 🚀 Live Demo

**[Try the App Live](https://v0-new-project-yqtgcffezyp.vercel.app)** ← Click to test the encrypted chat!

> **Demo Instructions**: Open in multiple browser tabs/windows with different usernames to test real-time encrypted messaging.

## ✨ Key Features

### 🔒 **Security First**
- **End-to-End Encryption**: Messages encrypted with RSA-2048 + AES-256
- **Client-Side Keys**: Private keys never leave your device
- **Zero Server Storage**: No plaintext messages stored anywhere
- **Perfect Forward Secrecy**: Unique encryption keys per message

### 💬 **Real-Time Communication**
- **Instant Messaging**: Real-time chat with Socket.io
- **Multi-User Support**: Connect multiple users simultaneously
- **Online Status**: See who's currently active
- **Message Delivery**: Reliable message transmission

### 📱 **Modern UI/UX**
- **Mobile Responsive**: Works perfectly on all devices
- **Clean Interface**: Intuitive chat design with Bootstrap
- **Encryption Indicators**: Visual confirmation of message security
- **Dark/Light Themes**: Adaptive design for any preference

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14, TypeScript, React 18 |
| **Styling** | Tailwind CSS, Bootstrap 5.3 |
| **Real-time** | Socket.io, Polling API |
| **Encryption** | Web Crypto API (RSA-OAEP, AES-256-GCM) |
| **Backend** | Next.js API Routes, Serverless Functions |
| **Deployment** | Vercel (with automatic deployments) |

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser with Web Crypto API support

### Installation

```bash
# Clone the repository
git clone https://github.com/diya-sharma-13/secure-chat-app.git
cd secure-chat-app

# Install dependencies
npm install

# Run development server
npm run dev
