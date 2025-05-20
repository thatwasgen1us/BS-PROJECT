import { ExternalApiResponse, useGetLastDataFromExternalApiQuery } from '../api/api';
import { Spinner } from '../components';
import PowerOutageMap from '../components/PowerOutageMap';

export interface TransformedStation {
  id: string;
  name: string;
  location: string;
  voltage: number | null;
  alarms: Record<string, string> | string;
  coordinates: [number, number] | null;
  last_update: string;
  priority: string;
  work_order: string;
  visited: boolean;
  comment: string;
}

export const transformStationData = (data: ExternalApiResponse): TransformedStation[] => {
  return data.flatMap(item => {
    const stationKey = Object.keys(item)[0];
    const stationData = item[stationKey];

    return {
      id: stationKey,
      name: stationKey,
      location: stationData.Location,
      voltage: stationData.voltage === "БС недоступна" ? null : parseFloat(stationData.voltage || '0'),
      alarms: stationData.alarms,
      coordinates: stationData.latitude && stationData.longitude
        ? [parseFloat(stationData.latitude), parseFloat(stationData.longitude)]
        : null,
      last_update: stationData.Время_аварии,
      priority: stationData.Приоритет,
      work_order: stationData.Наряд_на_работы,
      visited: stationData.Посещение === "true",
      comment: stationData.Комментарий
    };
  });
};

const OutageDashboard = () => {
  const { data: rawStations, isLoading } = useGetLastDataFromExternalApiQuery();

  // Преобразуем данные при получении
  const stations = rawStations ? transformStationData(rawStations) : [];

  // Фильтруем станции без питания
  const outageStations = stations.filter(s => s.voltage === 0 || s.voltage === null);

  // Станции без координат
  const stationsWithoutCoords = stations.filter(s => !s.coordinates);

  if (isLoading) return <div className='flex items-center justify-center text-5xl text-text h-[100vh]'><Spinner/></div>;

  return (
    <div style={{ padding: '20px', marginTop: '40px' }}>
      <h1 className='text-text'>Базы с отключенным питанием</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div className="status-box">
          <h3>Всего баз</h3>
          <p>{stations.length}</p>
        </div>
        <div className="status-box" style={{ backgroundColor: '#ffebee' }}>
          <h3>Без питания</h3>
          <p>{outageStations.length}</p>
        </div>
        <div className="status-box" style={{ backgroundColor: '#fff8e1' }}>
          <h3>Без координат</h3>
          <p>{stationsWithoutCoords.length}</p>
        </div>
      </div>

      <PowerOutageMap stations={outageStations} />

      {stationsWithoutCoords.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Станции без координат</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '15px',
            marginTop: '15px'
          }}>
            {stationsWithoutCoords.map(station => (
              <div key={station.id} style={{
                padding: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '5px',
                backgroundColor: station.voltage === 0 ? '#ffebee' : '#e8f5e9'
              }}>
                <h3>{station.name} - {station.location}</h3>
                <p>Напряжение: {station.voltage !== null ? `${station.voltage}V` : 'Нет данных'}</p>
                <p>Последнее обновление: {station.last_update}</p>
                <p>Приоритет: {station.priority}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutageDashboard;