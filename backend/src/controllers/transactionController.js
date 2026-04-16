import { supabase } from "../config/supabase.js";

// @desc    Process a full checkout (multi-item)
// @route   POST /api/transactions/checkout
// @access  Private
const checkout = async (req, res) => {
  const { items, paymentMethod } = req.body;
  const userId = req.user._id;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error("No items in cart");
  }

  try {
    const results = [];
    const now = new Date();

    // 1. Create a Primary Order Record
    const totalOrderAmount = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([{
        user_id: userId,
        total_amount: totalOrderAmount,
        payment_status: "paid", // Mocked as paid
        order_status: "completed",
      }])
      .select()
      .single();

    if (orderErr) throw new Error("Backend Order creation failed: " + orderErr.message);

    // 2. Process each item (Rentals vs Purchases)
    for (const item of items) {
      const bookId = item.id || item._id;
      const isRental = item.accessType === "rent" || item.accessType === "rental";
      const totalCost = item.totalPrice || 0;

      // Handle Rental
      if (isRental) {
        const rentDays = item.rentDays || 1;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + rentDays);

        const { data: rental, error: rentalErr } = await supabase.from("rentals").insert([{
          user_id: userId,
          book_id: bookId,
          rental_days: rentDays,
          rental_price_per_day: parseFloat(item.pricePerDay || 0),
          total_rental_cost: totalCost,
          rental_start_date: now.toISOString(),
          rental_due_date: dueDate.toISOString(),
          status: "active",
        }]).select().single();

        if (rentalErr) throw new Error(`Rental failed for ${bookId}: ${rentalErr.message}`);

        // Grant Access
        await supabase.from("user_book_access").upsert([{
          user_id: userId,
          book_id: bookId,
          access_type: "rental",
          expires_at: dueDate.toISOString(),
          is_active: true,
          rental_id: rental.id,
        }], { onConflict: "user_id,book_id,access_type" });

      } else {
        // Handle Purchase
        const { error: accessErr } = await supabase.from("user_book_access").upsert([{
          user_id: userId,
          book_id: bookId,
          access_type: "purchase",
          expires_at: null,
          is_active: true,
        }], { onConflict: "user_id,book_id,access_type" });

        if (accessErr) throw new Error(`Purchase access failed for ${bookId}: ${accessErr.message}`);
      }

      // 3. Decrement Stock
      const { data: book } = await supabase.from("books").select("count_in_stock").eq("id", bookId).single();
      if (book) {
        await supabase.from("books").update({ count_in_stock: Math.max(0, book.count_in_stock - 1) }).eq("id", bookId);
      }
    }

    res.status(201).json({ success: true, orderId: order.id });

  } catch (error) {
    console.error("Checkout Error:", error.message);
    res.status(500);
    throw new Error(error.message);
  }
};

// @desc    Get logged in user transactions (simplified)
const getMyTransactions = async (req, res) => {
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`*`)
    .eq("user_id", req.user._id);

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }
  res.json(orders);
};

export { checkout, getMyTransactions };
