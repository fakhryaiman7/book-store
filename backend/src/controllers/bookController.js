import { supabase } from "../config/supabase.js";

// Helper to map Postgres snake_case/id to Mongoose style for frontend compatibility
const mapBook = (book) => {
  if (!book) return null;
  return {
    ...book,
    _id: book.id,
    pricePerDay: book.price_per_day,
    countInStock: book.count_in_stock,
    discount_price: book.discount_price,
    purchasePrice: book.purchase_price,
    rentalPrice: book.rental_price || book.price_per_day,
    discountPrice: book.discount_price,
    bookFileUrl: book.book_file_url,
    previewFileUrl: book.preview_file_url,
    availableForSale: book.available_for_sale,
    availableForRent: book.available_for_rent,
  };
};


// @desc    Fetch all books
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
  try {
    const { data: books, error } = await supabase.from("books").select("*");

    if (error) {
      console.error("Supabase Error in getBooks:", error);
      return res.status(500).json({ message: error.message, details: error });
    }

    if (!books) {
      console.error("Supabase returned null data for books query.");
      return res.status(500).json({ message: "Failed to retrieve books from database." });
    }

    res.json(books.map(mapBook));
  } catch (err) {
    console.error("Exception in getBooks:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

// @desc    Fetch single book
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
  const { data: book, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !book) {
    res.status(404);
    throw new Error("Book not found");
  }

  res.json(mapBook(book));
};

// @desc    Get website stats
// @route   GET /api/books/stats
// @access  Public
const getStats = async (req, res) => {
  try {
    // 1. Get total books count
    const { count: booksCount, error: bErr } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true });

    // 2. Get total users count (Happy Readers)
    const { count: usersCount, error: uErr } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // 3. Get unique categories
    const { data: catData, error: cErr } = await supabase
      .from("books")
      .select("category");

    const categories = new Set(catData?.map(b => b.category).filter(Boolean));

    if (bErr || uErr || cErr) throw new Error("Error fetching statistics");

    res.json({
      booksCount: booksCount || 0,
      usersCount: usersCount || 0,
      categoriesCount: categories.size || 0
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const createBookReview = async (req, res) => {
  const { rating, comment } = req.body;
  const bookId = req.params.id;
  const userId = req.user._id || req.user.id;

  try {
    // 1. Check if user already reviewed
    const { data: existingReview } = await supabase
      .from("book_ratings")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .single();

    if (existingReview) {
      return res.status(400).json({ message: "Book already reviewed" });
    }

    // 2. Insert review
    const { error: reviewError } = await supabase
      .from("book_ratings")
      .insert([
        {
          user_id: userId,
          book_id: bookId,
          rating: Number(rating),
          comment,
        },
      ]);

    if (reviewError) {
      return res.status(400).json({ message: reviewError.message });
    }

    // 3. Update book rating avg/count
    const { data: reviews } = await supabase
      .from("book_ratings")
      .select("rating")
      .eq("book_id", bookId);

    const ratingCount = reviews.length;
    const ratingAvg = reviews.reduce((acc, item) => item.rating + acc, 0) / ratingCount;

    await supabase
      .from("books")
      .update({
        rating_avg: ratingAvg,
        rating_count: ratingCount,
      })
      .eq("id", bookId);

    res.status(201).json({ message: "Review added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBookReviews = async (req, res) => {
  const bookId = req.params.id;

  try {
    const { data: reviews, error } = await supabase
      .from("book_ratings")
      .select("*, users(name, avatar_url)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getBooks, getBookById, getStats, createBookReview, getBookReviews };
