import { Map } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { ExternalApiResponse, useGetLastDataFromExternalApiQuery } from '../api/api';
import { Spinner } from '../components';
import PowerOutageMap from '../components/PowerOutageMap';
import L from 'leaflet';


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

const calculateOutageDuration = (lastUpdate: string) => {
  const serverDate = new Date(lastUpdate.replace(' ', 'T'));
  const adjustedDate: any = new Date(serverDate.getTime() + 4 * 60 * 60 * 1000); 
  const diffMinutes = Math.floor((Date.now() - adjustedDate) / (1000 * 60));
  
  if (diffMinutes < 60) return `${diffMinutes} мин.`;
  return `${Math.floor(diffMinutes/60)} ч. ${diffMinutes%60} мин.`;
};


const OutageDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const { data: rawStations, isLoading } = useGetLastDataFromExternalApiQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true
  });
  const mapRef = useRef<Map>(null);

  const stations = rawStations ? transformStationData(rawStations) : [];
  const stationsWithCoords = stations.filter(s => s.coordinates);
  const stationsWithoutCoords = stations.filter(s => !s.coordinates);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [rawStations]);

  const flyToStation = (coordinates: [number, number]) => {
  if (mapRef.current) {
    mapRef.current.flyTo(coordinates, 14, {
      duration: 1
    });
  }
  };

  const showAllStations = () => {
  if (mapRef.current && stationsWithCoords.length > 0) {
    const bounds = L.latLngBounds(
      stationsWithCoords.map(s => s.coordinates!)
    );
    mapRef.current.flyToBounds(bounds, {
      padding: [100, 100], // Тот же отступ, что и при инициализации
      duration: 1 // Та же длительность анимации
    });
  }
};

  if (isLoading) return <div className='flex items-center justify-center text-5xl text-text h-[100vh]'><Spinner /></div>;

  return (
    <div style={{
      marginTop: '60px',
      paddingInline: '20px',
      position: 'absolute',
      width: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className='text-text'>Мониторинг базовых станций</h1>
        <div>
          <button 
            onClick={showAllStations}
            style={{
              marginRight: '20px',
              padding: '5px 10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Показать все станции
          </button>
          <div style={{ fontSize: '0.9rem' }} className='text-text'>
            Последнее обновление: {lastUpdated}
          </div>
        </div>
        <div style={{ fontSize: '0.9rem' }} className='text-text'>
          Всего баз: {stations.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: 3, position: 'relative', height: '85vh' }}>
          <PowerOutageMap stations={stations} ref={mapRef} />
        </div>

        <div style={{
          flex: 1,
          maxHeight: '85vh',
          overflowY: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: '5px',
          padding: '10px',
          backgroundColor: '#f5f5f5', 
          maxWidth: '250px', 
        }}>
          <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>Список базовых станций</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {stationsWithCoords.map(station => (
              <div
                key={station.id}
                onClick={() => station.coordinates && flyToStation(station.coordinates)}
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: station.voltage === 0 ? '#ffebee' : '#e8f5e9',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...(station.voltage === 0 ? {
                    ':hover': {
                      backgroundColor: '#ffcdd2',
                      transform: 'translateX(2px)'
                    }
                  } : {
                    ':hover': {
                      backgroundColor: '#c8e6c9',
                      transform: 'translateX(2px)'
                    }
                  })
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{station.name}</div>
                <div style={{ fontSize: '0.8em' }}>{station.location}</div>
                <div style={{ fontSize: '0.8em' }}>
                  Напряжение: {station.voltage !== null ? `${station.voltage}V` : 'Нет данных'}
                </div>
                <div style={{ fontSize: '0.8em' }}>Приоритет: {station.priority}</div>
                <div style={{ fontSize: '0.8em' }}>Длительность: {calculateOutageDuration(station.last_update)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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