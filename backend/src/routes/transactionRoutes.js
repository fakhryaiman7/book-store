import express from "express";
const router = express.Router();
import {
  checkout,
  getMyTransactions,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/checkout").post(protect, checkout);
router.route("/mytransactions").get(protect, getMyTransactions);

export default router;
