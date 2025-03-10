import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db/database_connection.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path , {dirname} from "path";



const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

router.get("/test", async (req, res) => {
  try {
    console.log(process.env.JWT_SECRET)
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "Connected", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "Failed to connect", error: err.message });
  }
});

// ✅ Update User
router.post("/update/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const query = `UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4 RETURNING *`;
    const values = [name, email, password, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Delete User
router.delete("/delete/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const query = "DELETE FROM users WHERE id=$1";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully", id });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Search User by Name
router.post("/search", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const query = "SELECT * FROM users WHERE name ILIKE $1";
    const result = await pool.query(query, [`%${name}%`]); // Partial match

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ users: result.rows });
  } catch (err) {
    console.error("Error finding user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Get All Users
router.get("/all-users", async (req, res) => {
  try {
    const query = "SELECT * FROM users";
    const result = await pool.query(query);

    res.json({ users: result.rows });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Get Profile (Requires Authentication)
router.get("/profile", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const { name } = decoded;

    const query = "SELECT * FROM users WHERE name = $1";
    const result = await pool.query(query, [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(401).json({ error: "Invalid token or unauthorized" });
  }
});



// ✅ Logout User
router.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "User logged out successfully" });
});

export default router;
