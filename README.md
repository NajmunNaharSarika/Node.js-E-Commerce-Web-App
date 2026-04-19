# 🛒 Node.js E-Commerce Web App

A full-featured e-commerce web application built with **Node.js**, **Express**, **MongoDB**, and **Socket.io** — featuring real-time product updates, a shopping cart, order management, and an admin dashboard.

---

## ✨ Features

### 🧑‍💼 User Features
- User registration and login with session management
- Browse products by category and subcategory
- Add to cart with live item count indicator (red dot badge)
- Update/remove cart items
- Checkout and place orders with delivery address
- Order confirmation page

### 🛠️ Admin Features
- Admin dashboard with quick-access panels
- Create and manage categories with subcategories
- Create products with image upload (AJAX modal + legacy form)
- View all orders with totals and status
- Real-time product broadcast to all connected clients via **Socket.io**

### ⚡ Technical Highlights
- **Real-time updates** — new products are pushed to all open browser tabs instantly via WebSockets
- **Dual upload support** — Multer (AJAX) and Formidable (traditional form)
- **Dynamic subcategory loading** — subcategory dropdowns populate via AJAX on category selection
- **Animated banner** — CSS keyframe background image slideshow on the homepage
- **Responsive design** — mobile-friendly layout with a collapsible sidebar

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Templating | Raz (`.raz` files) |
| Real-time | Socket.io |
| File Upload | Multer, Formidable |
| Session | express-session |
| Frontend | jQuery, Bootstrap Icons |
| Styling | Custom CSS (CSS Variables) |

---

## 📁 Project Structure

```
/
├── app.js                  # Main server entry point
├── connectToDb.js          # MongoDB connection helper
├── package.json
├── models/
│   └── DbModel.js          # Mongoose models (User, Product, Category, Cart, Order)
├── public/
│   ├── images/             # Uploaded product images
│   ├── style.css           # Global stylesheet
│   └── ...                 # Static assets (jQuery, Bootstrap Icons, etc.)
└── views/
    ├── _layout.raz         # Main layout template
    ├── _nav.raz            # Navigation partial
    ├── index.raz           # Homepage
    ├── create-category.raz # Admin: create category
    ├── create-product.raz  # Admin: create product
    └── ...                 # Other page templates
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) running locally on port `27017`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# 2. Install dependencies
npm install

# 3. Make sure MongoDB is running
# On Windows: net start MongoDB
# On Mac/Linux: sudo systemctl start mongod

# 4. Start the server
node app.js

# Or with auto-reload (nodemon is included)
npx nodemon app.js
```

### 5. Open in your browser
```
http://localhost:2025
```

---

## 🗄️ Database

The app connects to a local MongoDB instance automatically:

```
mongodb://127.0.0.1:27017/
```

No manual database setup is needed — Mongoose will create collections on first use.

### Collections
| Collection | Description |
|---|---|
| `users` | Registered user accounts |
| `categories` | Product categories with nested subcategories |
| `products` | Product listings with image, price, and featured flag |
| `carts` | Per-user shopping cart items |
| `orders` | Placed orders with product snapshots |

---

## 🔑 Default Roles

| Role | Access |
|---|---|
| `users` | Browse, cart, checkout |
| `admin` | All user access + admin dashboard, product/category management, order list |

> To create an admin user, manually set `role: "admin"` on a user document in MongoDB, or seed the database.

---

## 📡 API Endpoints

### Public
| Method | Route | Description |
|---|---|---|
| GET | `/` | Homepage (featured products) |
| GET | `/?c=:id&s=:id` | Filter products by subcategory |
| GET | `/login` | Login page |
| POST | `/login` | Authenticate user |
| GET | `/register` | Register page |
| POST | `/register` | Create new user |
| GET | `/logout` | Destroy session and redirect |

### User (session required)
| Method | Route | Description |
|---|---|---|
| GET | `/cart` | View cart |
| GET | `/addcart?id=:id` | Add product to cart (AJAX) |
| GET | `/update-cart?c=:id&q=:qty` | Update cart quantity |
| GET | `/del-cart-item?c=:id` | Remove cart item |
| GET | `/checkout` | Checkout summary |
| POST | `/create-order` | Place order |

### Admin
| Method | Route | Description |
|---|---|---|
| GET | `/admin` | Admin dashboard |
| GET | `/create-category` | Category creation form |
| POST | `/save-category` | Save new category |
| GET | `/create-product` | Product creation form |
| POST | `/create-product` | Save product (AJAX + Socket.io emit) |
| POST | `/save-product` | Save product (legacy form) |
| GET | `/admin-order` | View all orders |
| GET | `/get-sub-categories?cid=:id` | Get subcategories by category (AJAX) |

---

## 🔌 Real-Time (Socket.io)

When a new product is saved, the server broadcasts a `new_product_added` event to all connected clients:

```javascript
io.emit("new_product_added", savedProduct);
```

On the frontend, you can listen for this event to update the product list without a page refresh:

```javascript
const socket = io();
socket.on("new_product_added", (product) => {
  console.log("New product arrived:", product.name);
  // dynamically insert into the DOM
});
```

---

## 📦 Dependencies

```json
"express": "4.*",
"mongoose": "^8.4.3",
"express-session": "^1.18.0",
"socket.io": "^4.8.1",
"multer": "^2.0.2",
"formidable": "^3.5.1",
"raz": "^1.5.0",
"jquery": "3.*",
"bootstrap-icons": "^1.11.3",
"js-snackbar": "^1.1.2",
"nodemon": "^3.1.4"
```

---

## ⚠️ Known Issues / TODOs

- [ ] Passwords are stored in **plain text** — add bcrypt hashing before deploying
- [ ] No admin route protection middleware — add role check guards
- [ ] `getCartMdb()` fetches all carts, not just the current user's — refactor for multi-user safety
- [ ] Duplicate `GET /` route handler in `app.js` — the second one overrides the first; remove the redundant one
- [ ] Add input validation and sanitization

---

## 📄 License

ISC
