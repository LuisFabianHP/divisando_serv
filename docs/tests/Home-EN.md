# 📚 Testing Documentation - Divisando Serv

Welcome to the official wiki for testing and documentation of **Divisando Serv** backend. This wiki documents all quality assurance processes, systematic testing phases, and API validations in production environment (Railway).

---

## 🎯 Objectives

- 📋 Document all systematic testing phases
- ✅ Record test results and findings
- 🐛 Track identified bugs and applied solutions
- 🔒 Validate security standards and rate limiting
- 📊 Maintain historical record of changes and deployments
- 🚀 Serve as reference for future QA sprints

---

## 📖 Main Content

### 🧪 Testing & QA
- **[Testing Overview](Testing-Overview)** - Environment, conventions, and setup
- **[Testing Roadmap](Testing-Roadmap)** - 6 documented testing phases

### 🔄 Testing Phases
- **[PHASE 1: Authentication](FASE-1-Authentication)** - Register, login, refresh, logout
- **[PHASE 2: Exchange Data](FASE-2-Exchange-Data)** - Currency and rate queries
- **[PHASE 3: Comparisons](FASE-3-Comparisons)** - Currency comparisons
- **[PHASE 4: Management](FASE-4-Management)** - Manual refresh and system health
- **[PHASE 5: Security](FASE-5-Security)** - Security validations and authentication
- **[PHASE 6: Resilience](FASE-6-Resilience)** - Rate limiting and fault tolerance

### 📝 Reference
- **[Known Issues & Findings](Known-Issues)** - Bugs, solutions, and observations
- **[API Configuration](API-Configuration)** - Headers, base URLs, examples

---

## 📊 Overall Testing Status

| Phase | Description | Status | Endpoints | Completion |
|-------|-------------|--------|-----------|-----------|
| 1 | Authentication | ✅ Completed | 5/5 | 100% |
| 2 | Exchange Data | ✅ Completed | 5/5 | 100% |
| 3 | Comparisons | ✅ Completed | 4/4 | 100% |
| 4 | Management | ⚠️ Partial | 3/3 | 100% |
| 5 | Security | 🔄 In Progress | 4/4 | 0% |
| 6 | Resilience | ⏳ Pending | 3/3 | 0% |

**Total: 17/24 endpoints tested (70.8%)**

---

## 🔧 Technical Information

**Validation Environment:**
- 🌐 **Base URL:** `https://divisando-serv-production.up.railway.app`
- 📦 **Platform:** Railway (Node.js, Express, MongoDB Atlas)
- 🗄️ **Database:** MongoDB Atlas
- 🔐 **Authentication:** JWT + Refresh Tokens
- ⏱️ **Rate Limiting:** Active (50 req/min general, 5/min verification)

**Last Update:**
- 📅 **Date:** February 12, 2026
- 🔍 **Status:** All endpoints working correctly
- ✨ **Recent Fix:** LimitedMemoryStore (resetTime type issue)

---

## 📚 Conventions and Standards

### Required Headers
```
Content-Type: application/json
x-api-key: ***REMOVED***
User-Agent: DivisandoApp/1.0
Authorization: Bearer {accessToken} (if applicable)
```

### Standard Responses
- ✅ **200 OK** - Successful
- ✅ **202 Accepted** - Accepted (async processing)
- ❌ **400 Bad Request** - Invalid data
- ❌ **401 Unauthorized** - Missing authentication
- ❌ **403 Forbidden** - Access denied
- ❌ **429 Too Many Requests** - Rate limit exceeded
- ❌ **500 Internal Server Error** - Server error

### Testing Credentials
```
Email: test@example.com
Password: TestPassword123! (Actually: Consult .env local)
UserId: (Generated during testing)

⚠️ DO NOT share real credentials in code or documentation
```

---

## 🚀 Quick Links

- 🌍 [Spanish Version](Home)
- 📖 [API Specification (Pending - Swagger/OpenAPI)](https://example.com)
- 🔗 [Postman Collection (Pending)](https://example.com)
- 📊 [Railway Dashboard](https://railway.app)
- 🐛 [GitHub Issues](https://github.com/LuisFabianHP/divisando_serv/issues)

---

## 📝 Notes

This wiki is under version control and is regularly updated with testing results. To contribute, check the main repository: [divisando_serv](https://github.com/LuisFabianHP/divisando_serv)

**Last updated:** 2026-02-12

