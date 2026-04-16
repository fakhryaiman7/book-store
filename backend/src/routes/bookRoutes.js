import express from "express";
const router = express.Router();
import { getBooks, getBookById, getStats } from "../controllers/bookController.js";

router.route("/").get(getBooks);
router.route("/stats").get(getStats);
router.route("/:id").get(getBookById);

export default router;
