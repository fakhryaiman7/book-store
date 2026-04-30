import express from "express";
const router = express.Router();
import {
  createBook,
  updateBook,
  deleteBook,
  internalizeFile,
  getAdminStats,
  getAdminUsers,
  getAdminOrders,
  updateAdminUser,
  deleteAdminUser,
  updateAdminOrder
} from "../controllers/adminController.js";
import { protect, admin, adminOrAuthor } from "../middleware/authMiddleware.js";

router.route("/stats").get(protect, adminOrAuthor, getAdminStats);
router.route("/users").get(protect, admin, getAdminUsers);
router.route("/users/:id").put(protect, admin, updateAdminUser).delete(protect, admin, deleteAdminUser);
router.route("/orders").get(protect, adminOrAuthor, getAdminOrders);
router.route("/orders/:id").put(protect, admin, updateAdminOrder);
router.route("/internalize").post(protect, adminOrAuthor, internalizeFile);
router.route("/books").post(protect, adminOrAuthor, createBook);
router
  .route("/books/:id")
  .put(protect, adminOrAuthor, updateBook)
  .delete(protect, adminOrAuthor, deleteBook);

export default router;
