import { FormEvent, useEffect, useState } from "react";
import { useLazyGetBaseVoltageQuery } from "../api/api";

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

const ALLOWED_ALARMS = ["POWER", "RECTIFIER", "DOOR", "TEMP_HIGH", "TEMP_LOW", "SECOFF", "FIRE"];

const BsVoltage = () => {
  const [newBsName, setNewBsName] = useState<string>("NS");
  const [bssList, setBssList] = useState<BaseStation[]>(() => {
    const savedBssList = localStorage.getItem("bssList");
    return savedBssList ? JSON.parse(savedBssList) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [refreshEnabled, setRefreshEnabled] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("bssList", JSON.stringify(bssList));
  }, [bssList]);

  const [trigger] = useLazyGetBaseVoltageQuery();

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

    const exists = bssList.some((bs) => bs.name === newBsName);
    if (exists) {
      setErrorMessage("БС с таким номером уже существует!");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await trigger(newBsName);

      if (response.error) {
        setErrorMessage("Ошибка при получении данных.");
        return;
      }

      if (response.data) {
        const voltageData = response.data[0]?.voltage?.[newBsName] || 0;
        const alarms = response.data[1]?.alarms || {};

        const newBs: BaseStation = {
          name: newBsName,
          power: "N/A",
          voltage: voltageData,
          duration: "N/A",
          estimatedTime: "N/A",
          status: "N/A",
          lastUpdated: new Date().toLocaleString(),
          alarms: alarms,
        };

        setBssList((prev) => [...prev, newBs]);
        setNewBsName("NS");
      }
    } catch (err) {
      console.error("Ошибка при выполнении запроса:", err);
      setErrorMessage("Произошла ошибка при добавлении БС.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.length > 6) {
      return;
    }

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
    <div className="min-h-screen p-6 pt-16 mt-6 overflow-x-auto bg-blue-100 rounded-lg shadow-md">
      <div className="text-center ">
        {/* Форма добавления БС */}
        <form className="flex mb-4 space-x-2" onSubmit={handleAddBs}>
          <input
            className="px-4 py-2 border border-gray-300 rounded-md form-input focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-text"
            value={newBsName}
            onChange={handleInputChange}
            placeholder="Введите название БС (NSXXXX)"
            minLength={6}
            disabled={isLoading}
          />
          <button
            className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-t-2 border-white rounded-full border-t-transparent animate-spin"></div>
                <span className="ml-2">Загрузка...</span>
              </div>
            ) : (
              "Добавить БС"
            )}
          </button>
        </form>

        {/* Кнопка "Обновить" и настройка частоты обновления */}
        <div className="flex items-center justify-center mb-4 space-x-4">
          <button
            onClick={refreshData}
            className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Обновить данные
          </button>
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

        {/* Отображение ошибки */}
        {errorMessage && (
          <div className="p-2 mb-4 text-center text-red-600 bg-red-100 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* Заголовки таблицы */}
        <div className="grid items-center grid-cols-9 gap-4 p-3 font-semibold rounded-t-lg bg-background text-text">
          <div>BSS</div>
          <div>Alarms</div>
          <div>Duration</div>
          <div>Voltage</div>         
          <div>Estimated Time</div>
          <div>Status</div>
          <div>Last Updated</div>
          <div>Actions</div>
        </div>

        {/* Данные таблицы */}
        <div className="text-center bg-white divide-y divide-gray-200 rounded">
          {bssList.map((bs) => {
            const hasPowerAlarm = !!bs.alarms.POWER; 
            const duration = hasPowerAlarm ? calculateDuration(bs.alarms.POWER!) : "N/A";

            return (
              <div
                key={bs.name}
                className="grid grid-cols-9 gap-4 p-3 text-gray-800 transition-colors duration-200 hover:bg-gray-50"
              >
                <div>{bs.name}</div>
                <div>
                  {ALLOWED_ALARMS.map((alarm) => {
                    const timestamp = bs.alarms[alarm];
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
                  {bs.voltage} V
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
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BsVoltage;
