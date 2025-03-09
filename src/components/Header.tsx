import { Link } from "react-router-dom"
import ToggleTheme from "@/utils/ToggleTheme"

const Header = () => {
  return (
    <header className="flex justify-center w-full bg-background text-text min-h-15">
      <div className="flex justify-between items-center px-8 py-2 mx-auto w-full">
        <div className="flex gap-4 text-xl font-bold">
          <div>BS information</div>
          <ToggleTheme/>
        </div>
        <nav className="flex space-x-4">
          <Link to={"/"} className="transition-all hover:text-blue-300">
            BS Info
          </Link>
          <Link to={"/bs-voltage"} className="transition-all hover:text-blue-300">
            BS Voltage Info
          </Link>
        </nav>
      </div>
    </header>
  )
}

export  {Header}
