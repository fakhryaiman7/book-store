import { supabase } from "../config/supabase.js";

// @desc    Toggle favorite status for a book
// @route   POST /api/favorites/toggle/:bookId
// @access  Private
export const toggleFavorite = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // 1. Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (checkError) {
      console.error(checkError);
      return res.status(500).json({ message: "Database Error" });
    }

    if (existing) {
      // 2. Remove it
      const { error: delError } = await supabase
        .from("favorites")
        .delete()
        .eq("id", existing.id);

      if (delError) return res.status(500).json({ message: "Failed to remove from favorites" });
      
      res.json({ message: "Removed from favorites", isFavorite: false });
    } else {
      // 3. Add it
      const { error: insError } = await supabase
        .from("favorites")
        .insert([{ user_id: userId, book_id: bookId }]);

      if (insError) return res.status(500).json({ message: "Failed to add to favorites" });
      
      res.json({ message: "Added to favorites", isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if a book is favorited by the current user
// @route   GET /api/favorites/check/:bookId
// @access  Private
export const checkFavorite = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { data: existing, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Database Error" });
    }

    res.json({ isFavorite: !!existing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all favorite books for the current user
// @route   GET /api/favorites
// @access  Private
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { data, error } = await supabase
      .from("favorites")
      .select(`
        book_id,
        books (*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching favorites:", error);
      return res.status(500).json({ message: "Database Error" });
    }

    // Extract books from the join results
    const favoritedBooks = data.map(f => f.books).filter(Boolean);

    res.json(favoritedBooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
