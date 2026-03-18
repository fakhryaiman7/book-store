import { createContext, useReducer, useEffect } from "react";

export const CartContext = createContext();

const initialState = {
  cartItems: localStorage.getItem("cartItems")
    ? JSON.parse(localStorage.getItem("cartItems"))
    : [],
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const item = action.payload;
      // Unique key is bookId + accessType (buy vs rent)
      const cartKey = `${item._id}_${item.accessType}`;
      const existItem = state.cartItems.find((x) => `${x._id}_${x.accessType}` === cartKey);
      if (existItem) {
        return {
          ...state,
          cartItems: state.cartItems.map((x) =>
            `${x._id}_${x.accessType}` === cartKey ? item : x
          ),
        };
      }
      return { ...state, cartItems: [...state.cartItems, item] };
    }
    case "REMOVE_FROM_CART":
      return {
        ...state,
        cartItems: state.cartItems.filter(
          (x) => `${x._id}_${x.accessType}` !== action.payload
        ),
      };
    case "CLEAR_CART":
      return { ...state, cartItems: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(state.cartItems));
  }, [state.cartItems]);

  const addToCart = (book) => dispatch({ type: "ADD_TO_CART", payload: book });

  const removeFromCart = (id, accessType = "rental") =>
    dispatch({ type: "REMOVE_FROM_CART", payload: `${id}_${accessType}` });

  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  return (
    <CartContext.Provider
      value={{ cartItems: state.cartItems, addToCart, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
