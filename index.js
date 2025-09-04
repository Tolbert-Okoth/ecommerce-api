// index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

const app = express();

// Core middleware
app.use(express.json());

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

// Start server only after DB connects
(async () => {
  try {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL is not set. Define it in your .env file.");
    }
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err.message);
    process.exit(1);
  }
})();

