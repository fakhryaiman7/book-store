import { supabase } from "../config/supabase.js";

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

export const getBooks = async (req, res) => {
  try {
    const { data: books, error } = await supabase.from("books").select("*");

    if (error) {
      console.error("DB Error [getBooks]:", error);
      return res.status(500).json({ message: "Failed to fetch books" });
    }

    res.json(books?.map(mapBook) || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBookById = async (req, res) => {
  try {
    const { data: book, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(mapBook(book));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const [booksRes, usersRes, catRes] = await Promise.all([
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("books").select("category")
    ]);

    if (booksRes.error || usersRes.error || catRes.error) {
      throw new Error("Stats lookup failed");
    }

    const categories = new Set(catRes.data?.map(b => b.category).filter(Boolean));

    res.json({
      booksCount: booksRes.count || 0,
      usersCount: usersRes.count || 0,
      categoriesCount: categories.size || 0
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

export const createBookReview = async (req, res) => {
  const { rating, comment } = req.body;
  const bookId = req.params.id;
  const userId = req.user._id || req.user.id;

  try {
    const { data: existingReview } = await supabase
      .from("book_ratings")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (existingReview) {
      return res.status(400).json({ message: "You already reviewed this book" });
    }

    const { error: insertErr } = await supabase
      .from("book_ratings")
      .insert([{ user_id: userId, book_id: bookId, rating: Number(rating), comment }]);

    if (insertErr) return res.status(400).json({ message: insertErr.message });

    const { data: reviews } = await supabase
      .from("book_ratings")
      .select("rating")
      .eq("book_id", bookId);

    if (reviews?.length > 0) {
      const count = reviews.length;
      const avg = reviews.reduce((acc, r) => r.rating + acc, 0) / count;
      
      await supabase
        .from("books")
        .update({ rating_avg: avg, rating_count: count })
        .eq("id", bookId);
    }

    res.status(201).json({ message: "Review submitted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBookReviews = async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from("book_ratings")
      .select("*, users(name, avatar_url)")
      .eq("book_id", req.params.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

