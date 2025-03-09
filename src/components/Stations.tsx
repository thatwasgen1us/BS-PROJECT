import StationList from "@/components/StationList"
import { useState } from "react"

const Stations = () => {
  const [searchTerm, setSearchTerm ] = useState<string>('')
  
  return (
    <aside className="min-w-[350px] bg-blue-50 rounded-lg shadow-lg p-4 overflow-y-scroll mb-12 scrollbar-none">
      <div>
        
      {/* Поле ввода */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Поиск..."
            className="px-4 py-2 w-full rounded-lg border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Заголовки */}
      <div className="mb-4">
        <div className="flex justify-between items-center px-4 text-lg font-semibold text-gray-700">
          <div>Base</div>
          <div>Month</div>
          <div>Year</div>
        </div>
      </div>
      <StationList searchTerm={searchTerm}/>
    </aside>
  )
}

export {Stations}
