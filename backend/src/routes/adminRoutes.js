import express from "express";
const router = express.Router();
import {
  createBook,
  updateBook,
  deleteBook,
  internalizeFile
} from "../controllers/adminController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

router.route("/internalize").post(protect, admin, internalizeFile);
router.route("/books").post(protect, admin, createBook);
router
  .route("/books/:id")
  .put(protect, admin, updateBook)
  .delete(protect, admin, deleteBook);

export default router;
