import StationList from "@/components/StationList";
import { useState } from "react";

const Stations = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  return (
    <aside className="min-w-[350px] bg-blue-50 rounded-lg shadow-lg scrollbar-none pb-6 h-full overflow-hidden">
      <div>
        {/* Поле ввода */}
        <div className="p-4 pb-0 mb-6">
          <input
            type="text"
            placeholder="Поиск..."
            className="w-full px-4 py-2 transition-all duration-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Заголовки */}
      <StationList searchTerm={searchTerm} />
    </aside>
  );
};

export { Stations };
