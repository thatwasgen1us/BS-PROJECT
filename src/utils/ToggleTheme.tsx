import { useTheme } from "./ThemeContext";

const ToggleTheme = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={`relative inline-flex items-center cursor-pointer w-14 h-8 ${
        theme === "dark" ? "bg-blue-600" : "bg-gray-300"
      } rounded-full p-1 transition-colors duration-300`}
      onClick={toggleTheme}
    >
      <span
        className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
          theme === "dark" ? "translate-x-6" : "translate-x-0"
        }`}
      />

      <span
        className={`absolute left-1 text-sm ${
          theme === "dark" ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
      >
        ☀️
      </span>
      <span
        className={`absolute right-1 text-sm ${
          theme === "dark" ? "opacity-100" : "opacity-0"
        } transition-opacity duration-300`}
      >
        🌙
      </span>
    </div>
  );
};

export default ToggleTheme;
