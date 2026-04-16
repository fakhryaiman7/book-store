import { supabase } from "../config/supabase.js";

const checkout = async (req, res) => {
  const { items, paymentMethod } = req.body;
  const userId = req.user._id || req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  // --- Helper: UUID Validation ---
  const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  // --- Helper: RPC Retry Mechanism ---
  const retryRPC = async (fnName, params, retries = 2) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        const { data, error } = await supabase.rpc(fnName, params);
        if (error) throw error;
        if (!data) throw new Error("RPC returned null data unexpectedly");
        return { data, error: null };
      } catch (err) {
        lastError = err;
        console.warn(`[RETRY] RPC ${fnName} failed (attempt ${i + 1}/${retries + 1}):`, err.message || err);
        if (i < retries) await new Promise(res => setTimeout(res, 500 * (i + 1))); 
      }
    }
    return { data: null, error: lastError };
  };

  try {
    // 1. Check for existing active access to prevent duplicate spending
    for (const item of items) {
       const bId = item.id || item._id;
       if (!isValidUUID(bId)) continue;

       const { data: existingAccess } = await supabase
         .from("user_book_access")
         .select("*")
         .eq("user_id", userId)
         .eq("book_id", bId)
         .eq("is_active", true);

       if (existingAccess && existingAccess.length > 0) {
         for (const access of existingAccess) {
           const isPermanent = access.access_type === 'purchase';
           const isExpired = access.expires_at && new Date(access.expires_at) < new Date();
           
           if (isPermanent || !isExpired) {
             return res.status(400).json({ 
               success: false, 
               message: `You already have active access to "${item.title}". You cannot purchase/rent it again until it expires.` 
             });
           }
         }
       }
    }

    let lastOrder = null;
    const now = new Date();

    for (const item of items) {
      const bookId = item.id || item._id;
      const { accessType, totalPrice, rentDays, pricePerDay } = item;

      if (!bookId || !isValidUUID(bookId)) continue;
      if (!userId || !isValidUUID(userId)) throw new Error(`Invalid User ID format: ${userId}`);

      const isRental = accessType === "rent" || accessType === "rental";

      if (isRental) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (parseInt(rentDays) || 1));

        const { data: rental, error: rentalErr } = await retryRPC("create_rental_with_access", {
          p_user_id: userId,
          p_book_id: bookId,
          p_rental_days: parseInt(rentDays) || 1,
          p_price_per_day: parseFloat(pricePerDay || 0),
          p_total_cost: parseFloat(totalPrice || 0),
          p_start_date: now.toISOString(),
          p_due_date: dueDate.toISOString()
        });

        if (rentalErr) {
           const detailedError = rentalErr.details || rentalErr.hint || rentalErr.message || "Atomic transaction error";
           throw new Error(`Checkout failed: ${detailedError}`);
        }
      } else {
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

      // Stock management (background)
      supabase.from("books").select("count_in_stock").eq("id", bookId).single().then(({data}) => {
        if (data && data.count_in_stock > 0) {
          supabase.from("books").update({ count_in_stock: data.count_in_stock - 1 }).eq("id", bookId).then(() => {});
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Checkout successful. Books added to your library.",
      orderId: lastOrder?.id
    });

  } catch (err) {
    console.error("[FATAL] Checkout Process Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Checkout failed at the database level.",
      error: err.message || "An unexpected error occurred"
    });
  }
};

const getMyLibrary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const { data: rentals, error: rentErr } = await supabase
      .from("rentals")
      .select("*, book:books(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (rentErr) throw rentErr;

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
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyTransactions = async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", req.user._id || req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { checkout, getMyTransactions, getMyLibrary };
