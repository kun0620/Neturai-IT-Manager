import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-subtle dark:shadow-md-dark"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
