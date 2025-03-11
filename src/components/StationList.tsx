import { Link } from "react-router-dom";
import { useGetBaseDataQuery } from "@/api/api";
import { Error, Spinner } from "@/components";

type Props = {
  searchTerm: string;
};

const StationList: React.FC<Props> = ({ searchTerm }) => {
  const { data, isLoading, error } = useGetBaseDataQuery();
  const uniqueStationNames = new Set();

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

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <div className="space-y-2">
      {filteredStations.length > 0 ? (
        filteredStations.map((station, index) => (
          <Link
            to={`/base/${station.BS_NAME}`}
            key={station.BS_NAME + index}
            className="flex items-center justify-between p-4 transition-all duration-200 rounded-lg shadow-sm bg-background hover:shadow-md hover:bg-accent"
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
