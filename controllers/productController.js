// controllers/productController.js
import mongoose from "mongoose";
import Product from "../models/Product.js";

// GET /api/products
export const getProducts = async (req, res) => {
  try {
    const allowedSort = new Set(["createdAt", "price", "name", "stock"]);
    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10) || 20, 1), 100);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const category = typeof req.query.category === "string" ? req.query.category.trim() : undefined;

    let [field, direction] = (req.query.sort || "createdAt:desc").split(":");
    field = allowedSort.has(field) ? field : "createdAt";
    direction = direction === "asc" ? 1 : -1;

    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (category) filter.category = category;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [field]: direction })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const prod = await Product.findById(id).lean();
    if (!prod) return res.status(404).json({ message: "Product not found" });
    return res.json(prod);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
};

// POST /api/products  (admin)
export const createProduct = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admins only" });

    let { name, price, description, stock = 0, category } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ message: "name and price are required" });
    }
    price = Number(price);
    stock = Number(stock);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: "price must be a non-negative number" });
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: "stock must be a non-negative integer" });
    }

    const prod = await Product.create({ name, price, description, stock, category });
    return res.status(201).json(prod);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

// PUT /api/products/:id  (admin)
export const updateProduct = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const allowed = ["name", "price", "description", "stock", "category"];
    const update = {};
    for (const key of allowed) {
      if (key in req.body) update[key] = req.body[key];
    }
    if ("price" in update) {
      const p = Number(update.price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: "Invalid price" });
      update.price = p;
    }
    if ("stock" in update) {
      const s = Number(update.stock);
      if (!Number.isInteger(s) || s < 0) return res.status(400).json({ message: "Invalid stock" });
      update.stock = s;
    }

    const prod = await Product.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!prod) return res.status(404).json({ message: "Product not found" });
    return res.json(prod);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update product", error: err.message });
  }
};

// DELETE /api/products/:id  (admin)
export const deleteProduct = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const prod = await Product.findByIdAndDelete(id);
    if (!prod) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
};
