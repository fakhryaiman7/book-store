import bcrypt from "bcryptjs";

export const users = [
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "password123", // Will be hashed by pre-save middleware ideally, but seeder will handle it
    isAdmin: true,
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    isAdmin: false,
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password123",
    isAdmin: false,
  },
];

export const books = [
  {
    title: "1984",
    author: "George Orwell",
    image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=2730&auto=format&fit=crop",
    category: "Sci-Fi",
    description: "A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism.",
    pricePerDay: 2.99,
    countInStock: 5,
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=2687&auto=format&fit=crop",
    category: "Classic",
    description: "A 1925 novel about the tragic story of Jay Gatsby, a self-made millionaire, and his pursuit of Daisy Buchanan.",
    pricePerDay: 1.50,
    countInStock: 3,
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2712&auto=format&fit=crop",
    category: "Drama",
    description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
    pricePerDay: 4.00,
    countInStock: 0,
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    image: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=2574&auto=format&fit=crop",
    category: "Sci-Fi",
    description: "Set in the distant future amidst a feudal interstellar society, Dune tells the story of Paul Atreides.",
    pricePerDay: 3.50,
    countInStock: 10,
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?q=80&w=2680&auto=format&fit=crop",
    category: "Fantasy",
    description: "A children's fantasy novel about Bilbo Baggins and his quest to win a share of the treasure guarded by Smaug the dragon.",
    pricePerDay: 2.50,
    countInStock: 7,
  },
];
