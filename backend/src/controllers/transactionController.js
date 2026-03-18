import { supabase } from "../config/supabase.js";

// Helper to map transaction fields back to what frontend expects
const mapToClient = (tx) => {
  if (!tx) return null;
  return {
    ...tx,
    _id: tx.id,
    bookId: tx.book_id,
    rentalStartDate: tx.rental_start_date,
    rentalEndDate: tx.rental_end_date,
    totalPrice: tx.total_price,
    isReturned: tx.is_returned
  };
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const addTransactionItems = async (req, res) => {
  const { bookId, rentalStartDate, rentalEndDate, totalPrice } = req.body;

  if (!bookId) {
    res.status(400);
    throw new Error("No book selected");
  }

  // 1. Fetch book to verify stock
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    res.status(404);
    throw new Error("Book not found");
  }

  if (book.count_in_stock <= 0) {
    res.status(400);
    throw new Error("Book is out of stock");
  }

  // 2. Reduce book stock
  const { error: updateError } = await supabase
    .from("books")
    .update({ count_in_stock: book.count_in_stock - 1 })
    .eq("id", bookId);

  if (updateError) {
    res.status(500);
    throw new Error("Failed to update stock");
  }

  // 3. Create transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert([
      {
        user_id: req.user._id,
        book_id: bookId,
        rental_start_date: rentalStartDate,
        rental_end_date: rentalEndDate,
        total_price: totalPrice,
        is_returned: false
      }
    ])
    .select()
    .single();

  if (txError) {
    res.status(500);
    throw new Error("Failed to create transaction");
  }

  res.status(201).json(mapToClient(transaction));
};

// @desc    Get logged in user transactions
// @route   GET /api/transactions/mytransactions
// @access  Private
const getMyTransactions = async (req, res) => {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      *,
      book:books(id, title, image, price_per_day)
    `)
    .eq("user_id", req.user._id);

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  // Map to client schema with _id and camelCase props
  res.json(transactions.map(mapToClient));
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      *,
      user:users(name, email),
      book:books(title, image)
    `)
    .eq("id", req.params.id)
    .single();

  if (error || !transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }

  // Only user who made it or admin
  if (
    transaction.user_id.toString() === req.user._id.toString() ||
    req.user.isAdmin
  ) {
    res.json(mapToClient(transaction));
  } else {
    res.status(401);
    throw new Error("Not authorized to view this transaction");
  }
};

export { addTransactionItems, getMyTransactions, getTransactionById };
