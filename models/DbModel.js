const { type } = require("jquery");
const mongoose = require("mongoose");

// Helper function to remove commas and convert to number
const cleanPrice = (v) => {
  if (typeof v === "string") {
    // Replaces commas with empty string, then converts to Number
    return Number(v.replace(/,/g, ""));
  }
  return v;
};

const catScehma = mongoose.Schema({
  categoryname: {
    type: String,
    required: true,
  },
  subcategories: [
    {
      subcategoryname: {
        type: String,
        required: true,
      },
      // Mongoose automatically handles empty arrays, default: [] isn't strictly necessary inside the array object, but kept as is.
    },
  ],
});

const prodScehma = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    // --- FIX ADDED HERE ---
    set: cleanPrice,
  },
  description: {
    type: String,
    required: true,
  },
  picture: {
    type: String,
    required: true,
  },
  categoryid: {
    type: String,
    required: true,
  },
  subcategoryid: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const userScehma = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

const cartSchema = mongoose.Schema({
  userid: {
    type: String,
    required: true,
  },
  productid: {
    type: String,
    required: true,
  },
  productname: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    // --- FIX ADDED HERE (Just in case) ---
    set: cleanPrice,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

const orderSchema = mongoose.Schema({
  userid: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  products: [
    {
      productid: {
        type: String,
        required: true,
      },
      productname: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        // --- FIX ADDED HERE (Just in case) ---
        set: cleanPrice,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
});

module.exports = {
  categoryModel: mongoose.model("categories", catScehma),
  productModel: mongoose.model("products", prodScehma),
  userModel: mongoose.model("users", userScehma),
  cartModel: mongoose.model("carts", cartSchema),
  orderModel: mongoose.model("orders", orderSchema),
};
