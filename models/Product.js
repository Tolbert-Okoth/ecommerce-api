// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

// Helpful indexes
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });

export default mongoose.model("Product", productSchema);


