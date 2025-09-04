// controllers/orderController.js
// controllers/orderController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// helper to compute total efficiently
const computeTotal = async (items = []) => {
  // Validate structure & quantities
  for (const it of items) {
    if (!mongoose.isValidObjectId(it.product)) throw new Error("Invalid product id");
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be a positive integer");
  }

  const ids = [...new Set(items.map((i) => i.product))];
  const products = await Product.find({ _id: { $in: ids } }).select("_id price").lean();

  if (products.length !== ids.length) {
    throw new Error("One or more products not found");
  }

  const priceMap = new Map(products.map((p) => [String(p._id), p.price]));
  let total = 0;
  for (const item of items) {
    total += priceMap.get(String(item.product)) * Number(item.quantity);
  }
  return total;
};

// POST /api/orders  (auth)
export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { products } = req.body; // [{ product: productId, quantity }]
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "products array is required" });
    }

    const totalPrice = await computeTotal(products);
    const order = await Order.create({
      user: userId,
      products,
      totalPrice,
      status: "pending",
    });

    return res.status(201).json(order);
  } catch (err) {
    return res.status(400).json({ message: "Failed to place order", error: err.message });
  }
};

// GET /api/orders  (auth, current user's orders)
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const orders = await Order.find({ user: userId })
      .populate("products.product")
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

// GET /api/orders/all  (admin)
export const getAllOrders = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admins only" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10) || 20, 1), 100);

    const [orders, total] = await Promise.all([
      Order.find()
        .populate("user")
        .populate("products.product")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(),
    ]);

    return res.json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch all orders", error: err.message });
  }
};

// PATCH /api/orders/:id/status  (admin)
export const updateOrderStatus = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;
    const { status } = req.body;
    const allowed = new Set(["pending", "shipped", "delivered"]);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  } catch (err) {
    return res.status(400).json({ message: "Failed to update order", error: err.message });
  }
};
