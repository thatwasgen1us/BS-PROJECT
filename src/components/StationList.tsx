import { bases } from '@/mock'
import { Link } from 'react-router-dom'

type Props = {
  searchTerm: string
}

const StationList: React.FC<Props> = ({ searchTerm }) => {

  const uniqueStationNames = new Set();
  const filteredStations = bases.filter((station) => {
  const isUnique = !uniqueStationNames.has(station.name);
  uniqueStationNames.add(station.name);
  return isUnique && station.name.toLowerCase().includes(searchTerm.toLowerCase());
});
  
  return (
    <div className='space-y-2'>
      {filteredStations.length > 0 ? (
  filteredStations.map((station, index) => (
    <Link
      to={`/base/${station.name}`}
      key={station.name + index}
      className="flex justify-between items-center p-4 rounded-lg shadow-sm transition-all duration-200 bg-background hover:shadow-md hover:bg-accent"
    >
      <div className="text-lg font-semibold text-text">{station.name}</div>
      <div className="text-lg text-text">{station.month}%</div>
      <div className="text-lg text-text">{station.year}%</div>
    </Link>
  ))
) : (
  <div>No stations found.</div>
)}
    </div>
  )
}

export default StationList
