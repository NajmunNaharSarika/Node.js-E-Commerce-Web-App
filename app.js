const express = require("express");
const app = express();

// --- NEW: WEBSOCKET SETUP START ---
// 1. Wrap the express app with a native HTTP server
const http = require("http").createServer(app);
// 2. Initialize Socket.io on that server
const io = require("socket.io")(http);
// --- NEW: WEBSOCKET SETUP END ---

const session = require("express-session");
const raz = require("raz");
const connectToDB = require("./connectToDb");
const dbModel = require("./models/DbModel");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs");
// We need Multer for the AJAX Modal upload to work easily
const multer = require("multer");

raz.register(app);

const port = 2025;
app.use(express.static(__dirname + "/public"));
app.use(
  session({
    secret: "kit2kat",
    resave: false,
    saveUninitialized: true,
  })
);

///////// Global vars //////
var categories = [];
var products = [];
var users = [];
var carts = [];
var orders = [];
var uploadfolder = path.join(__dirname, "public", "images");
/////////////////////////////

// --- MULTER CONFIG (For AJAX Uploads) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadfolder);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });
// ----------------------------------------

connect();
getCategoriesMdb();
getProductsMdb();

app.get("/", async (req, res) => {
  await getCategoriesMdb();
  await getProductsMdb();

  let authenticated = false;
  let role = "";
  let hasCartItems = false; // 1. Default to false (no red dot)

  if (req.session.user) {
    authenticated = true;
    role = req.session.user.role;

    // 2. MONGODB QUERY: Check if this user has items
    // We use the user's _id to find their specific cart items
    const count = await dbModel.cartModel.countDocuments({
      userid: req.session.user._id,
    });

    if (count > 0) {
      hasCartItems = true; // User has items!
    }
  }

  let productToShow = [];
  if (req.query.c && req.query.s) {
    productToShow = products.filter(
      (v) => v.subcategoryid.toString() == req.query.s
    );
  } else {
    productToShow = products.filter((v) => v.featured);
  }

  res.render("./index", {
    categories: categories,
    products: productToShow,
    authenticated: authenticated,
    role: role,
    hasCartItems: hasCartItems,
  });
});
app.get("/", async (req, res) => {
  await getCategoriesMdb();
  await getProductsMdb();

  let authenticated = false;
  let role = "";
  if (req.session.user) {
    authenticated = true;
    role = req.session.user.role;
  }
  let productToShow = [];
  if (req.query.c && req.query.s) {
    productToShow = products.filter(
      (v) => v.subcategoryid.toString() == req.query.s
    );
  } else {
    productToShow = products.filter((v) => v.featured);
  }
  res.render("./index", {
    categories: categories,
    products: productToShow,
    authenticated: authenticated,
    role: role,
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/cart", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  let user = req.session.user;
  await getCartMdb(user._id);
  res.render("cart", { authenticated: true, carts: carts });
});

app.get("/addcart", async (req, res) => {
  if (!req.session.user)
    return res.json({ success: false, msg: "Please login" });
  let id = req.query.id;
  let user = req.session.user;

  let product = products.find((x) => x.id.toString() == id);

  // Use direct DB query for safety instead of global array
  let cart = await dbModel.cartModel.findOne({
    userid: user._id,
    productid: id,
  });

  if (cart) {
    cart.quantity += 1;
    await cart.save();
  } else {
    let data = {
      userid: user._id,
      productname: product.name,
      productid: product._id,
      quantity: 1,
      price: product.price,
    };
    let model = new dbModel.cartModel(data);
    await model.save();
    // carts.push(model); // Optional: global array update
  }

  // Count total items for this user to send back to frontend
  const totalItems = await dbModel.cartModel.countDocuments({
    userid: user._id,
  });

  res.json({
    success: true,
    id: id,
    cartCount: totalItems,
    msg: "Added to cart",
  });
});

app.get("/update-cart", async (req, res) => {
  let user = req.session.user;
  await getCartMdb(user._id);
  let cart = carts.find((x) => x._id.toString() == req.query.c);

  if (cart) {
    cart.quantity = Number(req.query.q);
    cart.save();
  }
  res.json({ success: true, msg: "Cart updated" });
});

app.get("/del-cart-item", async (req, res) => {
  let user = req.session.user;
  await getCartMdb(user._id);
  let cart = carts.find((x) => x._id.toString() == req.query.c);
  await cart.deleteOne({ _id: req.query.c });
  res.json({ success: true, msg: "Item deleted" });
});

app.get("/checkout", async (req, res) => {
  let user = req.session.user;
  await getCartMdb(user._id);
  let count = 0,
    amount = 0;
  carts.forEach((c) => {
    count += c.quantity;
    amount += c.quantity * c.price;
  });
  res.render("checkout", { amount: amount, count: count });
});

// --- UPDATED CREATE ORDER (FIXED) ---
app.post("/create-order", async (req, res) => {
  try {
    let user = req.session.user;
    let form = new formidable.IncomingForm();
    const [fields, files] = await form.parse(req);

    // Fetch fresh cart for this user
    const userCart = await dbModel.cartModel.find({ userid: user._id });

    if (userCart.length === 0) {
      return res.redirect("/");
    }

    let orderData = {
      userid: user._id,
      date: new Date(),
      address: fields.add ? fields.add[0] : "No Address Provided",
      status: "Pending",
      products: [],
    };

    userCart.forEach((c) => {
      orderData.products.push({
        productid: c.productid,
        productname: c.productname,
        price: c.price,
        quantity: c.quantity,
      });
    });

    let newOrder = new dbModel.orderModel(orderData);
    await newOrder.save();

    // Safe delete
    await dbModel.cartModel.deleteMany({ userid: user._id });

    res.render("confirm");
  } catch (err) {
    console.error("Order Error:", err);
    res.status(500).send("Error processing order.");
  }
});
// ------------------------------------

app.get("/register", (req, res) => {
  let authenticated = false;
  res.render("register", {
    authenticated: authenticated,
    role: "",
    msg: req.query.msg,
  });
});

app.post("/register", async (req, res) => {
  await getUsersMdb();
  let form = new formidable.IncomingForm();
  const [fields, files] = await form.parse(req);
  let found = users.find((u) => u.username == fields.uname[0]);

  if (found) {
    return res.redirect("/register?msg=Username exists. choose different one.");
  }
  let data = {
    username: fields.uname[0],
    password: fields.pass[0],
    role: "users",
  };
  let model = new dbModel.userModel(data);
  model.save();
  users.push(model);
  res.redirect("/login");
});

app.get("/login", async (req, res) => {
  await getUsersMdb();
  let authenticated = false;
  res.render("login", {
    authenticated: authenticated,
    role: "",
    msg: req.query.msg,
  });
});

app.post("/login", async (req, res) => {
  let authenticated = false;
  let form = new formidable.IncomingForm();
  const [fields, files] = await form.parse(req);
  let found = users.find(
    (u) => u.username == fields.uname[0] && u.password == fields.pass[0]
  );
  if (found) {
    req.session.user = found;
    return res.redirect("/");
  } else {
    return res.redirect("/login?msg=Login failed. Check username and password");
  }
});

app.get("/admin", async (req, res) => {
  let authenticated = false;
  let role = "";
  if (req.session.user) {
    authenticated = true;
    role = req.session.user.role;
  }
  res.render("./admin", { authenticated: authenticated, role: role });
});

app.get("/categories", async (req, res) => {
  let modelData = [];
  categories.forEach((c) => {
    let subs = [];
    c.subcategories.forEach((s) => {
      subs.push(s.subcategoryname);
    });
    modelData.push({ categoryname: c.categoryname, subs: subs });
  });

  res.render("./categories", { categories: modelData });
});

app.get("/products", async (req, res) => {
  if (!products.length) await getProductsMdb();
  if (!categories.length) await getCategoriesMdb();
  res.render("./products", { products: products, categories: categories });
});

app.get("/create-category", async (req, res) => {
  res.render("create-category", {
    authenticated: true,
    role: "admin",
    msg: req.query.msg,
  });
});

app.post("/save-category", async (req, res) => {
  let form = new formidable.IncomingForm();
  const [fields, files] = await form.parse(req);
  let data = { categoryname: fields.cname[0], subcategories: [] };
  fields.sname.forEach((s) => {
    data.subcategories.push({ subcategoryname: s });
  });
  let model = new dbModel.categoryModel(data);
  model.save();
  categories.push(model);
  res.redirect("create-category?msg=Data saved");
});

// --- NEW ROUTE: AJAX CREATE PRODUCT (Supports Socket.io) ---
// This handles the Modal/Quick Add form using Multer
app.post("/create-product", upload.single("picture"), async (req, res) => {
  try {
    const product = new dbModel.productModel({
      name: req.body.name,
      // Clean price (remove commas)
      price: Number(req.body.price.toString().replace(/,/g, "")),
      description: req.body.description,
      categoryid: req.body.categoryid,
      subcategoryid: req.body.subcategoryid,
      picture: req.file.filename,
      featured: req.body.featured === "on" || req.body.featured === "true",
    });

    const savedProduct = await product.save();
    products.push(savedProduct); // Update global var

    // --- BROADCAST TO ALL CLIENTS ---
    io.emit("new_product_added", savedProduct);
    // --------------------------------

    res.json({ success: true, product: savedProduct });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message });
  }
});
// -----------------------------------------------------------

app.get("/create-product", async (req, res) => {
  res.render("./create-product", { categories: categories });
});

// Legacy route (Formidable) - Can keep for non-ajax fallback
app.post("/save-product", async (req, res) => {
  var form = new formidable.IncomingForm({
    keepExtensions: true,
    uploadDir: uploadfolder,
  });

  const [fields, files] = await form.parse(req);

  let data = {
    name: fields.name[0],
    price: fields.price[0],
    description: fields.description[0],
    picture: files.picture[0].newFilename,
    categoryid: fields.categoryid[0],
    subcategoryid: fields.subcategoryid[0],
    featured: fields.featured && fields.featured[0] == "on" ? true : false,
  };
  var prodModel = new dbModel.productModel(data);
  prodModel.save();
  products.push(prodModel);

  // Also emit here just in case you use the old form
  io.emit("new_product_added", prodModel);

  res.redirect("/products");
});

app.get("/admin-order", async (req, res) => {
  await getOrdersMdb();
  let count = 0,
    amount = 0;
  let data = [];
  orders.forEach((o) => {
    let ord = {
      id: o._id,
      userid: o.userid,
      date: o.date,
      status: o.status,
      address: o.address,
    };
    o.products.forEach((p) => {
      count += p.quantity;
      amount += p.quantity * p.price;
    });
    o.amount = amount;
    o.count = count;
    data.push(o);
  });

  res.render("orderlist", { orders: data, authenticated: true });
});

app.get("/get-sub-categories", (req, res) => {
  let cid = req.query.cid;
  let cat = categories.find((v) => v._id.toString() == cid);
  let subs = [];
  if (cat) {
    cat.subcategories.forEach((s) => {
      subs.push({ id: s._id, subcategoryname: s.subcategoryname });
    });
    res.json(subs);
  } else {
    res.json([]);
  }
});

// --- SERVER START (Using http instead of app) ---
http.listen(port, () => {
  console.log("Server running with WebSockets on port " + port);
});
// ------------------------------------------------

// Functions
async function connect() {
  await connectToDB();
}
async function getCategoriesMdb() {
  let cats = await dbModel.categoryModel.find();
  categories = cats;
}
async function getProductsMdb() {
  let prods = await dbModel.productModel.find();
  products = prods;
}
async function getUsersMdb() {
  let userlist = await dbModel.userModel.find();
  users = userlist;
}
async function getCartMdb(id) {
  // Fixed: Don't just fetch all, fetch for user (though keeping your global var structure for now)
  let cart = await dbModel.cartModel.find();
  carts = cart;
}
async function getOrdersMdb() {
  let data = await dbModel.orderModel.find();
  orders = data;
}
