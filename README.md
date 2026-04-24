# 🚀 AI Learning Assistant - Backend

<div align="center">

[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-90c53f?logo=express)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.3.1-13aa52?logo=mongodb)](https://www.mongodb.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini%20AI-1.46.0-4285F4?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

**Transform your learning experience with intelligent AI-powered study tools!** 📚✨

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Architecture](#-architecture) • [Security](#-security)

</div>

---

## 🎯 Overview

The **AI Learning Assistant Backend** is a powerful, enterprise-grade Node.js server that harnesses the power of **Google's Gemini AI** to revolutionize how students learn. It transforms educational documents into interactive learning materials including flashcards, quizzes, summaries, and AI-powered conversations.

### 🌟 Why This Backend Matters
- **Intelligent Processing**: Uses cutting-edge Gemini AI for context-aware learning material generation
- **Secure & Scalable**: Built with JWT token rotation, security best practices, and production-ready architecture
- **Smart Token Management**: Advanced refresh token system with automatic rotation to prevent security vulnerabilities
- **Multi-format Support**: Handles PDFs and documents with intelligent text chunking and parsing
- **Real-time Chat**: Interactive AI conversations with full chat history tracking

---

## ✨ Features

### 🤖 AI-Powered Learning Generation
- **Flashcard Generation** - Automatically creates study flashcards from documents
- **Quiz Generation** - Generates intelligent quizzes with varying difficulty levels
- **Summary Creation** - Creates concise summaries of lengthy documents
- **Smart Chat** - Context-aware AI conversations about your documents
- **Concept Explanation** - Deep explanations of complex concepts

### 📄 Document Management
- **PDF Upload & Processing** - Seamless document upload with Cloudinary integration
- **Intelligent Text Chunking** - Breaks down documents into meaningful segments
- **Document Storage** - Organized storage with user-specific access control
- **Status Tracking** - Track document processing status in real-time

### 🔐 Enterprise Security
- **JWT Authentication** - Secure token-based authentication
- **Token Rotation System** - Automatic token refresh with version tracking
- **Password Encryption** - bcryptjs-based password hashing
- **CORS & HTTPS** - Cross-origin protection and security headers via Helmet
- **Input Validation** - Express-validator for robust data validation

### 👤 User Management
- **User Registration & Login** - Secure authentication system
- **Progress Tracking** - Monitor learning progress across all features
- **Profile Management** - User profile with image uploads
- **Session Management** - Cookie-based session handling

### 📊 Learning Analytics
- **Quiz Performance Tracking** - Detailed quiz result analytics
- **Progress Monitoring** - Track learning journey and achievements
- **Chat History** - Persistent conversation records
- **Study Statistics** - Comprehensive learning metrics

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (local or Atlas)
- **Google Gemini API Key**
- **Cloudinary Account** (for file uploads)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-learning-assistant.git
cd Backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the Backend directory:

```env
# Server Configuration
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_learning_db

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will be running at `http://localhost:3001`

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Document Endpoints

#### Upload Document
```http
POST /api/documents/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

- document: [PDF file]
```

#### Get All Documents
```http
GET /api/documents
Authorization: Bearer {token}
```

#### Get Single Document
```http
GET /api/documents/:id
Authorization: Bearer {token}
```

#### Delete Document
```http
DELETE /api/documents/:id
Authorization: Bearer {token}
```

### AI Learning Endpoints

#### Generate Flashcards
```http
POST /api/ai/generate-flashcards
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentId": "doc_123",
  "count": 30
}
```

#### Generate Quiz
```http
POST /api/ai/generate-quiz
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentId": "doc_123",
  "difficulty": "medium",
  "count": 10
}
```

#### Generate Summary
```http
POST /api/ai/generate-summary
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentId": "doc_123"
}
```

#### Chat with AI
```http
POST /api/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentId": "doc_123",
  "message": "Explain the main concept"
}
```

#### Explain Concept
```http
POST /api/ai/explain-concept
Authorization: Bearer {token}
Content-Type: application/json

{
  "concept": "quantum mechanics",
  "depth": "intermediate"
}
```

---

## 🏗️ Architecture

### Project Structure

```
Backend/
├── config/                 # Configuration files
│   ├── db_connect.js      # MongoDB connection
│   └── PDFprocess.js      # PDF processing setup
├── Controller/            # Request handlers
│   ├── aiController.js    # AI features logic
│   ├── authController.js  # Authentication logic
│   ├── documentController.js
│   ├── flashcardController.js
│   ├── quizController.js
│   └── progressController.js
├── Middleware/            # Custom middleware
│   ├── auth.js           # JWT verification
│   ├── tokenRotationMiddleware.js
│   ├── errorHandler.js
│   ├── Claudinary.js
│   └── MulterMiddleware.js
├── Model/                 # MongoDB schemas
│   ├── User.Model.js
│   ├── Document.Model.js
│   ├── ChatHistroy.Model.js
│   ├── FlashCard.model.js
│   └── Quiz.Model.js
├── Routes/               # API route definitions
├── Utils/                # Utility functions
│   ├── geminiServer.js   # Google Gemini integration
│   ├── JWT_Generator.js
│   ├── pdfParser.js
│   ├── textChunker.js
│   └── tokenRefreshManager.js
└── server.js            # Entry point
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js 5.x |
| **Database** | MongoDB + Mongoose ODM |
| **AI Engine** | Google Gemini AI |
| **Authentication** | JWT with Token Rotation |
| **File Storage** | Cloudinary |
| **Security** | Helmet, bcryptjs, CORS |
| **Logging** | Morgan |
| **Validation** | express-validator |

---

## 🔐 Security

### Token Rotation System

Our advanced token rotation system prevents security vulnerabilities:

```
User Login
    ↓
Generate Token Pair (Version 1)
├── Access Token (15 min) - Short-lived
└── Refresh Token (7 days) - Long-lived
    ↓
Automatic Refresh (< 5 min to expiry)
├── Old tokens invalidated
├── New pair generated (Version 2)
└── Prevents token reuse attacks
```

**Key Security Features:**
- ✅ Automatic token refresh before expiry
- ✅ Token version tracking
- ✅ Secure cookie storage
- ✅ CSRF protection
- ✅ SQL/NoSQL injection prevention
- ✅ Rate limiting ready
- ✅ HTTPS/TLS support

### Best Practices Implemented

```javascript
// Password Hashing
bcryptjs for secure password storage

// JWT Security
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Token versioning for invalidation

// Database Security
- Mongoose input validation
- Express-validator for API inputs
- Helmet for HTTP security headers

// API Security
- CORS with whitelist
- Request size limits
- Cookie parser with secure options
```

---

## 📚 API Integration Guide

### Example: Complete Learning Workflow

```javascript
// 1. User Login
POST /api/auth/login
Response: { accessToken, refreshToken, user }

// 2. Upload Document
POST /api/documents/upload
Body: { document: File }

// 3. Generate Flashcards
POST /api/ai/generate-flashcards
Body: { documentId, count: 30 }

// 4. Chat with AI
POST /api/ai/chat
Body: { documentId, message: "Explain X" }

// 5. Generate Quiz
POST /api/ai/generate-quiz
Body: { documentId, difficulty: "hard" }

// 6. Track Progress
GET /api/progress/stats
```

---

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Debugging
```bash
# Enable debug logs
DEBUG=* npm run dev

# View token rotation logs
DEBUG=tokenRotation npm run dev
```

---

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- Follow ES6+ syntax
- Use meaningful variable names
- Add comments for complex logic
- Ensure error handling in all async functions

---

## 📄 License

This project is licensed under the **ISC License** - see the LICENSE file for details.

---

## 🙋 Support & Questions

- 📧 Email: support@ailearning.com
- 💬 Discord: [Join our community](https://discord.gg/ailearning)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/ai-learning-assistant/issues)
- 📖 Documentation: [Full Docs](https://docs.ailearning.com)

---

## 🎉 Acknowledgments

- **Google Gemini AI** - For incredible AI capabilities
- **MongoDB** - For robust database solutions
- **Express.js Community** - For the amazing framework
- **All Contributors** - For making this project awesome

---

<div align="center">

### ⭐ If you find this project helpful, please give it a star!

**Built with ❤️ by the AI Learning Assistant Team**

</div>
