import express from "express";
const router = express.Router();
import {
  checkout,
  getMyTransactions,
  getMyLibrary,
  checkAccess,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/checkout").post(protect, checkout);
router.route("/mytransactions").get(protect, getMyTransactions);
router.route("/mylibrary").get(protect, getMyLibrary);
router.route("/check-access/:bookId").get(protect, checkAccess);

export default router;
