import { supabase } from "../config/supabase.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";

export const authUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
      isAuthor: user.is_author,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const { data: userExists } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: user, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          is_admin: false,
          is_author: false,
        },
      ])
      .select()
      .single();

    if (error || !user) {
      return res.status(400).json({ message: error?.message || "Registration failed" });
    }

    res.status(201).json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
      isAuthor: user.is_author,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error("Registration failed:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, first_name, email, is_admin, is_author, phone, birth_date, gender, country, province, address, avatar_url")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user.id,
      name: user.name,
      firstName: user.first_name,
      email: user.email,
      isAdmin: user.is_admin,
      isAuthor: user.is_author,
      phone: user.phone,
      birthDate: user.birth_date,
      gender: user.gender,
      country: user.country,
      province: user.province,
      address: user.address,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const updates = {
      name: req.body.name,
      first_name: req.body.firstName,
      phone: req.body.phone,
      birth_date: req.body.birthDate,
      gender: req.body.gender,
      country: req.body.country,
      province: req.body.province,
      address: req.body.address,
      avatar_url: req.body.avatarUrl,
    };

    if (req.body.email) {
      // Check if another user already has this email
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", req.body.email)
        .neq("id", userId)
        .maybeSingle();
      
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use by another account" });
      }
      updates.email = req.body.email;
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json({
      _id: user.id,
      name: user.name,
      firstName: user.first_name,
      email: user.email,
      isAdmin: user.is_admin,
      isAuthor: user.is_author,
      phone: user.phone,
      birthDate: user.birth_date,
      gender: user.gender,
      country: user.country,
      province: user.province,
      address: user.address,
      avatarUrl: user.avatar_url,
      token: generateToken(user.id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", req.user._id || req.user.id);

    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

