import { supabase } from "../config/supabase.js";
import axios from "axios";


// Helper for mapping payload
const mapToDb = (fields, userId) => ({
  title: fields.title,
  author: fields.author,
  image: fields.image,
  category: fields.category,
  description: fields.description,
  price_per_day: fields.pricePerDay,
  purchase_price: fields.purchasePrice || fields.purchase_price,
  discount_price: fields.discountPrice || fields.discount_price,
  count_in_stock: fields.countInStock,
  user_id: userId
});

const mapToClient = (book) => ({
  ...book,
  _id: book.id,
  pricePerDay: book.price_per_day,
  purchasePrice: book.purchase_price,
  discountPrice: book.discount_price,
  countInStock: book.count_in_stock
});

// @desc    Create a new book
// @route   POST /api/admin/books
// @access  Private/Admin
const createBook = async (req, res) => {
  const insertData = mapToDb(req.body, req.user._id);

  const { data: createdBook, error } = await supabase
    .from("books")
    .insert([insertData])
    .select()
    .single();

  if (error) {
    res.status(400);
    throw new Error(error.message);
  }

  res.status(201).json(mapToClient(createdBook));
};

// @desc    Update a book
// @route   PUT /api/admin/books/:id
// @access  Private/Admin
const updateBook = async (req, res) => {
  const { data: book, error: findError } = await supabase
    .from("books")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (findError || !book) {
    res.status(404);
    throw new Error("Book not found");
  }

  const updateData = {
    title: req.body.title || book.title,
    author: req.body.author || book.author,
    image: req.body.image || book.image,
    category: req.body.category || book.category,
    description: req.body.description || book.description,
    price_per_day: req.body.pricePerDay || book.price_per_day,
    purchase_price: req.body.purchasePrice || req.body.purchase_price || book.purchase_price,
    discount_price: req.body.discountPrice !== undefined ? req.body.discountPrice : (req.body.discount_price !== undefined ? req.body.discount_price : book.discount_price),
    count_in_stock: req.body.countInStock !== undefined ? req.body.countInStock : book.count_in_stock,
  };

  const { data: updatedBook, error: updateError } = await supabase
    .from("books")
    .update(updateData)
    .eq("id", req.params.id)
    .select()
    .single();

  if (updateError) {
    res.status(400);
    throw new Error(updateError.message);
  }

  res.json(mapToClient(updatedBook));
};

// @desc    Delete a book
// @route   DELETE /api/admin/books/:id
// @access  Private/Admin
const deleteBook = async (req, res) => {
  const { data: book, error: findError } = await supabase
    .from("books")
    .select("id")
    .eq("id", req.params.id)
    .single();

  if (findError || !book) {
    res.status(404);
    throw new Error("Book not found");
  }

  const { error: deleteError } = await supabase
    .from("books")
    .delete()
    .eq("id", req.params.id);

  if (deleteError) {
    res.status(400);
    throw new Error(deleteError.message);
  }

  res.json({ message: "Book removed" });
};

// @desc    Download a file from an external URL and upload to Supabase Storage
// @route   POST /api/admin/internalize
// @access  Private/Admin
const internalizeFile = async (req, res) => {
  const { url, bucket, folder } = req.body;
  
  if (!url || typeof url !== 'string') return res.status(400).json({ message: 'Missing or invalid URL' });
  if (url.includes("supabase.co") || url.includes("localhost")) return res.json({ url });
  
  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const buffer = Buffer.from(resp.data);
    
    const contentType = resp.headers['content-type'] || 'application/octet-stream';
    
    // Protect against HTML login/redirect pages being saved as PDFs or EPUBs
    if (bucket === 'book-files' && contentType.includes('text/html')) {
      throw new Error('Source returned an HTML page instead of a readable file (likely requires authentication or is a redirect).');
    }

    let ext = url.split('.').pop().split(/[?#]/)[0];
    if (bucket === 'book-covers') {
      ext = ext && ext.length <= 4 ? ext : 'jpg';
    } else {
      if (!ext || ext.length > 4 || ext === 'images' || ext === 'bin') {
        if (contentType.includes('epub') || url.toLowerCase().includes('.epub')) ext = 'epub';
        else if (contentType.includes('pdf') || url.toLowerCase().includes('.pdf')) ext = 'pdf';
        else ext = 'pdf';
      }
    }

    const name = `${folder}/${folder}-${Date.now()}-${Math.floor(Math.random()*1000)}.${ext || 'bin'}`;
    
    const { error: uploadError } = await supabase.storage.from(bucket).upload(name, buffer, {
      contentType,
      upsert: false
    });
    
    if (uploadError) {
      res.status(500);
      throw new Error(`Supabase Error: ${uploadError.message}`);
    }
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(name);
    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Internalization Error:", err.message);
    res.status(500);
    throw new Error(err.message || 'Server error during internalization');
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    // 1. Total Revenue from successful orders and rentals
    const [ordersResult, rentalsResult] = await Promise.all([
      supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
      supabase.from("rentals").select("total_rental_cost")
    ]);

    const ordersRevenue = ordersResult.data?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;
    const rentalsRevenue = rentalsResult.data?.reduce((sum, rental) => sum + (parseFloat(rental.total_rental_cost) || 0), 0) || 0;
    const totalRevenue = ordersRevenue + rentalsRevenue;

    // 2. Active Rentals
    const { count: activeRentals } = await supabase.from("rentals").select("*", { count: "exact", head: true }).eq("status", "active");

    // 3. Books Count
    const { count: booksCount } = await supabase.from("books").select("*", { count: "exact", head: true });

    // 4. Users Count
    const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });

    // 5. Debug info
    const { count: purchasesCount, error: pErr } = await supabase.from("user_book_access").select("*", { count: "exact", head: true }).eq("access_type", "purchase");
    if (pErr) console.warn("Debug info fetch failed:", pErr.message);

    res.json({
      totalRevenue,
      activeRentals: activeRentals || 0,
      booksCount: booksCount || 0,
      usersCount: usersCount || 0,
      debug: {
        rentals: activeRentals || 0,
        purchases: purchasesCount || 0,
        v: "1.1.0"
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAdminUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, first_name, email, is_admin, phone, birth_date, gender, country, province, address, avatar_url, created_at, is_active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error in getAdminUsers:", error);
      return res.status(500).json({ message: error.message, details: error });
    }
    
    if (!users) {
      console.error("Supabase returned null for getAdminUsers.");
      return res.status(500).json({ message: "Failed to retrieve users." });
    }

    res.json(users);
  } catch (err) {
    console.error("Exception in getAdminUsers:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

// @desc    Get all orders/rentals
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAdminOrders = async (req, res) => {
  try {
    console.log("Fetching admin orders...");
    
    // 1. Fetch rentals with simple JOIN
    const { data: rentals, error: rentErr } = await supabase
      .from("rentals")
      .select(`
        id, created_at, status, rental_days, total_rental_cost, rental_due_date, return_date,
        book:books(title, purchase_price),
        user:users(name, email)
      `)
      .order("created_at", { ascending: false });

    // 2. Fetch purchases with simple JOIN
    const { data: purchases, error: purchaseErr } = await supabase
      .from("user_book_access")
      .select(`
        id, created_at, granted_at, is_active, access_type,
        book:books(title, purchase_price),
        user:users(name, email)
      `)
      .eq("access_type", "purchase")
      .order("created_at", { ascending: false });

    // 3. Combine and ensure NO failures on missing joins
    const combined = [
      ...(rentals || []).map(r => ({ 
        ...r, 
        access_type: "rental",
        user: r.user || { name: "Unknown User", email: "" },
        book: r.book || { title: "Unknown Book", purchase_price: 0 }
      })),
      ...(purchases || []).map(p => ({ 
        ...p, 
        access_type: "purchase",
        total_rental_cost: p.book?.purchase_price || 0,
        rental_start_date: p.granted_at || p.created_at,
        status: p.is_active ? "active" : "inactive",
        user: p.user || { name: "Unknown User", email: "" },
        book: p.book || { title: "Unknown Book", purchase_price: 0 }
      }))
    ].sort((a, b) => {
      const dateA = new Date(a.created_at || a.granted_at || a.rental_start_date || 0);
      const dateB = new Date(b.created_at || b.granted_at || b.rental_start_date || 0);
      return dateB - dateA;
    });

    console.log(`Total combined transactions: ${combined.length}`);
    res.json(combined);
  } catch (err) {
    console.error("getAdminOrders Detailed Error:", err);
    res.status(500).json({ 
      message: err.message,
      hint: "Check Supabase RLS or table connections",
      details: err
    });
  }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateAdminUser = async (req, res) => {
  try {
    const { name, first_name, email, is_admin, is_active, phone, birth_date, gender, country, province, address } = req.body;
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ 
        name, 
        first_name,
        email, 
        is_admin, 
        is_active, 
        phone, 
        birth_date, 
        gender, 
        country, 
        province, 
        address,
        updated_at: new Date().toISOString() 
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteAdminUser = async (req, res) => {
  try {
    const { error } = await supabase.from("users").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update order/rental status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateAdminOrder = async (req, res) => {
  try {
    const { status, return_date, is_active } = req.body;
    const rentalId = req.params.id;

    // 1. Update rentals table if it's a rental
    const { data: rental, error: rentErr } = await supabase
      .from("rentals")
      .update({ status, return_date, updated_at: new Date().toISOString() })
      .eq("id", rentalId)
      .select()
      .single();

    // 2. Sync with user_book_access
    await supabase
      .from("user_book_access")
      .update({ is_active: is_active ?? (status === 'active') })
      .eq("rental_id", rentalId);

    // 3. Stock management if returned
    if (status === 'returned' && rental) {
       const { data: b } = await supabase.from("books").select("count_in_stock").eq("id", rental.book_id).single();
       if (b) await supabase.from("books").update({ count_in_stock: (b.count_in_stock || 0) + 1 }).eq("id", rental.book_id);
    }

    res.json({ message: "Order updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { 
  createBook, 
  updateBook, 
  deleteBook, 
  internalizeFile, 
  getAdminStats, 
  getAdminUsers, 
  getAdminOrders,
  updateAdminUser,
  deleteAdminUser,
  updateAdminOrder
};

