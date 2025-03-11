import { ToggleTheme } from "@/components/ToggleTheme";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="flex justify-center w-full bg-background text-text min-h-15">
      <div className="flex items-center justify-between w-full px-8 py-2 mx-auto">
        <div className="flex gap-4 text-xl font-bold">
          <div>Информация по БС</div>
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
        </nav>
      </div>
    </header>
  );
};

export { Header };
