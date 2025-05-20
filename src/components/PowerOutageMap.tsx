import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const PowerOutageMap: React.FC<{ stations: TransformedStation[] }> = ({ stations }) => {
  const getMarkerColor = (voltage: number | null) => {
    if (voltage === null) return 'gray';
    return voltage === 0 ? 'red' : voltage < 45 ? 'orange' : 'green';
  };

  const renderAlarmsInfo = (alarms: Record<string, string> | string) => {
    if (typeof alarms === 'string') return <p>Аварии: {alarms}</p>;
    
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

  return (
    <div style={{ height: '85vh', width: '100%', position: 'relative', marginTop: '40px' }}>
      {stations.some(s => s.coordinates) ? (
        <MapContainer 
          center={[55.008352, 82.935732]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {stations.filter(s => s.coordinates).map(station => (
            <Marker 
              key={station.id} 
              position={station.coordinates!}
              icon={L.divIcon({
                className: 'custom-icon',
                html: `<div style="background-color: ${getMarkerColor(station.voltage)}; 
                       width: 20px; height: 20px; border-radius: 50%; 
                       border: 2px solid white; transform: translate(-10px, -10px)"></div>`
              })}
            >
              <Popup>
                <div style={{ minWidth: '250px' }}>
                  <h3>{station.name}</h3>
                  <p><strong>Локация:</strong> {station.location}</p>
                  <p><strong>Напряжение:</strong> {station.voltage !== null ? `${station.voltage}V` : 'Нет данных'}</p>
                  <p><strong>Последнее обновление:</strong> {station.last_update}</p>
                  <p><strong>Приоритет:</strong> {station.priority}</p>
                  {station.work_order !== '-' && <p><strong>Наряд:</strong> {station.work_order}</p>}
                  {renderAlarmsInfo(station.alarms)}
                  <p><strong>Комментарий:</strong> {station.comment}</p>
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
          Нет данных о координатах для отображения на карте
        </div>
      )}
    </div>
  );
};

export default PowerOutageMap;