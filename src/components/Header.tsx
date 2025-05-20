import { ToggleTheme } from "@/components/ToggleTheme";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="flex justify-center w-full header bg-background text-text min-h-15">
      <div className="flex items-center justify-between w-full px-8 py-2 mx-auto">
        <div className="flex gap-4 text-xl font-bold">
          <Link to={'/'}>Информация по БС</Link>
          <ToggleTheme />
        </div>
        <nav className="flex space-x-4">
          <Link to={"/"} className="transition-all hover:text-blue-300">
            БС Инфо
          </Link>
          <Link
            to={"/bs-voltage"}
            className="transition-all hover:text-blue-300"
          >
            Напряжение на БС
          </Link>
          <Link
            to={"/bs-voltage-schedule"}
            className="transition-all hover:text-blue-300"
          >
            График напряжения БС
          </Link>
        </nav>
      </div>
    </header>
  );
};

export { Header };