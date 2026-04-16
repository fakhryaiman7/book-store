import { supabase } from "../config/supabase.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    res.json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
      role: user.role || (user.is_admin ? 'admin' : 'customer'),
      token: generateToken(user.id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  const { data: userExists } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
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
      },
    ])
    .select()
    .single();

  if (error || !user) {
    console.error("Supabase Registration Error:", error);
    res.status(400);
    throw new Error(error?.message || "Invalid user data");
  }

  res.status(201).json({
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.is_admin,
    role: user.role || 'customer',
    token: generateToken(user.id),
  });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, is_admin")
    .eq("id", req.user._id)
    .single();

  if (error || !user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.is_admin,
  });
};

export { authUser, registerUser, getUserProfile };
