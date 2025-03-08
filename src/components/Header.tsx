import { Link } from "react-router-dom"
import ToggleTheme from "@/utils/ToggleTheme"
import { useTheme } from "@/utils/ThemeContext"

const Header = () => {
  const {theme} = useTheme()

  
  return (
    <header className="flex justify-center bg-background text-text min-h-15">
      <div className="container flex justify-between items-center mx-auto">
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
