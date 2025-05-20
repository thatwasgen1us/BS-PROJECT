import { Link, useParams } from "react-router-dom";
import { useGetBaseDataQuery } from "@/api/api";
import { Error, Spinner } from "@/components";
import { useState, useEffect, useMemo, useCallback } from "react";

type Props = {
  searchTerm: string;
};

const StationList: React.FC<Props> = ({ searchTerm }) => {
  const { stationId } = useParams();
  const { data, isLoading, error } = useGetBaseDataQuery();
  const uniqueStationNames = new Set();

  const [sortCriteria, setSortCriteria] = useState<'name' | 'month' | 'year'>('name'); 
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); 
  const [hideZeroBases, setHideZeroBases] = useState(() => {
    const savedValue = localStorage.getItem('hideZeroBases');
    return savedValue === 'true'; 
  });

  useEffect(() => {
    localStorage.setItem('hideZeroBases', hideZeroBases.toString());
  }, [hideZeroBases]);

  // Фильтрация станций
  const filteredStations = useMemo(() => {
    if (!data) return [];
    return data.filter((station) => {
      const isUnique = !uniqueStationNames.has(station.BS_NAME);
      uniqueStationNames.add(station.BS_NAME);
      const matchesSearchTerm = station.BS_NAME.toLowerCase().includes(searchTerm.toLowerCase());
      const isZeroBase = hideZeroBases ? Number(station.CA_52w) !== 0 : true;
      return isUnique && matchesSearchTerm && isZeroBase;
    });
  }, [data, searchTerm, hideZeroBases]);

  // Сортировка станций
  const sortedStations = useMemo(() => {
    return [...filteredStations].sort((a, b) => {
      let comparison = 0;
      switch (sortCriteria) {
        case 'name':
          comparison = a.BS_NAME.localeCompare(b.BS_NAME);
          break;
        case 'month':
          comparison = b.CA_4w - a.CA_4w; 
          break;
        case 'year':
          comparison = b.CA_52w - a.CA_52w; 
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredStations, sortCriteria, sortOrder]);

  // Обработчики для кнопок сортировки
  const handleSort = useCallback((criteria: 'name' | 'month' | 'year') => {
    setSortCriteria(criteria);
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  }, []);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Фиксированная верхняя часть */}
      <div className="sticky top-0 z-10 flex flex-col px-6 pr-8 bg-transparent">
        <div className="py-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideZeroBases}
              onChange={(e) => setHideZeroBases(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">Скрыть базы с 0% за год</span>
          </label>
        </div>
        {/* Элементы управления для сортировки */}
        <div className="flex items-center justify-around py-2 font-bold">
          <button
            className="cursor-pointer hover:text-blue-600"
            onClick={() => handleSort('name')}
          >
            База {sortCriteria === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className="cursor-pointer hover:text-blue-600"
            onClick={() => handleSort('month')}
          >
            Месяц {sortCriteria === 'month' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className="cursor-pointer hover:text-blue-600"
            onClick={() => handleSort('year')}
          >
            Год {sortCriteria === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Скроллируемая нижняя часть */}
      <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        {sortedStations.length > 0 ? (
          sortedStations.map((station, index) => (
            <Link
              to={`/base/${station.BS_NAME}`}
              key={station.BS_NAME + index}
              className={`flex items-center justify-between p-4 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md ${
                station.BS_NAME === stationId ? "bg-accent" : "bg-background hover:bg-accent"
              }`}
            >
              <div className="text-lg font-semibold text-text">
                {station.BS_NAME}
              </div>
              <div className="text-lg text-text">{Number(station.CA_4w).toFixed(2)}%</div>
              <div className="text-lg text-text">{Number(station.CA_52w).toFixed(2)}%</div>
            </Link>
          ))
        ) : (
          <div className="text-center text-gray-500">No stations found.</div>
        )}
      </div>
    </div>
  );
};

export default StationList;