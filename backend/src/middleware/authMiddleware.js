import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, is_admin, is_author")
        .eq("id", decoded.id)
        .single();
        
      if (error || !user) {
         throw new Error("Not authorized, user not found");
      }
      
      req.user = {
        _id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin,
        isAuthor: user.is_author
      };
      
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
};

const author = (req, res, next) => {
  if (req.user && req.user.isAuthor) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an author");
  }
};

const adminOrAuthor = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.isAuthor)) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an admin or author");
  }
};

export { protect, admin, author, adminOrAuthor };
