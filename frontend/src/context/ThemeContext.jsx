import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Use lazy initializer for better performance
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // 1. Prepare for transition
    root.classList.add('theme-switching');
    
    // 2. Immediate DOM update (Bypasses React's render loop for zero lag)
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 3. Update React State & Persistence
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // 4. Cleanup after transition duration
    setTimeout(() => {
      root.classList.remove('theme-switching');
    }, 450); 
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
