import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { forwardRef, useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

// Фикс для иконок
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TransformedStation {
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

interface PowerOutageMapProps {
  stations: TransformedStation[];
}

const PowerOutageMap = forwardRef<L.Map, PowerOutageMapProps>(({ stations }, ref) => {
  const getMarkerColor = (voltage: number | null) => {
    if (voltage === null) return 'gray';
    return voltage === 0 ? 'red' : voltage < 45 ? 'orange' : 'green';
  };


  const renderAlarmsInfo = (alarms: Record<string, string> | string) => {
    if (!alarms) return <p>Нет данных о тревогах</p>;
    if (typeof alarms === 'string') return <p>Аварии: {alarms}</p>;
    if (Object.keys(alarms).length === 0) return <p>Нет активных аварий</p>;

    return (
      <div>
        <p>Активные аварии:</p>
        <ul>
          {Object.entries(alarms).map(([type, time]) => (
            <li key={type}>{type}: {new Date(time).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    );
  };

  const stationsWithCoords = stations.filter(s => s.coordinates);

  useEffect(() => {
  if (stationsWithCoords.length > 0 && ref && typeof ref !== 'function') {
    const timer = setTimeout(() => {
      const map = ref?.current;
      if (map) {
        const bounds = L.latLngBounds(
          stationsWithCoords.map(s => s.coordinates!)
        );
        map.flyToBounds(bounds, {
          padding: [100, 100],
          duration: 1
        });
      }
    }, 100); // 100ms задержка
    
    return () => clearTimeout(timer);
  }
}, [stationsWithCoords, ref]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {stationsWithCoords.length > 0 ? (
        <MapContainer
          ref={ref}
          center={[54.9833, 82.8963]} // Центр Новосибирска
          zoom={8}
          minZoom={7}  // Минимальный зум для просмотра всего города
          maxZoom={18} // Максимальный зум для детального просмотра
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {stationsWithCoords.map(station => (
            <Marker
              key={station.id}
              position={station.coordinates!}
              icon={L.divIcon({
                className: 'custom-icon',
                html: `
                  <div style="
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                  ">
                    <div style="
                      background-color: ${getMarkerColor(station.voltage)};
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      border: 2px solid white;
                      display: flex;
                      justify-content: center;
                      align-items: center;

                    ">
                      <span style="
                        color: black;
                        font-size: 10px;
                        text-shadow: 0 0 2px black;
                        transform: translate(-30px, 0px)
                      ">
                        ${station.name.split('_').pop() || station.name}
                      </span>
                    </div>
                  </div>
                `
              })}
            >
              <Popup>
                <div style={{ minWidth: '250px' }}>
                  <h3>{station.name}</h3>
                  <p><strong>Локация:</strong> {station.location}</p>
                  <p><strong>Напряжение:</strong> {station.voltage !== null ? `${station.voltage}V` : 'Нет данных'}</p>
                  <p><strong>Дата аварии:</strong> {station.last_update}</p>
                  <p><strong>Приоритет:</strong> {station.priority}</p>
                  {station.work_order !== '-' && <p><strong>Наряд:</strong> {station.work_order}</p>}
                  {renderAlarmsInfo(station.alarms)}
                  {station.comment && <p><strong>Комментарий:</strong> {station.comment}</p>}
                  {station.visited && <p style={{ color: 'green' }}>Посещена</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: 'red',
          fontWeight: 'bold'
        }}>
          Нет станций с координатами для отображения
        </div>
      )}
    </div>
  );
});

PowerOutageMap.displayName = 'PowerOutageMap';

export default PowerOutageMap;