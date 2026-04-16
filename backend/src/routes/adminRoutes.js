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
import { protect, admin } from "../middleware/authMiddleware.js";

router.route("/stats").get(protect, admin, getAdminStats);
router.route("/users").get(protect, admin, getAdminUsers);
router.route("/users/:id").put(protect, admin, updateAdminUser).delete(protect, admin, deleteAdminUser);
router.route("/orders").get(protect, admin, getAdminOrders);
router.route("/orders/:id").put(protect, admin, updateAdminOrder);
router.route("/internalize").post(protect, admin, internalizeFile);
router.route("/books").post(protect, admin, createBook);
router
  .route("/books/:id")
  .put(protect, admin, updateBook)
  .delete(protect, admin, deleteBook);

export default router;
