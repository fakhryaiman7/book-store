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
  count_in_stock: fields.countInStock,
  user_id: userId
});

const mapToClient = (book) => ({
  ...book,
  _id: book.id,
  pricePerDay: book.price_per_day,
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

export { createBook, updateBook, deleteBook, internalizeFile };

