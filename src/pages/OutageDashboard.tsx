import { useEffect, useState } from 'react';
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
  if (!data) return [];

  return data.flatMap(item => {
    const stationKey = Object.keys(item)[0];
    const stationData = item[stationKey];

    const latitude = stationData.latitude && !isNaN(parseFloat(stationData.latitude))
      ? parseFloat(stationData.latitude)
      : null;
    const longitude = stationData.longitude && !isNaN(parseFloat(stationData.longitude))
      ? parseFloat(stationData.longitude)
      : null;

    return {
      id: stationKey,
      name: stationKey,
      location: stationData.Location,
      voltage: stationData.voltage === "БС недоступна" ? null : parseFloat(stationData.voltage || '0'),
      alarms: stationData.alarms,
      coordinates: latitude && longitude ? [latitude, longitude] : null,
      last_update: stationData.Время_аварии,
      priority: stationData.Приоритет,
      work_order: stationData.Наряд_на_работы,
      visited: stationData.Посещение === "true",
      comment: stationData.Комментарий
    };
  });
};

const OutageDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const { data: rawStations, isLoading } = useGetLastDataFromExternalApiQuery(undefined, {
    pollingInterval: 30000, // 30 секунд
    refetchOnMountOrArgChange: true
  });

  // Преобразуем данные при получении
  const stations = rawStations ? transformStationData(rawStations) : [];
  const stationsWithCoords = stations.filter(s => s.coordinates);
  const stationsWithoutCoords = stations.filter(s => !s.coordinates);

  // Эффект для обновления времени последнего обновления
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [rawStations]);

  if (isLoading) return <div className='flex items-center justify-center text-5xl text-text h-[100vh]'><Spinner /></div>;

  return (
    <div style={{ marginTop: '60px', paddingInline: '20px', position: 'absolute', width: '100%'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className='text-text'>Мониторинг базовых станций</h1>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          Последнее обновление: {lastUpdated}
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div className="status-box">
          <h3>Всего баз</h3>
          <p>{stations.length}</p>
        </div>
        <div className="status-box">
          <h3>С координатами</h3>
          <p>{stationsWithCoords.length}</p>
        </div>
        <div className="status-box" style={{ backgroundColor: '#fff8e1' }}>
          <h3>Без координат</h3>
          <p>{stationsWithoutCoords.length}</p>
        </div>
      </div>

      <PowerOutageMap stations={stations} />

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
