import React, { FormEvent, useEffect, useState, useMemo } from "react";
import { useGetBaseDataQuery, useLazyGetBaseVoltageQuery } from "../api/api";
import styled from "styled-components";

interface BaseStation {
  name: string;
  power: string;
  voltage: number;
  duration: string;
  estimatedTime: string;
  status: string;
  lastUpdated: string;
  alarms: Record<string, string | null>;
}

const TrashIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
  color: currentColor;
  &:hover {
    color: #ef4444;
  }
`;

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return "No data";

  const year = parseInt(timestamp.slice(0, 4)),
    month = parseInt(timestamp.slice(4, 6)) - 1,
    day = parseInt(timestamp.slice(6, 8)),
    hours = parseInt(timestamp.slice(8, 10)),
    minutes = parseInt(timestamp.slice(10, 12)),
    seconds = parseInt(timestamp.slice(12, 14)),
    milliseconds = parseInt(timestamp.slice(15, 18));

  const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const calculateDuration = (timestamp: string): string => {
  if (!timestamp) return "N/A";

  const year = parseInt(timestamp.slice(0, 4)),
    month = parseInt(timestamp.slice(4, 6)) - 1,
    day = parseInt(timestamp.slice(6, 8)),
    hours = parseInt(timestamp.slice(8, 10)),
    minutes = parseInt(timestamp.slice(10, 12)),
    seconds = parseInt(timestamp.slice(12, 14)),
    milliseconds = parseInt(timestamp.slice(15, 18));

  const alarmDate = new Date(year, month, day, hours, minutes, seconds, milliseconds);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - alarmDate.getTime()) / 1000);

  const hoursDiff = Math.floor(diffInSeconds / 3600);
  const minutesDiff = Math.floor((diffInSeconds % 3600) / 60);
  const secondsDiff = diffInSeconds % 60;

  return `${String(hoursDiff).padStart(2, "0")}:${String(minutesDiff).padStart(2, "0")}:${String(secondsDiff).padStart(2, "0")}`;
};

const ALLOWED_ALARMS = ["POWER", "RECTIFIER", "DOOR", "TEMP_HIGH_", "TEMP_LOW", "SECOFF", "FIRE"];

const BsVoltage = () => {
  const { data: baseData } = useGetBaseDataQuery();
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
    direction: 'ascending' | 'descending';
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("bssList", JSON.stringify(bssList));
  }, [bssList]);

  const [trigger] = useLazyGetBaseVoltageQuery();

  const sortedBssList = useMemo(() => {
    let sortableItems = [...bssList];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'voltage') {
          if (a.voltage < b.voltage) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (a.voltage > b.voltage) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
        
        if (sortConfig.key === 'duration' && a.duration !== "N/A" && b.duration !== "N/A") {
          const aTime = a.duration.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
          const bTime = b.duration.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
          if (aTime < bTime) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aTime > bTime) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }

        const aValue = a[sortConfig.key as keyof BaseStation]?.toString().toLowerCase() || "";
        const bValue = b[sortConfig.key as keyof BaseStation]?.toString().toLowerCase() || "";
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [bssList, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const refreshData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updatedBssList = await Promise.all(
        bssList.map(async (bs) => {
          const response = await trigger(bs.name);
          if (response.data) {
            const voltageData = response.data[0]?.voltage?.[bs.name] || 0;
            const alarms = response.data[1]?.alarms || {};
            return {
              ...bs,
              voltage: voltageData,
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

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (refreshEnabled && refreshInterval > 0) {
      intervalId = setInterval(refreshData, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshEnabled, refreshInterval]);

  const handleAddBs = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newBsName.trim() === "") return;

    const isValidBsName = /^NS\d{4}$/.test(newBsName);
    if (!isValidBsName) {
      setErrorMessage("Имя БС должно состоять из 6 символов: 'NS' и 4 цифры (например, NS1234).");
      return;
    }

    const existsInBssList = bssList.some((bs) => bs.name === newBsName);
    if (existsInBssList) {
      setErrorMessage("БС с таким номером уже существует!");
      return;
    }

    const baseInData = baseData?.find((bs) => bs.BS_NAME === newBsName);
    if (!baseInData) {
      setErrorMessage("База с таким номером не найдена в данных.");
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
    setNewBsName("NS");
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

  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setRefreshInterval(value);
    setRefreshEnabled(value > 0);
  };

  return (
    <div className="max-h-screen min-h-screen p-6 pt-16 pb-10 mt-6 rounded-lg shadow-lg bg-blue-50">
      <div className="ext-center">
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
            <button className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed" type="submit" disabled>
              <svg aria-hidden="true" role="status" className="inline w-4 h-4 text-white me-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
              </svg>
              Загрузка ...
            </button>
          ) : (
            <button className="px-4 py-2 text-white bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600" type="submit">
              Добавить БС
            </button>
          )}
        </form>

        <div className="flex items-center justify-center mb-4 space-x-4">
          {isLoading ? (
            <button className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed" disabled>
              <svg aria-hidden="true" role="status" className="inline w-4 h-4 text-white me-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
              </svg>
              Загрузка ...
            </button>
          ) : (
            <button onClick={refreshData} className="px-4 py-2 text-white bg-green-500 rounded-md cursor-pointer hover:bg-green-600">
              Обновить данные
            </button>
          )}
          
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

        <div className="overflow-y-scroll max-h-[700px] text-center">
          <div className="grid grid-cols-8 gap-4 p-3 font-semiboldrounded-t-lg bg-background text-text">
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('name')}
            >
              <span>BSS</span>
              {sortConfig?.key === 'name' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('alarms')}
            >
              <span>Alarms</span>
              {sortConfig?.key === 'alarms' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('duration')}
            >
              <span>Duration</span>
              {sortConfig?.key === 'duration' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('voltage')}
            >
              <span>Voltage</span>
              {sortConfig?.key === 'voltage' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('estimatedTime')}
            >
              <span>Estimated Time</span>
              {sortConfig?.key === 'estimatedTime' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('status')}
            >
              <span>Status</span>
              {sortConfig?.key === 'status' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div 
              className="flex items-center justify-center rounded cursor-pointer jus hover:opacity-70"
              onClick={() => requestSort('lastUpdated')}
            >
              <span>Last Updated</span>
              {sortConfig?.key === 'lastUpdated' && (
                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </div>
            <div>Actions</div>
          </div>

          <div className="text-center bg-white divide-y divide-gray-200 rounded shadow">
            {sortedBssList.length > 0 ? (
              sortedBssList.map((bs) => {
                const hasPowerAlarm = !!bs.alarms?.POWER;
                const duration = hasPowerAlarm ? calculateDuration(bs.alarms.POWER!) : "N/A";

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
                            <div key={alarm} className="text-sm text-left text-red-500 text-nowrap">
                              {alarm}: {formatTimestamp(timestamp)}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <div>{duration}</div>
                    <div className={`text-center ${bs.voltage < 50 ? "text-red-500" : "text-green-500"}`}>
                      {typeof bs.voltage === 'number' ? (
                        <p>{bs.voltage} V</p>
                      ) : (
                        <p className="text-red-500">{bs.voltage}</p>
                      )}
                    </div>
                    <div>{bs.estimatedTime}</div>
                    <div className={`text-center ${bs.status === "Accident" ? "text-red-500" : "text-green-500"}`}>
                      {bs.status}
                    </div>
                    <div>{bs.lastUpdated}</div>
                    <div>
                      <button
                        onClick={() => handleDeleteBs(bs.name)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon viewBox="0 0 20 20" fill="currentColor" className="cursor-pointer">
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
              })
            ) : (
              <div className="p-4 text-center text-gray-500">
                Нет данных для отображения
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BsVoltage);
