// controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRES_IN = "1h"; // Token validity duration

// Guard against missing secret in production
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set. Define it in your .env file.");
}

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username }],
    }).lean();
    if (exists) {
      return res.status(409).json({ message: "User with email/username already exists" });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase().trim(),
      password, // hashed in User model pre-save
      role: role === "admin" ? "admin" : "user",
    });

    const safeUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    return res.status(201).json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const safeUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return res.json({ token, user: safeUser });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};
