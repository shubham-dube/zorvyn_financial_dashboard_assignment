# Finance Dashboard Backend 💰

> **Production-grade Financial Data Processing and Access Control API**  
> Built with **Fastify**, **TypeScript**, **PostgreSQL**, **Prisma**, and **Redis**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748)](https://www.prisma.io/)

---

## 🚀 Features

### **Core Functionality**
- ✅ **Complete Authentication System** - Register, Login, Refresh tokens, Logout
- ✅ **User Management** - CRUD operations, role management, profile updates
- ✅ **Category Management** - System and custom categories with protection
- ✅ **Financial Records** - Full CRUD with advanced filtering, soft delete, restore
- ✅ **Dashboard Analytics** - Summary, trends, category breakdowns, insights
- ✅ **Audit Logging** - Complete audit trail for all actions

### **Security Features**
- 🔐 **Argon2id Password Hashing** - OWASP recommended, GPU-resistant
- 🎫 **JWT + Refresh Tokens** - Stateless access tokens (15min) + Redis-backed refresh (7 days)
- 🔄 **Token Rotation** - Automatic refresh token rotation on use
- 🚫 **Token Blocklist** - Logout invalidates tokens immediately
- 🛡️ **3-Layer RBAC** - Route, service, and query-level enforcement
- ⚡ **Rate Limiting** - Redis-backed sliding window
- 🔒 **Helmet Security Headers** - CORS, CSP, XSS protection
- ✅ **Input Validation** - Zod schemas at every endpoint

### **Performance**
- ⚡ **Fastify Framework** - 3x faster than Express (76k vs 26k req/s)
- 🗄️ **Redis Caching** - Categories (1h), Dashboard (5min)
- 📊 **Query Optimization** - Proper indexes, efficient joins
- 🔄 **Connection Pooling** - Prisma connection management

---

## 🚦 Quick Start

### **Prerequisites**
- Node.js 20+ LTS
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### **1. Clone & Install**
```bash
git clone <repo-url>
cd finance-backend
npm install
```

### **2. Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start services**:
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Setup database**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run db:seed
   ```

6. **Start development**:
   ```bash
   npm run dev
   ```