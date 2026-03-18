import { supabase } from "../config/supabase.js";

// Helper to map Postgres snake_case/id to Mongoose style for frontend compatibility
const mapBook = (book) => {
  if (!book) return null;
  return {
    ...book,
    _id: book.id,
    pricePerDay: book.price_per_day,
    countInStock: book.count_in_stock,
    purchasePrice: book.purchase_price,
    rentalPrice: book.rental_price || book.price_per_day,
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
  const { data: books, error } = await supabase.from("books").select("*");

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  res.json(books.map(mapBook));
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

export { getBooks, getBookById };
