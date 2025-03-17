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

  const filteredStations = data
    ? data.data.filter((station) => {
        const isUnique = !uniqueStationNames.has(station.BS_NAME);
        uniqueStationNames.add(station.BS_NAME);
        return (
          isUnique &&
          station.BS_NAME.toLowerCase().includes(searchTerm.toLowerCase())
        );
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
      {/* Элементы управления для сортировки */}
      <div className="mb-4">
        <div className="flex justify-between">
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
            <div className="text-lg text-text">{station.CA_4w}%</div>
            <div className="text-lg text-text">{station.CA_52w}%</div>
          </Link>
        ))
      ) : (
        <div>No stations found.</div>
      )}
    </div>
  );
};

export default StationList;
