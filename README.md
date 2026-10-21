# E-Commerce Server

A RESTful API backend for an e-commerce platform built with **Express 5**, **MongoDB** (via Mongoose 9), **JWT** authentication, **Cloudinary** for image uploads, and **Nodemailer** for transactional emails.

---

## Tech Stack

| Layer           | Technology                       |
| --------------- | -------------------------------- |
| Runtime         | Node.js (ES Modules)             |
| Framework       | Express 5                        |
| Database        | MongoDB Atlas (Mongoose 9)       |
| Authentication  | JWT (access + refresh tokens)    |
| File Uploads    | Multer → Cloudinary              |
| Email           | Nodemailer (Brevo SMTP)          |
| Password Hash   | bcrypt                           |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (or equivalent package manager)
- A **MongoDB Atlas** cluster (or local MongoDB instance)
- A **Cloudinary** account (for product image uploads)
- An **SMTP** provider for transactional emails (e.g. Brevo, SendGrid)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the server root with the following variables:

```env
# ── Database ──────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
DB_NAME=e_commerce

# ── Server ────────────────────────────────────
PORT=3000
FRONTEND_URL=http://localhost:5173

# ── JWT ───────────────────────────────────────
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_RESET_PASSWORD_SECRET=<your_reset_password_secret>
JWT_EXPIRYRESET_PASSWORD_EXPIRY=15m

# ── Email (Nodemailer / SMTP) ────────────────
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=2525
EMAIL_USER=<your_smtp_user>
EMAIL_PASS=<your_smtp_password>
EMAIL_FROM=you@example.com

# ── Cloudinary ────────────────────────────────
CLOUD_NAME=<your_cloud_name>
CLOUD_API_KEY=<your_api_key>
CLOUD_API_SECRET=<your_api_secret>
```

### 3. Start the server

**Development** (auto-restart with nodemon):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

The server will be running at **http://localhost:3000**.

---

## Available Scripts

| Command         | Description                               |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start with nodemon (hot-reload)           |
| `npm start`     | Start with `node index.js` (production)   |
| `npm test`      | *(placeholder — no tests configured yet)* |

---

## API Routes

All routes are prefixed with `/api/v1`.

| Method   | Endpoint               | Module    | Description                    |
| -------- | ---------------------- | --------- | ------------------------------ |
| `GET`    | `/health`              | —         | Server health check            |
| `*`      | `/api/v1/auth/*`       | Auth      | Register, login, password reset, token refresh |
| `*`      | `/api/v1/product/*`    | Product   | CRUD operations for products   |
| `*`      | `/api/v1/order/*`      | Order     | Create & manage orders         |
| `*`      | `/api/v1/review/*`     | Review    | Product reviews                |
| `*`      | `/api/v1/revenue/*`    | Revenue   | Revenue / analytics data       |
| `*`      | `/api/v1/user/*`       | User      | User profile & management      |

---

## Project Structure

```
server/
├── config/
│   ├── db.connection.js     # MongoDB connection setup
│   └── email.js             # Nodemailer transporter config
├── controllers/
│   ├── auth.controller.js   # Register, login, password reset
│   ├── order.controller.js  # Order CRUD & status management
│   ├── product.controller.js# Product CRUD, search, filtering
│   ├── revenue.controller.js# Revenue & analytics endpoints
│   ├── review.controller.js # Product review management
│   └── user.controller.js   # User profile & admin user ops
├── middlewares/
│   ├── auth.middleware.js   # JWT verification middleware
│   ├── multer.middleware.js # File upload handling (Multer)
│   └── rbac.middleware.js   # Role-based access control
├── models/
│   ├── category.model.js    # Category schema
│   ├── order.model.js       # Order schema
│   ├── product.model.js     # Product schema
│   ├── review.model.js      # Review schema
│   └── user.model.js        # User schema
├── routes/
│   ├── auth.routes.js       # Auth route definitions
│   ├── order.routes.js      # Order route definitions
│   ├── product.routes.js    # Product route definitions
│   ├── revenue.routes.js    # Revenue route definitions
│   ├── review.routes.js     # Review route definitions
│   └── user.routes.js       # User route definitions
├── utils/
│   ├── cloudinary.js        # Cloudinary upload/delete helpers
│   ├── emailUtil.js         # Email template & sending logic
│   └── helper.js            # General utility functions
├── public/                  # Static file serving
├── .env                     # Environment variables (git-ignored)
├── .gitignore
├── index.js                 # Application entry point
└── package.json
```

---

## Data Models

| Model      | Key Fields                                               |
| ---------- | -------------------------------------------------------- |
| **User**     | name, email, password (hashed), role                   |
| **Product**  | name, slug, description, price, images, category, stock|
| **Category** | name, slug                                             |
| **Order**    | user, items, total, shipping address, status, payment  |
| **Review**   | user, product, rating, comment                         |

---

## Middleware Pipeline

1. **CORS** — Enabled globally
2. **Body Parsing** — `express.json()` + `express.urlencoded()`
3. **Static Files** — Served from `public/`
4. **Auth Middleware** — JWT token verification on protected routes
5. **RBAC Middleware** — Role-based checks (e.g. admin-only routes)
6. **Multer Middleware** — Multi-part file upload handling for product images

---

## Key Features

- **Authentication** — JWT access/refresh token flow with secure password hashing (bcrypt)
- **Password Reset** — Token-based reset via email with dedicated JWT secret
- **Product Management** — Full CRUD with image upload to Cloudinary
- **Order Management** — Order creation, status tracking, and history
- **Reviews** — Users can rate and review products
- **Revenue Analytics** — Aggregated revenue data endpoints
- **User Management** — Profile updates and admin user operations
- **Role-Based Access Control** — Admin vs. regular user permissions
- **Email Notifications** — Transactional emails via Nodemailer (password reset, order confirmation, etc.)

---

## Related

- [Client README](../client/README.md) — Frontend application documentation
