import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { forwardRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { addHours } from "../pages/OutageDashboard";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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

const PowerOutageMap = forwardRef<L.Map, PowerOutageMapProps>(
  ({ stations }, ref) => {
    const [regionFilters, ] = useState({
      novosibirsk: true,
      tomsk: true,
      other: true
    });

    const getRegion = (stationName: string) => {
      if (stationName.startsWith('NS')) return 'novosibirsk';
      if (stationName.startsWith('TO')) return 'tomsk';
      return 'other';
    };

    const filteredStations = stations.filter(station => {
      if (!station.coordinates) return false;
      const region = getRegion(station.name);
      return regionFilters[region];
    });

    const getMarkerColor = (voltage: number | null) => {
      if (voltage === null || typeof voltage !== 'number') return "gray";
      return voltage < 47 ? "red" : voltage < 52 ? "orange" : "green";
    };

    const renderAlarmsInfo = (alarms: Record<string, string> | string) => {
      if (!alarms) return <p>Нет данных о тревогах</p>;
      if (typeof alarms === "string") return <p>Аварии: {alarms}</p>;
      if (Object.keys(alarms).length === 0) return <p>Нет активных аварий</p>;

      const parseCustomDate = (dateStr: string) => {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hours = parseInt(dateStr.substring(8, 10));
        const minutes = parseInt(dateStr.substring(10, 12));
        const seconds = parseInt(dateStr.substring(12, 14));

        return new Date(year, month, day, hours, minutes, seconds);
      };

      return (
        <div>
          <p>Активные аварии:</p>
          <ul>
            {Object.entries(alarms).map(([type, time]) => (
              <li key={type}>
                {type}: {parseCustomDate(time).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      );
    };

    return (
      <div style={{ height: "100%", width: "100%", position: "relative" }}>
        {filteredStations.length >= 0 ? (
          <MapContainer
            ref={ref}
            center={[55.073855, 81.104656]}
            zoom={8}
            minZoom={7}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='Картографические данные &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            />

            {filteredStations.map((station) => (
              <Marker
                key={station.id}
                position={station.coordinates!}
                icon={L.divIcon({
                  className: "custom-icon",
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
                        ${station.name.split("_").pop() || station.name}
                      </span>
                    </div>
                  </div>
                `,
                })}
              >
                <Popup>
                  <div style={{ minWidth: "250px" }}>
                    <h3>{station.name}</h3>
                    <p>
                      <strong>Локация:</strong> {station.location}
                    </p>
                    <p>
                      <strong>Напряжение:</strong>{" "}
                      {station.voltage !== null
                        ? `${station.voltage}V`
                        : "Нет данных"}
                    </p>
                    <p>
                      <strong>Дата аварии:</strong>{" "}
                      {addHours(station.last_update)}
                    </p>
                    <p>
                      <strong>Приоритет:</strong> {station.priority}
                    </p>
                    {station.work_order !== "-" && (
                      <p>
                        <strong>Наряд:</strong> {station.work_order}
                      </p>
                    )}

                    {station.visited ? (
                      <strong>Посещение: <span style={{ color: "green" }}>true</span></strong>
                    ) : (
                      <strong>Посещение: <span style={{ color: "red" }}>false</span></strong>
                    )}

                    {renderAlarmsInfo(station.alarms)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              color: "red",
              fontWeight: "bold",
            }}
          >
            Нет станций с выбранными фильтрами
          </div>
        )}
      </div>
    );
  }
);

PowerOutageMap.displayName = "PowerOutageMap";

export default PowerOutageMap;
