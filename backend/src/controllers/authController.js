import { supabase } from "../config/supabase.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";

const authUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      return res.json({
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin,
        token: generateToken(user.id),
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check if user exists
    const { data: userExists } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insert user
    const { data: user, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          is_admin: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("DEBUG: Supabase Insert Error:", error);
      return res.status(400).json({ 
        message: `Database Error: ${error.message}`,
        details: error.details,
        hint: error.hint
      });
    }

    if (!user) {
      return res.status(500).json({ message: "User creation failed - No data returned from database." });
    }

    // 4. Return success
    return res.status(201).json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
      token: generateToken(user.id),
    });

  } catch (err) {
    console.error("DEBUG: Server Crash:", err);
    return res.status(500).json({ message: `Server Error: ${err.message}` });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, is_admin")
      .eq("id", req.user._id || req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { authUser, registerUser, getUserProfile };
