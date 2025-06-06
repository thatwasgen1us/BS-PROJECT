import {
  useGetLastDataFromExternalApiQuery,
  useLazyGetBaseVoltageQuery,
} from "@/api/api";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

interface BaseStation {
  name: string;
  power: string;
  voltage: number | string;
  duration: string;
  estimatedTime: string;
  status: string;
  lastUpdated: string;
  alarms: Record<string, string | null>;
}

interface ExternalApiStation {
  name: string;
  voltage: number | string;
  alarms: Record<string, string>;
  lastUpdated?: string;
  priority: string;
  workEx: string;
  baseLocation: string;
  visit?: string;
  comment?: string;
}

const ALLOWED_ALARMS = [
  "POWER",
  "RECTIFIER",
  "DOOR",
  "TEMP_HIGH_",
  "TEMP_LOW",
  "SECOFF",
  "FIRE",
];
const EXTERNAL_API_REFRESH_INTERVAL = 3 * 60 * 1000;

const TrashIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
  color: currentColor;
  &:hover {
    color: #ef4444;
  }
`;

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp || timestamp === "БС недоступна") return "No data";

  try {
    const year = parseInt(timestamp.slice(0, 4)),
      month = parseInt(timestamp.slice(4, 6)) - 1,
      day = parseInt(timestamp.slice(6, 8)),
      hours = parseInt(timestamp.slice(8, 10)),
      minutes = parseInt(timestamp.slice(10, 12)),
      seconds = parseInt(timestamp.slice(12, 14)),
      milliseconds = parseInt(timestamp.slice(15, 18));

    const date = new Date(
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      milliseconds
    );

    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (error) {
    console.error("Error parsing timestamp", timestamp);
    return "Invalid date";
  }
};

const calculateDuration = (timestamp: string): string => {
  if (!timestamp || timestamp === "БС недоступна") return "N/A";

  try {
    const year = parseInt(timestamp.slice(0, 4)),
      month = parseInt(timestamp.slice(4, 6)) - 1,
      day = parseInt(timestamp.slice(6, 8)),
      hours = parseInt(timestamp.slice(8, 10)),
      minutes = parseInt(timestamp.slice(10, 12)),
      seconds = parseInt(timestamp.slice(12, 14)),
      milliseconds = parseInt(timestamp.slice(15, 18));

    const alarmDate = new Date(
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      milliseconds
    );
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - alarmDate.getTime()) / 1000
    );

    const hoursDiff = Math.floor(diffInSeconds / 3600);
    const minutesDiff = Math.floor((diffInSeconds % 3600) / 60);
    const secondsDiff = diffInSeconds % 60;

    return `${String(hoursDiff).padStart(2, "0")}:${String(minutesDiff).padStart(2, "0")}:${String(secondsDiff).padStart(2, "0")}`;
  } catch (error) {
    console.error("Error calculating duration", timestamp);
    return "N/A";
  }
};

const LoadingSpinner = () => (
  <svg
    aria-hidden="true"
    role="status"
    className="inline w-4 h-4 text-white me-3 animate-spin"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
      fill="#E5E7EB"
    />
    <path
      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
      fill="currentColor"
    />
  </svg>
);

const BsVoltage = () => {
  const [lastExternalUpdate, setLastExternalUpdate] = useState<string>("");
  const [newBsName, setNewBsName] = useState<string>("NS");
  const [bssList, setBssList] = useState<BaseStation[]>(() => {
    const savedBssList = localStorage.getItem("bssList");
    return savedBssList ? JSON.parse(savedBssList) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [refreshEnabled, setRefreshEnabled] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [externalSortConfig, setExternalSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    const savedRegion = localStorage.getItem("selectedRegion");
    return savedRegion || "all";
  });

  const [trigger] = useLazyGetBaseVoltageQuery();
  const {
    data: externalData,
    isLoading: isExternalLoading,
    refetch: refetchExternalData,
  } = useGetLastDataFromExternalApiQuery();

  const getRegion = (stationName: string) => {
    if (stationName.startsWith('NS')) return 'novosibirsk';
    if (stationName.startsWith('TO')) return 'tomsk';
    if (stationName.startsWith('OM')) return 'omsk';
    if (stationName.startsWith('KE')) return 'kemerovo';
    return 'other';
  };

  useEffect(() => {
    localStorage.setItem("bssList", JSON.stringify(bssList));
  }, [bssList]);

  useEffect(() => {
    localStorage.setItem("selectedRegion", selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchExternalData();
    }, EXTERNAL_API_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [refetchExternalData]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (refreshEnabled && refreshInterval > 0) {
      intervalId = setInterval(() => {
        refreshData();
        refreshExternalData();
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshEnabled, refreshInterval]);

  const handleAddBs = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newBsName.trim() === "") return;

    const isValidBsName = /^NS||TO||KE||OM\d{4}$/.test(newBsName);
    if (!isValidBsName) {
      setErrorMessage(
        "Имя БС должно состоять из 6 символов: 'NS' и 4 цифры (например, NS1234)."
      );
      return;
    }

    const existsInBssList = bssList.some((bs) => bs.name === newBsName);
    if (existsInBssList) {
      setErrorMessage("БС с таким номером уже существует!");
      return;
    }

    const newBs: BaseStation = {
      name: newBsName,
      power: "N/A",
      voltage: 0,
      duration: "N/A",
      estimatedTime: "N/A",
      status: "N/A",
      lastUpdated: "N/A",
      alarms: {},
    };

    setBssList((prev) => [...prev, newBs]);
    setNewBsName("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 6) return;
    setNewBsName(value);
  };

  const handleDeleteBs = (name: string) => {
    const updatedBssList = bssList.filter((bs) => bs.name !== name);
    setBssList(updatedBssList);
  };

  const handleDeleteAllBs = () => {
    if (window.confirm("Вы уверены, что хотите удалить все базовые станции?")) {
      setBssList([]);
    }
  };

  const handleRefreshIntervalChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    setRefreshInterval(value);
    setRefreshEnabled(value > 0);
  };

  const refreshData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updatedBssList = await Promise.all(
        bssList.map(async (bs) => {
          const response = await trigger(bs.name);
          if (response.data) {
            const stationData = response.data[bs.name];
            const voltage = stationData?.[0]?.voltage || 0;
            const alarms = stationData?.[1]?.alarms || {};
            return {
              ...bs,
              voltage: voltage,
              alarms: alarms,
              lastUpdated: new Date().toLocaleString(),
            };
          }
          return bs;
        })
      );
      setBssList(updatedBssList);
    } catch (err) {
      console.error("Ошибка при обновлении данных:", err);
      setErrorMessage("Произошла ошибка при обновлении данных.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshExternalData = async () => {
    try {
      await refetchExternalData();
      setLastExternalUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Ошибка при обновлении внешних данных:", err);
      setErrorMessage("Произошла ошибка при обновлении внешних данных.");
    }
  };

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig?.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const requestExternalSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      externalSortConfig?.key === key &&
      externalSortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setExternalSortConfig({ key, direction });
  };

  const sortedBssList = useMemo(() => {
    let sortableItems = [...bssList];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "voltage") {
          const aVoltage = typeof a.voltage === "number" ? a.voltage : 0;
          const bVoltage = typeof b.voltage === "number" ? b.voltage : 0;
          if (aVoltage < bVoltage) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aVoltage > bVoltage) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }

        if (
          sortConfig.key === "duration" &&
          a.duration !== "N/A" &&
          b.duration !== "N/A"
        ) {
          const aTime = a.duration
            .split(":")
            .reduce((acc, time) => 60 * acc + +time, 0);
          const bTime = b.duration
            .split(":")
            .reduce((acc, time) => 60 * acc + +time, 0);
          if (aTime < bTime) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aTime > bTime) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }

        const aValue =
          a[sortConfig.key as keyof BaseStation]?.toString().toLowerCase() ||
          "";
        const bValue =
          b[sortConfig.key as keyof BaseStation]?.toString().toLowerCase() ||
          "";

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [bssList, sortConfig]);

  const externalStations = useMemo(() => {
    if (!externalData || externalData[0]?.[""]) return [];

    return externalData.map((stationData: any) => {
      const stationKey = Object.keys(stationData)[0];
      const stationInfo = stationData[stationKey];

      return {
        name: stationKey,
        voltage: stationInfo.voltage || "N/A",
        alarms: stationInfo.alarms || {},
        lastUpdated: stationInfo["Время_аварии"] || new Date().toLocaleString(),
        priority: stationInfo["Приоритет"],
        workEx: stationInfo["Наряд_на_работы"],
        baseLocation: stationInfo.Location,
        visit: stationInfo["Посещение"],
        comment: stationInfo["Комментарий"],
      };
    });
  }, [externalData]);

  const sortedExternalStations = useMemo(() => {
    if (!externalStations) return [];

    let sortableItems = [...externalStations];
    if (externalSortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (externalSortConfig.key === "voltage") {
          const aVoltage = typeof a.voltage === "number" ? a.voltage : 0;
          const bVoltage = typeof b.voltage === "number" ? b.voltage : 0;
          if (aVoltage < bVoltage) {
            return externalSortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aVoltage > bVoltage) {
            return externalSortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }

        if (externalSortConfig.key === "duration") {
          const aDuration = Object.values(a.alarms).find((t) => t) || "";
          const bDuration = Object.values(b.alarms).find((t) => t) || "";

          const aTime = aDuration
            ? calculateDuration(String(aDuration))
              .split(":")
              .reduce((acc, time) => 60 * acc + +time, 0)
            : 0;
          const bTime = bDuration
            ? calculateDuration(String(bDuration))
              .split(":")
              .reduce((acc, time) => 60 * acc + +time, 0)
            : 0;

          if (aTime < bTime) {
            return externalSortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aTime > bTime) {
            return externalSortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }

        if (externalSortConfig.key === "priority") {
          const aPriority = Number(a.priority);
          const bPriority = Number(b.priority);

          if (aPriority < bPriority) {
            return externalSortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aPriority > bPriority) {
            return externalSortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }

        const aValue =
          a[externalSortConfig.key as keyof ExternalApiStation]
            ?.toString()
            .toLowerCase() || "";
        const bValue =
          b[externalSortConfig.key as keyof ExternalApiStation]
            ?.toString()
            .toLowerCase() || "";

        if (aValue < bValue) {
          return externalSortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return externalSortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [externalStations, externalSortConfig]);

  const filteredBssList = useMemo(() => {
    if (selectedRegion === "all") return sortedBssList;
    return sortedBssList.filter((bs) => getRegion(bs.name) === selectedRegion);
  }, [sortedBssList, selectedRegion]);

  const filteredExternalStations = useMemo(() => {
    if (selectedRegion === "all") return sortedExternalStations;
    return sortedExternalStations.filter(
      (station) => getRegion(station.name) === selectedRegion
    );
  }, [sortedExternalStations, selectedRegion]);

  const renderExternalApiTable = () => (
    <div className="mb-4 text-center">
      <div className="grid grid-cols-10 gap-4 p-3 font-semibold rounded-t-lg bg-background text-text">
        <SortableHeader
          label="БС"
          sortKey="name"
          sortConfig={externalSortConfig}
          onSort={requestExternalSort}
        />
        <SortableHeader
          label="Напряжение"
          sortKey="voltage"
          sortConfig={externalSortConfig}
          onSort={requestExternalSort}
        />
        <div className="flex items-center justify-center">Авария</div>
        <SortableHeader
          label="Длительность"
          sortKey="duration"
          sortConfig={externalSortConfig}
          onSort={requestExternalSort}
        />
        <div className="flex items-center justify-center">Статус</div>
        <SortableHeader
          label="Приоритет"
          sortKey="priority"
          sortConfig={externalSortConfig}
          onSort={requestExternalSort}
        />
        <div className="flex items-center justify-center">Выдача задания</div>
        <div className="flex items-center justify-center">Локация</div>
        <div className="flex items-center justify-center">Посещение</div>
        <div className="flex items-center justify-center">Комментарий</div>
      </div>

      <div className="text-center bg-white divide-y divide-gray-200 rounded shadow">
        {isExternalLoading ? (
          <div className="p-4 text-center">
            <LoadingSpinner />
            Загрузка данных...
          </div>
        ) : filteredExternalStations.length > 0 ? (
          filteredExternalStations.map(renderExternalStationRow)
        ) : (
          <div className="p-4 text-center text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );

  const renderExternalStationRow = (station: ExternalApiStation) => {
    const isErrorState =
      station.voltage === "Ошибка" || station.voltage === "БС недоступна";

    const alarms =
      typeof station.alarms === "string" ? {} : station.alarms || {};

    const powerAlarmTimestamp = alarms.POWER;
    const hasPowerAlarm = !!powerAlarmTimestamp;

    const activeAlarms = Object.entries(alarms).filter(
      ([key]) => !["No_connection_to_unit", "status"].includes(key)
    );

    let status = "Норма";
    if (station.voltage === "БС недоступна") {
      status = "БС недоступна";
    } else if (station.voltage === "Ошибка") {
      status = "Ошибка";
    } else if (activeAlarms.length > 0) {
      status = "Авария";
    } else if (typeof station.voltage === "number" && station.voltage < 47) {
      status = "Низкое напряжение";
    }
    return (
      <div
        key={station.name}
        className="grid grid-cols-10 gap-4 p-3 text-gray-800 transition-colors duration-200 hover:bg-gray-50"
      >
        <div>{station.name}</div>
        <div
          className={`text-center ${isErrorState
              ? "text-red-500"
              : typeof station.voltage === "number"
                ? station.voltage < 47
                  ? "text-red-500"
                  : station.voltage < 50
                    ? "text-yellow-500"
                    : "text-green-500"
                : "text-red-500"
            }`}
        >
          {isErrorState
            ? "Ошибка"
            : typeof station.voltage === "number"
              ? `${station.voltage} V`
              : station.voltage}
        </div>
        <div className="text-left break-words">
          {isErrorState ? (
            <div className="text-sm text-red-500">Ошибка получения данных</div>
          ) : activeAlarms.length > 0 ? (
            activeAlarms.map(([alarm, timestamp]) => (
              <div key={alarm} className="text-sm text-red-500">
                {alarm}: {formatTimestamp(timestamp)}
              </div>
            ))
          ) : (
            <span className="text-green-500">Нет аварий</span>
          )}
        </div>
        <div>
          {hasPowerAlarm ? calculateDuration(powerAlarmTimestamp) : "-"}
        </div>
        <div
          className={`text-center ${status === "Авария" || status === "Ошибка"
              ? "text-red-500"
              : status === "Недоступна"
                ? "text-orange-500"
                : status === "Низкое напряжение"
                  ? "text-yellow-500"
                  : "text-green-500"
            }`}
        >
          {status}
        </div>
        <div>{station.priority}</div>
        <div>{station.workEx}</div>
        <div>{station.baseLocation}</div>
        <div style={{ color: station.visit === "true" ? "green" : "red" }}>
          {station.visit}
        </div>
        <div>{station.comment}</div>
      </div>
    );
  };

  const renderBaseStationTable = () => (
    <div className="mb-8 text-center">
      <div className="grid grid-cols-8 gap-4 p-3 font-semibold rounded-t-lg bg-background text-text">
        <SortableHeader
          label="БС"
          sortKey="name"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Аварии"
          sortKey="alarms"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Длительность"
          sortKey="duration"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Напряжение"
          sortKey="voltage"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Примерное время работы АКБ"
          sortKey="estimatedTime"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Статус"
          sortKey="status"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <SortableHeader
          label="Последнее обновление"
          sortKey="lastUpdated"
          sortConfig={sortConfig}
          onSort={requestSort}
        />
        <div className="flex items-center justify-center rounded cursor-pointer hover:opacity-70">
          Удалить
        </div>
      </div>

      <div className="text-center bg-white divide-y divide-gray-200 rounded shadow">
        {filteredBssList.length > 0 ? (
          filteredBssList.map(renderBaseStationRow)
        ) : (
          <div className="p-4 text-center text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );

  const renderBaseStationRow = (bs: BaseStation) => {
    const powerAlarmTimestamp = bs.alarms?.POWER;
    const hasPowerAlarm = !!powerAlarmTimestamp;

    return (
      <div
        key={bs.name}
        className="grid grid-cols-8 gap-4 p-3 text-gray-800 transition-colors duration-200 hover:bg-gray-50"
      >
        <div>{bs.name}</div>
        <div>
          {ALLOWED_ALARMS.map((alarm) => {
            const timestamp = bs.alarms?.[alarm];
            if (timestamp) {
              return (
                <div key={alarm} className="text-sm text-left text-red-500">
                  {alarm}: {formatTimestamp(timestamp)}
                </div>
              );
            }
            return null;
          })}
        </div>
        <div>
          {hasPowerAlarm ? calculateDuration(powerAlarmTimestamp) : "-"}
        </div>
        <div
          className={`text-center ${typeof bs.voltage === "number"
              ? bs.voltage < 50
                ? "text-red-500"
                : "text-green-500"
              : "text-red-500"
            }`}
        >
          {typeof bs.voltage === "number" ? `${bs.voltage} V` : bs.voltage}
        </div>
        <div>{bs.estimatedTime}</div>
        <div
          className={`text-center ${bs.status === "Accident" ? "text-red-500" : "text-green-500"
            }`}
        >
          {bs.status}
        </div>
        <div>{bs.lastUpdated}</div>
        <div>
          <button
            onClick={() => handleDeleteBs(bs.name)}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon
              viewBox="0 0 20 20"
              fill="currentColor"
              className="cursor-pointer"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </TrashIcon>
          </button>
        </div>
      </div>
    );
  };

  const SortableHeader = ({
    label,
    sortKey,
    sortConfig,
    onSort,
  }: {
    label: string;
    sortKey: string;
    sortConfig: { key: string; direction: string } | null;
    onSort: (key: string) => void;
  }) => (
    <div
      className="flex items-center justify-center rounded cursor-pointer hover:opacity-70"
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      {sortConfig?.key === sortKey && (
        <span>{sortConfig.direction === "ascending" ? "↑" : "↓"}</span>
      )}
    </div>
  );

  const RegionFilter = () => (
    <div className="flex items-center mb-4 space-x-2">
      <label htmlFor="regionFilter" className="text-sm text-gray-700">
        Фильтр по региону:
      </label>
      <select
        id="regionFilter"
        value={selectedRegion}
        onChange={(e) => setSelectedRegion(e.target.value)}
        className="px-2 py-1 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 background-white"
      >
        <option value="all">Все регионы</option>
        <option value="novosibirsk">Новосибирск</option>
        <option value="tomsk">Томск</option>
        <option value="omsk">Омск</option>
        <option value="kemerovo">Кемерово</option>
        <option value="other">Другие</option>
      </select>
    </div>
  );

  return (
    <div className="max-h-screen min-h-screen p-6 pt-16 pb-10 mt-6 overflow-y-scroll rounded-lg shadow-lg bg-blue-50">
      {/* Вторая таблица - данные из внешнего API */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Данные с внешнего API</h2>
          <div>
            Всего аварий POWER:{" "}
            {filteredExternalStations ? filteredExternalStations.length : 0}
          </div>
          {lastExternalUpdate && (
            <p className="text-sm text-gray-500">
              Последнее обновление: {lastExternalUpdate}
            </p>
          )}
        </div>
        <button
          onClick={refreshExternalData}
          className="px-4 py-2 text-white bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          disabled={isExternalLoading}
        >
          {isExternalLoading ? (
            <>
              <LoadingSpinner />
              Обновление...
            </>
          ) : (
            "Обновить"
          )}
        </button>
      </div>

      <RegionFilter />
      {renderExternalApiTable()}

      <div className="text-center">
        <form className="flex mb-4 space-x-2" onSubmit={handleAddBs}>
          <input
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md form-input focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newBsName}
            onChange={handleInputChange}
            placeholder="Введите название БС (NSXXXX)"
            minLength={6}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              type="submit"
              disabled
            >
              <LoadingSpinner />
              Загрузка ...
            </button>
          ) : (
            <button
              className="px-4 py-2 text-white bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600"
              type="submit"
            >
              Добавить БС
            </button>
          )}
        </form>

        <div className="flex items-center justify-between mb-4 space-x-4">
          <h2 className="mb-2 text-xl font-semibold text-center">
            Мониторинг базовых станций
          </h2>

          <div className="flex space-x-2">
            {isLoading ? (
              <button
                className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
                disabled
              >
                <LoadingSpinner />
                Загрузка ...
              </button>
            ) : (
              <button
                onClick={refreshData}
                className="px-4 py-2 text-white bg-green-500 rounded-md cursor-pointer hover:bg-green-600"
              >
                Обновить данные
              </button>
            )}

            {bssList.length > 0 && (
              <button
                onClick={handleDeleteAllBs}
                className="px-4 py-2 text-white bg-red-500 rounded-md cursor-pointer hover:bg-red-600"
              >
                Удалить все
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="refreshInterval" className="text-sm text-gray-700">
              Частота обновления:
            </label>
            <select
              id="refreshInterval"
              value={refreshInterval}
              onChange={handleRefreshIntervalChange}
              className="px-2 py-1 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 background-white"
            >
              <option value={0}>Выкл</option>
              <option value={30}>30 сек</option>
              <option value={60}>1 мин</option>
              <option value={300}>5 мин</option>
              <option value={900}>15 мин</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2 mb-4 text-center text-red-600 bg-red-100 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* Первая таблица - пользовательские БС */}
        {renderBaseStationTable()}
      </div>
    </div>
  );
};

export default React.memo(BsVoltage);
