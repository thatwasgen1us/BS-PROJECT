import { useState } from 'react';
import { useGetTemperatureDataQuery } from "../api/api";

type SortConfig = {
  key: 'BBU' | 'RRU' | null;
  direction: 'ascending' | 'descending';
};

const BsTemperature = () => {
  const { data, error, isLoading } = useGetTemperatureDataQuery();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'descending' });

  // Функция для нахождения максимальной температуры в массиве объектов
  const findMaxTemperature = (items: Array<{ [key: string]: number }>) => {
    if (!items || items.length === 0) return null;
    return Math.max(...items.map(item => Object.values(item)[0]));
  };

  // Функция для определения цвета в зависимости от температуры
  const getTemperatureColor = (temp: number | null) => {
    if (temp === null) return 'bg-gray-100';
    if (temp > 75) return 'bg-red-500 text-white';
    if (temp > 65) return 'bg-orange-400 text-white';
    if (temp > 55) return 'bg-yellow-300';
    return 'bg-green-400 text-white';
  };

  // Функция для сортировки данных
  const requestSort = (key: 'BBU' | 'RRU') => {
    let direction: 'ascending' | 'descending' = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  // Получаем и сортируем данные
  const getSortedData = () => {
    if (!data || !data[0]) return [];

    const filteredData = data[0].filter(Boolean).map(item => {
      const baseStation = Object.keys(item)[0];
      const values = item[baseStation];
      return {
        baseStation,
        maxBBU: findMaxTemperature(values?.BBU || []),
        maxRRU: findMaxTemperature(values?.RRU || [])
      };
    });

    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === null) return 0;
      
      const aValue = sortConfig.key === 'BBU' ? a.maxBBU : a.maxRRU;
      const bValue = sortConfig.key === 'BBU' ? b.maxBBU : b.maxRRU;

      // Обработка null значений
      if (aValue === null) return sortConfig.direction === 'descending' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'descending' ? -1 : 1;

      if (aValue < bValue) {
        return sortConfig.direction === 'descending' ? 1 : -1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'descending' ? -1 : 1;
      }
      return 0;
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-700 bg-red-100 border-l-4 border-red-500">
      <p>Error loading temperature data:</p>
      <p className="font-mono text-sm">{error.toString()}</p>
    </div>
  );

  const sortedData = getSortedData();

  return (
    <div className="p-4 mx-auto text-center max-w-7xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-800">Temperature Monitoring</h2>
      
      {sortedData.length > 0 ? (
        <div className="overflow-x-auto rounded-lg shadow-md max-h-[85vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                  Base Station
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase cursor-pointer"
                  onClick={() => requestSort('BBU')}
                >
                  <div className="flex items-center justify-center">
                    Max BBU Temperature
                    {sortConfig.key === 'BBU' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'descending' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                  onClick={() => requestSort('RRU')}
                >
                  <div className="flex items-center justify-center">
                    Max RRU Temperature
                    {sortConfig.key === 'RRU' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'descending' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.baseStation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTemperatureColor(item.maxBBU)}`}>
                      {item.maxBBU !== null ? `${item.maxBBU}°C` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTemperatureColor(item.maxRRU)}`}>
                      {item.maxRRU !== null ? `${item.maxRRU}°C` : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-blue-700 border-l-4 border-blue-500 bg-blue-50">
          <p>No temperature data available</p>
        </div>
      )}

      {/* Легенда температур */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-text">
        <div className="flex items-center">
          <span className="w-4 h-4 mr-2 bg-green-400 rounded-full"></span>
          <span>Normal (&lt;55°C)</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-2 bg-yellow-300 rounded-full"></span>
          <span>Warning (55-65°C)</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-2 bg-orange-400 rounded-full"></span>
          <span>High (65-75°C)</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-2 bg-red-500 rounded-full"></span>
          <span>Critical (&gt;75°C)</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-2 bg-gray-100 rounded-full"></span>
          <span>No data</span>
        </div>
      </div>
    </div>
  );
};

export default BsTemperature;