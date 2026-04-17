import { toggleFavorite, checkFavorite, getFavorites } from "../controllers/favoriteController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/toggle/:bookId", protect, toggleFavorite);
router.get("/check/:bookId", protect, checkFavorite);
router.get("/", protect, getFavorites);

export default router;
