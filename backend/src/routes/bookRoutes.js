import express from "express";
const router = express.Router();
import {
  getBooks,
  getBookById,
  getStats,
  createBookReview,
  getBookReviews,
} from "../controllers/bookController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/").get(getBooks);
router.route("/stats").get(getStats);
router.route("/:id").get(getBookById);
router.route("/:id/reviews").get(getBookReviews).post(protect, createBookReview);

export default router;
