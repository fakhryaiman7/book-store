import { supabase } from "../config/supabase.js";

const checkout = async (req, res) => {
  const { items, paymentMethod } = req.body;
  const userId = req.user._id || req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  console.log(`Processing checkout for User: ${userId}, Items: ${items.length}`);

  try {
    let lastOrder = null;

    for (const item of items) {
       // Ensure bookId is pulled correctly
      const bookId = item.id || item._id;
      const { accessType, totalPrice, rentDays, pricePerDay } = item;
      const now = new Date();

      if (!bookId) {
        console.warn("Skipping item with missing ID");
        continue;
      }

      const isRental = accessType === "rent" || accessType === "rental";

      if (isRental) {
        // --- RENTAL FLOW ---
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (parseInt(rentDays) || 1));

        // 1. Create Rental Record
        const { data: rental, error: rentalErr } = await supabase
          .from("rentals")
          .insert([{
            user_id: userId,
            book_id: bookId,
            rental_days: parseInt(rentDays) || 1,
            rental_price_per_day: parseFloat(pricePerDay || 0),
            total_rental_cost: parseFloat(totalPrice || 0),
            rental_start_date: now.toISOString(),
            rental_due_date: dueDate.toISOString(),
            status: "active",
          }])
          .select()
          .single();

        if (rentalErr) throw new Error(`Rental DB Error: ${rentalErr.message}`);

        // 2. Grant Access
        const { error: accessErr } = await supabase
          .from("user_book_access")
          .upsert([{
            user_id: userId,
            book_id: bookId,
            access_type: "rental",
            expires_at: dueDate.toISOString(),
            is_active: true,
            rental_id: rental.id,
            granted_at: now.toISOString(),
          }], { onConflict: "user_id,book_id,access_type" });

        if (accessErr) throw new Error(`Access DB Error (Rental): ${accessErr.message}`);

      } else {
        // --- PURCHASE FLOW ---
        // 1. Create Order
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert([{
            user_id: userId,
            total_amount: parseFloat(totalPrice || 0),
            payment_status: "paid",
            order_status: "completed",
            created_at: now.toISOString()
          }])
          .select()
          .single();

        if (orderErr) throw new Error(`Order DB Error: ${orderErr.message}`);
        lastOrder = order;

        // 2. Grant Permanent Access
        const { error: accessErr } = await supabase
          .from("user_book_access")
          .upsert([{
            user_id: userId,
            book_id: bookId,
            access_type: "purchase",
            expires_at: null,
            is_active: true,
            granted_at: now.toISOString(),
          }], { onConflict: "user_id,book_id,access_type" });

        if (accessErr) throw new Error(`Access DB Error (Purchase): ${accessErr.message}`);
      }

      // 3. Decrement Stock
      try {
        const { data: bData } = await supabase.from("books").select("count_in_stock").eq("id", bookId).single();
        if (bData && bData.count_in_stock > 0) {
          await supabase.from("books").update({ count_in_stock: bData.count_in_stock - 1 }).eq("id", bookId);
        }
      } catch (stockErr) {
        console.warn("Stock update failed (non-critical):", stockErr.message);
      }
    }

    console.log("Checkout completed successfully for user:", userId);

    res.status(200).json({
      success: true,
      message: "Checkout successful. Books added to your library.",
      orderId: lastOrder?.id
    });

  } catch (err) {
    console.error("FATAL Checkout Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Checkout failed at the database level.",
      error: err.message 
    });
  }
};

const getMyLibrary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Fetch rentals
    const { data: rentals, error: rentErr } = await supabase
      .from("rentals")
      .select("*, book:books(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (rentErr) throw rentErr;

    // Fetch purchases
    const { data: purchases, error: purchaseErr } = await supabase
      .from("user_book_access")
      .select("*, book:books(*)")
      .eq("user_id", userId)
      .eq("access_type", "purchase")
      .eq("is_active", true)
      .order("granted_at", { ascending: false });

    if (purchaseErr) throw purchaseErr;

    res.json({
      success: true,
      rentals: rentals || [],
      purchases: purchases || []
    });

  } catch (err) {
    console.error("Library Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export { checkout, getMyTransactions, getMyLibrary };
