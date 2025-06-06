import { Map } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalApiResponse,
  useGetLastDataFromExternalApiQuery,
} from "../api/api";
import { Spinner } from "../components";
import PowerOutageMap from "../components/PowerOutageMap";
import L from "leaflet";

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

export const transformStationData = (
  data: ExternalApiResponse
): TransformedStation[] => {
  if (!data || data[0]?.[""]) return [];

  return data.flatMap((item) => {
    const stationKey = Object.keys(item)[0];
    const stationData = item[stationKey];

    const latitude =
      stationData.latitude && !isNaN(parseFloat(stationData.latitude))
        ? parseFloat(stationData.latitude)
        : null;
    const longitude =
      stationData.longitude && !isNaN(parseFloat(stationData.longitude))
        ? parseFloat(stationData.longitude)
        : null;

    return {
      id: stationKey,
      name: stationKey,
      location: stationData.Location,
      voltage:
        stationData.voltage === "БС недоступна"
          ? null
          : parseFloat(stationData.voltage || "0"),
      alarms: stationData.alarms,
      coordinates: latitude && longitude ? [latitude, longitude] : null,
      last_update: stationData.Время_аварии,
      priority: stationData.Приоритет,
      work_order: stationData.Наряд_на_работы,
      visited: stationData.Посещение === "true",
      comment: stationData.Комментарий,
    };
  });
};

const calculateOutageDuration = (lastUpdate: string) => {
  const serverDate = new Date(lastUpdate.replace(" ", "T"));
  const adjustedDate: any = new Date(serverDate.getTime() + 4 * 60 * 60 * 1000);
  const diffMinutes = Math.floor((Date.now() - adjustedDate) / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} мин.`;
  return `${Math.floor(diffMinutes / 60)} ч. ${diffMinutes % 60} мин.`;
};

export function addHours(dateString, hours = 4) {
  const date = new Date(dateString.replace(" ", "T"));
  date.setHours(date.getHours() + hours);

  const pad = (num) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const calculateDurationValue = (lastUpdate: string) => {
  const serverDate = new Date(lastUpdate.replace(" ", "T"));
  const adjustedDate: any = new Date(serverDate.getTime() + 4 * 60 * 60 * 1000);
  return Math.floor((Date.now() - adjustedDate) / (1000 * 60));
};

const OutageDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString()
  );
  const { data: rawStations, isLoading } = useGetLastDataFromExternalApiQuery(
    undefined,
    {
      pollingInterval: 30000,
      refetchOnMountOrArgChange: true,
    }
  );
  const mapRef = useRef<Map>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [regionFilters, setRegionFilters] = useState(() => {
    const savedFilters = localStorage.getItem("regionFilters");
    return savedFilters ? JSON.parse(savedFilters) : {
      novosibirsk: true,
      tomsk: true,
      omsk: true,
      kemerovo: true,
      other: true
    };
  });

  useEffect(() => {
    localStorage.setItem("regionFilters", JSON.stringify(regionFilters));
  }, [regionFilters]);

  const stations = rawStations ? transformStationData(rawStations) : [];

  const getRegion = (stationName: string) => {
    if (stationName.startsWith('NS')) return 'novosibirsk';
    if (stationName.startsWith('TO')) return 'tomsk';
    if (stationName.startsWith('OM')) return 'omsk';
    if (stationName.startsWith('KE')) return 'kemerovo';
    
    return 'other';
  };

  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      if (!station.coordinates) return false;
      const region = getRegion(station.name);
      return regionFilters[region];
    });
  }, [stations, regionFilters]);

  const sortedStations = useMemo(() => {
    const sortableStations = [...filteredStations];
    if (sortConfig !== null) {
      sortableStations.sort((a, b) => {
        if (sortConfig.key === "voltage") {
          const aVoltage = a.voltage !== null ? a.voltage : -Infinity;
          const bVoltage = b.voltage !== null ? b.voltage : -Infinity;
          return sortConfig.direction === "ascending"
            ? aVoltage - bVoltage
            : bVoltage - aVoltage;
        }

        if (sortConfig.key === "priority") {
          const aPriority = Number(a.priority);
          const bPriority = Number(b.priority);
          return sortConfig.direction === "ascending"
            ? aPriority - bPriority
            : bPriority - aPriority;
        }

        if (sortConfig.key === "duration") {
          const aDuration = calculateDurationValue(a.last_update);
          const bDuration = calculateDurationValue(b.last_update);
          return sortConfig.direction === "ascending"
            ? aDuration - bDuration
            : bDuration - aDuration;
        }

        return 0;
      });
    }
    return sortableStations;
  }, [filteredStations, sortConfig]);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [rawStations]);

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const flyToStation = (coordinates: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coordinates, 14, {
        duration: 1,
      });
    }
  };

  const showAllStations = () => {
    if (mapRef.current && filteredStations.length > 0) {
      const bounds = L.latLngBounds(
        filteredStations.map((s) => s.coordinates!)
      );
      mapRef.current.flyToBounds(bounds, {
        padding: [100, 100],
        duration: 1,
      });
    }
  };

  const handleFilterChange = (region: keyof typeof regionFilters) => {
    setRegionFilters(prev => ({
      ...prev,
      [region]: !prev[region]
    }));
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center text-5xl text-text h-[100vh]">
        <Spinner />
      </div>
    );

  return (
    <div
      style={{
        marginTop: "60px",
        paddingInline: "20px",
        position: "absolute",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        maxHeight: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: "absolute",
          backgroundColor: "#f9f9f9",
          minWidth: "200px",
          boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
          padding: "12px",
          zIndex: 10000,
          borderRadius: "4px",
          left: 25,
          bottom: '25px',
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "green",
                borderRadius: "50%",
                marginRight: "8px",
                border: "1px solid #fff",
              }}
            ></div>
            <span>{'U > 52V'}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "orange",
                borderRadius: "50%",
                marginRight: "8px",
                border: "1px solid #fff",
              }}
            ></div>
            <span>{'47 < U < 52V'}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "red",
                borderRadius: "50%",
                marginRight: "8px",
                border: "1px solid #fff",
              }}
            ></div>
            <span>{'U < 47 V'}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "gray",
                borderRadius: "50%",
                marginRight: "8px",
                border: "1px solid #fff",
              }}
            ></div>
            <span>БС недоступна</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "5px",
        }}
      >
        <h1 className="text-text">Мониторинг базовых станций</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", marginRight: "10px" }} className="text-text">
            <label>
              <input
                type="checkbox"
                checked={regionFilters.novosibirsk}
                onChange={() => handleFilterChange('novosibirsk')}
              /> NS
            </label>
            <label>
              <input
                type="checkbox"
                checked={regionFilters.tomsk}
                onChange={() => handleFilterChange('tomsk')}
              /> TO
            </label>
            <label>
              <input
                type="checkbox"
                checked={regionFilters.omsk}
                onChange={() => handleFilterChange('omsk')}
              /> OM
            </label>
            <label>
              <input
                type="checkbox"
                checked={regionFilters.kemerovo}
                onChange={() => handleFilterChange('kemerovo')}
              /> KE
            </label>
            <label>
              <input
                type="checkbox"
                checked={regionFilters.other}
                onChange={() => handleFilterChange('other')}
              /> Другие
            </label>
          </div>
          <button
            onClick={showAllStations}
            style={{
              padding: "5px 10px",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Показать все станции
          </button>
        </div>

        <div>
          <div style={{ fontSize: "0.9rem" }} className="text-text">
            Последнее обновление: {lastUpdated}
          </div>
        </div>
        <div style={{ fontSize: "0.9rem" }} className="text-text">
          Всего аварий POWER: {stations.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
        <div style={{ flex: 3, position: "relative", height: "87vh" }}>
          <PowerOutageMap stations={filteredStations} ref={mapRef} />
        </div>

        <div
          style={{
            flex: 1,
            maxHeight: "87vh",
            overflowY: "hidden",
            border: "1px solid #e0e0e0",
            borderRadius: "5px",
            padding: "10px",
            backgroundColor: "#f5f5f5",
            maxWidth: "350px",
          }}
        >
          <h3 style={{ marginBottom: "15px", textAlign: "center" }}>
            Список базовых станций ({filteredStations.length})
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "5px",
                padding: "5px",
                fontWeight: "bold",
                fontSize: "0.8em",
              }}
            >
              <button
                onClick={() => requestSort("voltage")}
                style={{ textAlign: "left", cursor: "pointer" }}
              >
                Напряжение{" "}
                {sortConfig?.key === "voltage"
                  ? sortConfig.direction === "ascending"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
              <button
                onClick={() => requestSort("priority")}
                style={{ textAlign: "left", cursor: "pointer" }}
              >
                Приоритет{" "}
                {sortConfig?.key === "priority"
                  ? sortConfig.direction === "ascending"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
              <button
                onClick={() => requestSort("duration")}
                style={{ textAlign: "left", cursor: "pointer" }}
              >
                Длительность{" "}
                {sortConfig?.key === "duration"
                  ? sortConfig.direction === "ascending"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
            </div>

            <div className="overflow-y-auto max-h-[77vh]">
              {sortedStations.map((station) => (
                <div
                  key={station.id}
                  onClick={() =>
                    station.coordinates && flyToStation(station.coordinates)
                  }
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor:
                      station.voltage === 0 ? "#ffebee" : "#e8f5e9",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    ...(station.voltage === 0
                      ? {
                          ":hover": {
                            backgroundColor: "#ffcdd2",
                            transform: "translateX(2px)",
                          },
                        }
                      : {
                          ":hover": {
                            backgroundColor: "#c8e6c9",
                            transform: "translateX(2px)",
                          },
                        }),
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{station.name}</div>
                  <div style={{ fontSize: "0.8em" }}>
                    Дата аварии: {addHours(station.last_update)}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>
                    Напряжение:{" "}
                    {station.voltage !== null
                      ? `${station.voltage}V`
                      : "Нет данных"}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>
                    Приоритет: {station.priority}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>
                    Длительность: {calculateOutageDuration(station.last_update)}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>
                    Посещение: <span style={{color: station.visited ? 'green' : 'red' }}>{(station.visited ? 'true' : 'false')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutageDashboard;
