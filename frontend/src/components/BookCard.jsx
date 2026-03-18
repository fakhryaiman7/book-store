import { Link } from "react-router-dom";

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);

const BookCard = ({ book }) => {
  const purchasePrice = book.purchase_price || book.purchasePrice || (book.pricePerDay || book.price_per_day) * 10;
  const rentalPrice = book.rental_price || book.rentalPrice || book.price_per_day || book.pricePerDay;
  const inStock = (book.count_in_stock ?? book.countInStock ?? 0) > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full transform hover:-translate-y-1 border border-transparent dark:border-gray-800">
      <Link to={`/book/${book._id || book.id}`} className="block relative overflow-hidden h-56">
        <img
          src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f"}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {!inStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold bg-red-600 px-3 py-1 rounded">Out of Stock</span>
          </div>
        )}
        <span className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur text-primary dark:text-primary-light text-xs px-2 py-1 rounded-full font-semibold shadow">
          {book.category}
        </span>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/book/${book._id || book.id}`} className="hover:text-primary transition-colors">
          <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 mb-1">{book.title}</h3>
        </Link>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">by {book.author}</p>

        {/* Pricing row */}
        <div className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Rent from</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(rentalPrice)}<span className="text-xs font-normal text-gray-400">/day</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Buy for</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(purchasePrice)}</p>
            </div>
          </div>

          <Link
            to={`/book/${book._id || book.id}`}
            className="block text-center bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors duration-200 px-4 py-2 rounded-lg font-semibold text-sm"
          >
            View Book
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
