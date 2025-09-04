// routes/orders.js
// routes/orders.js
import express from "express";
import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Customer
router.post("/", authMiddleware, placeOrder);
router.get("/", authMiddleware, getMyOrders);

// Admin
router.get("/all", authMiddleware, adminMiddleware, getAllOrders);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);

export default router;


