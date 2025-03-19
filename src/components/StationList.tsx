import { Link, useParams } from "react-router-dom";
import { useGetBaseDataQuery } from "@/api/api";
import { Error, Spinner } from "@/components";
import { useState } from "react";

type Props = {
  searchTerm: string;
};

const StationList: React.FC<Props> = ({ searchTerm }) => {
  const { stationId } = useParams();
  const { data, isLoading, error } = useGetBaseDataQuery();
  const uniqueStationNames = new Set();

  const [sortCriteria, setSortCriteria] = useState<'name' | 'month' | 'year'>('name'); 
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); 
  const [hideZeroBases, setHideZeroBases] = useState(false); 

  const filteredStations = data
    ? data.filter((station) => {
        const isUnique = !uniqueStationNames.has(station.BS_NAME);
        uniqueStationNames.add(station.BS_NAME);
        const matchesSearchTerm = station.BS_NAME.toLowerCase().includes(searchTerm.toLowerCase());
        const isZeroBase = hideZeroBases ? Number(station.CA_52w) !== 0 : true;
        return isUnique && matchesSearchTerm && isZeroBase;
      })
    : [];

  const sortedStations = filteredStations.sort((a, b) => {
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

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <div className="space-y-2">
      <div className="px-2 mt-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideZeroBases}
              onChange={(e) => setHideZeroBases(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded form-checkbox focus:ring-blue-500"
            />
            <span className="text-gray-700">Скрыть базы с 0% за год</span>
          </label>
        </div>
      {/* Элементы управления для сортировки и чекбокс */}
      <div className="mb-4">
        <div className="flex justify-between px-2">
          <button
            className="cursor-pointer"
            onClick={() => {
              setSortCriteria('name');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); 
            }}>
            База {sortCriteria === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className="cursor-pointer"
            onClick={() => {
              setSortCriteria('month');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); 
            }}>
            Месяц {sortCriteria === 'month' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className="cursor-pointer" 
            onClick={() => {
              setSortCriteria('year');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); 
            }}>
            Год {sortCriteria === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {sortedStations.length > 0 ? (
        sortedStations.map((station, index) => (
          <Link
            to={`/base/${station.BS_NAME}`}
            key={station.BS_NAME + index}
            className={station.BS_NAME === stationId ? "flex items-center justify-between p-4 transition-all duration-200 rounded-lg shadow-sm bg-accent hover:shadow-md" : "flex items-center justify-between p-4 transition-all duration-200 rounded-lg shadow-sm bg-background hover:shadow-md hover:bg-accent"}
          >
            <div className="text-lg font-semibold text-text">
              {station.BS_NAME}
            </div>
            <div className="text-lg text-text">{Number(station.CA_4w).toFixed(2)}%</div>
            <div className="text-lg text-text">{Number(station.CA_52w).toFixed(2)}%</div>
          </Link>
        ))
      ) : (
        <div>No stations found.</div>
      )}
    </div>
  );
};

export default StationList;
