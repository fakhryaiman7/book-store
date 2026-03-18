import express from "express";
const router = express.Router();
import {
  addTransactionItems,
  getMyTransactions,
  getTransactionById,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/").post(protect, addTransactionItems);
router.route("/mytransactions").get(protect, getMyTransactions);
router.route("/:id").get(protect, getTransactionById);

export default router;
