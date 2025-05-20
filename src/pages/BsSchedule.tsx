import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import React, { useEffect, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { useGetBseVoltageInfoQuery } from "../api/api";


interface AlarmHistory {
  recorded_at: string;
  status: string | null;
  time: string | null;
  type: string | null;
}

interface VoltageHistory {
  measured_at: string;
  status: string;
  value: number;
}

interface StationInfo {
  bs_id: string;
  last_updated: string;
}

interface CustomMarker {
  x: Date;
  y: number;
  text: string;
  color: string;
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  time: Date;
}

export interface StationDataVoltage {
  alarms_history: AlarmHistory[];
  voltage_history: VoltageHistory[];
  station_info: StationInfo;
}

// Интервалы времени для агрегации данных по свечам
const TIME_FRAMES = [
  { label: '5M', minutes: 5 },
  { label: '15M', minutes: 15 },
  { label: '30M', minutes: 30 },
  { label: '1H', minutes: 60 },
  { label: '3H', minutes: 180 },
  { label: '6H', minutes: 360 },
  { label: '12H', minutes: 720 },
  { label: '1D', minutes: 1440 },
];

const BsSchedule: React.FC = () => {
  const [bsNumber, setBsNumber] = useState<string>('NS0519');
  const [inputValue, setInputValue] = useState<string>(bsNumber);
  const [plotData, setPlotData] = useState<any[]>([]);
  const [plotLayout, setPlotLayout] = useState<any>({});
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [markerText, setMarkerText] = useState<string>('');
  const [markerColor, setMarkerColor] = useState<string>('#FF5733');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [timeFrame, setTimeFrame] = useState<number>(60); // По умолчанию 1 час
  const [showMA, setShowMA] = useState<boolean>(false);
  const [maPeriod, setMaPeriod] = useState<number>(20);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<number>(7); // Дней для отображения
  const { data, refetch, isFetching, isError } = useGetBseVoltageInfoQuery(bsNumber);
  const plotRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^NS\d{4}$/.test(inputValue)) {
      setBsNumber(inputValue);
    } else {
      alert('Введите номер БС в формате NS1234');
    }
  };

  const resetZoom = () => {
    if (plotRef.current) {
      const plotElement = plotRef.current.querySelector('.js-plotly-plot');
      if (plotElement) {
        (window as any).Plotly.relayout(plotElement, {
          'xaxis.range': null,
          'yaxis.range': [43, 55]
        });
      }
    }
  };

  const handlePlotClick = (data: any) => {
    if (data.points && data.points.length > 0) {
      const point = data.points[0];
      const newMarker: CustomMarker = {
        x: new Date(point.x),
        y: point.y,
        text: markerText || `Маркер ${customMarkers.length + 1}`,
        color: markerColor
      };
      setCustomMarkers([...customMarkers, newMarker]);
    }
  };

  const removeMarker = (index: number) => {
    setCustomMarkers(customMarkers.filter((_, i) => i !== index));
  };

  const getStatusChangeAlarms = (alarms: AlarmHistory[]): AlarmHistory[] => {
    const result: AlarmHistory[] = [];
    const lastStatus = new Map<string, string | null>();

    alarms
      .filter((item: AlarmHistory) => item.type)
      .sort((a: AlarmHistory, b: AlarmHistory) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .forEach((alarm: AlarmHistory) => {
        const currentStatus = alarm.status;
        const last = lastStatus.get(alarm.type!);

        if (last !== currentStatus) {
          result.push(alarm);
          lastStatus.set(alarm.type!, currentStatus);
        }
      });

    return result;
  };

  // Функция для создания свечей на основе данных напряжения
  const createCandleData = (voltageData: { x: Date; y: number }[], minutesInterval: number): CandleData[] => {
    if (!voltageData.length) return [];

    const candles: CandleData[] = [];
    let currentCandleStart = new Date(voltageData[0].x);
    let currentValues: number[] = [];

    // Устанавливаем начало интервала на границу временного окна
    currentCandleStart.setMinutes(Math.floor(currentCandleStart.getMinutes() / minutesInterval) * minutesInterval);
    currentCandleStart.setSeconds(0);
    currentCandleStart.setMilliseconds(0);

    voltageData.forEach((item) => {
      const itemTime = new Date(item.x);
      const candleEndTime = new Date(currentCandleStart);
      candleEndTime.setMinutes(candleEndTime.getMinutes() + minutesInterval);

      if (itemTime >= candleEndTime) {
        // Если накопились значения, создаем свечу
        if (currentValues.length > 0) {
          candles.push({
            time: new Date(currentCandleStart),
            open: currentValues[0],
            high: Math.max(...currentValues),
            low: Math.min(...currentValues),
            close: currentValues[currentValues.length - 1]
          });
        }

        // Переходим к новому временному интервалу
        // Возможно, нужно пропустить несколько интервалов
        while (itemTime >= candleEndTime) {
          currentCandleStart = new Date(candleEndTime);
          candleEndTime.setMinutes(candleEndTime.getMinutes() + minutesInterval);
        }
        currentValues = [item.y];
      } else {
        currentValues.push(item.y);
      }
    });

    // Завершаем последнюю свечу, если есть данные
    if (currentValues.length > 0) {
      candles.push({
        time: new Date(currentCandleStart),
        open: currentValues[0],
        high: Math.max(...currentValues),
        low: Math.min(...currentValues),
        close: currentValues[currentValues.length - 1]
      });
    }

    return candles;
  };

  // Функция для расчета скользящей средней
  const calculateMovingAverage = (data: { x: Date; y: number }[], period: number): { x: Date; y: number }[] => {
    const result: { x: Date; y: number }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        continue; // Не хватает данных для расчета
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].y;
      }
      
      result.push({
        x: data[i].x,
        y: sum / period
      });
    }
    
    return result;
  };

  const handleChangeTimeRange = (days: number) => {
    setTimeRange(days);
  };

  useEffect(() => {
    refetch();
  }, [bsNumber, refetch]);

  useEffect(() => {
    if (!data || !data.station_info) return;

    const now = new Date();
    const startDate = subDays(now, timeRange);

    const voltageData = (data.voltage_history || [])
      .filter((item: VoltageHistory) => new Date(item.measured_at) >= startDate)
      .map((item: VoltageHistory) => ({
        x: new Date(item.measured_at),
        y: Math.min(Math.max(item.value, 43), 55),
        status: item.status
      }))
      .sort((a: {x: Date}, b: {x: Date}) => a.x.getTime() - b.x.getTime());

    const statusChangeAlarms = getStatusChangeAlarms(data.alarms_history || [])
      .filter((item: AlarmHistory) => new Date(item.recorded_at) >= startDate);

    const alarmData = statusChangeAlarms.map((item: AlarmHistory) => ({
      x: new Date(item.recorded_at),
      y: 45,
      type: item.type!,
      status: item.status,
      symbol: item.status ? 'circle-x' : 'circle',
      size: item.status ? 16 : 12
    }));

    const markersData = customMarkers.map((marker: CustomMarker, index: number) => ({
      x: [marker.x],
      y: [marker.y],
      name: marker.text,
      mode: 'markers+text',
      type: 'scatter',
      marker: {
        color: marker.color,
        size: 12,
        symbol: 'star',
        line: { color: darkMode ? 'black' : 'white', width: 1 }
      },
      text: [marker.text],
      textposition: 'top center',
      hoverinfo: 'text',
      customdata: [index]
    }));

    // Основные данные графика
    let mainChartData: any = [];
    
    if (chartType === 'line') {
      // Линейный график
      mainChartData = [
        {
          x: voltageData.map((item: {x: Date}) => item.x),
          y: voltageData.map((item: {y: number}) => item.y),
          name: 'Напряжение',
          mode: 'lines+markers',
          type: 'scatter',
          line: { 
            color: darkMode ? '#4ADE80' : '#10B981', 
            width: 2,
            shape: 'spline' 
          },
          marker: { 
            size: 4,
            color: voltageData.map((item: {y: number, status: string}) => 
              item.status === 'normal' ? '#10B981' : 
              item.status === 'warning' ? '#F59E0B' : 
              item.status === 'critical' ? '#EF4444' : '#6B7280'
            )
          },
          hoverinfo: 'text',
          hovertext: voltageData.map((item: {x: Date, y: number, status: string}) =>
            `Напряжение: ${item.y.toFixed(2)}V<br>` +
            `Время: ${format(item.x, 'PPpp', 
              
              { locale: ru })}<br>` +
            `Статус: ${item.status || 'неизвестно'}`
          )
        }
      ];
    } else {
      // Свечной график
      const candleData = createCandleData(voltageData, timeFrame);
      
      mainChartData = [
        {
          x: candleData.map(candle => candle.time),
          open: candleData.map(candle => candle.open),
          high: candleData.map(candle => candle.high),
          low: candleData.map(candle => candle.low),
          close: candleData.map(candle => candle.close),
          type: 'candlestick',
          name: 'Напряжение',
          increasing: { line: { color: darkMode ? '#4ADE80' : '#10B981' } },
          decreasing: { line: { color: '#EF4444' } },
          hoverinfo: 'text',
          hovertext: candleData.map(candle => 
            `Открытие: ${candle.open.toFixed(2)}V<br>` +
            `Максимум: ${candle.high.toFixed(2)}V<br>` +
            `Минимум: ${candle.low.toFixed(2)}V<br>` +
            `Закрытие: ${candle.close.toFixed(2)}V<br>` +
            `Время: ${format(candle.time, 'PPpp', 
              
              { locale: ru })}`
          )
        }
      ];
    }

    // Добавление скользящей средней если нужно
    if (showMA && voltageData.length > maPeriod) {
      const maData = calculateMovingAverage(voltageData, maPeriod);
      
      mainChartData.push({
        x: maData.map(item => item.x),
        y: maData.map(item => item.y),
        type: 'scatter',
        mode: 'lines',
        name: `SMA-${maPeriod}`,
        line: {
          color: '#3B82F6',
          width: 2,
          dash: 'dot'
        },
        hoverinfo: 'text',
        hovertext: maData.map(item => 
          `SMA-${maPeriod}: ${item.y.toFixed(2)}V<br>` +
          `Время: ${format(item.x, 'PPpp', 
            
            { locale: ru })}`
        )
      });
    }

    const traces = [
      ...mainChartData,
      {
        x: alarmData.map((item: {x: Date}) => item.x),
        y: alarmData.map((item: {y: number}) => item.y),
        name: 'Аварии',
        mode: 'markers',
        type: 'scatter',
        marker: {
          color: alarmData.map((item: {type: string}) => getAlarmColor(item.type, darkMode)),
          size: alarmData.map((item: {size: number}) => item.size),
          symbol: alarmData.map((item: {symbol: string}) => item.symbol),
          line: { color: darkMode ? 'black' : 'white', width: 1 }
        },
        hoverinfo: 'text',
        hovertext: alarmData.map((item: {x: Date, type: string, status: string | null}) =>
          `${item.status ? 'Появление аварии' : 'Исчезновение аварии'}: ${item.type}<br>` +
          `Время: ${format(item.x, 'PPpp', 
            
            { locale: ru })}<br>` +
          `Статус: ${item.status || 'неизвестно'}`
        )
      },
      ...markersData
    ];

    // Кнопки интервалов времени для графика
    const rangeButtons = [
      { count: 6, label: '6ч', step: 'hour', stepmode: 'backward' },
      { count: 12, label: '12ч', step: 'hour', stepmode: 'backward' },
      { count: 1, label: '1д', step: 'day', stepmode: 'backward' },
      { count: 3, label: '3д', step: 'day', stepmode: 'backward' },
      { step: 'all', label: 'Все' }
    ];

    const layout = {
      title: {
        text: `Мониторинг БС ${data.station_info.bs_id}`,
        font: {
          size: 16,
          family: 'Arial, sans-serif',
          color: darkMode ? '#F9FAFB' : undefined
        }
      },
      xaxis: {
        title: 'Время',
        type: 'date',
        tickformat: '%d.%m %H:%M',
        rangeslider: { visible: true },
        rangeselector: {
          buttons: rangeButtons,
          bgcolor: darkMode ? '#374151' : undefined,
          activecolor: darkMode ? '#10B981' : undefined,
          font: { color: darkMode ? '#F9FAFB' : undefined }
        },
        gridcolor: darkMode ? '#4B5563' : undefined,
        color: darkMode ? '#F9FAFB' : undefined
      },
      yaxis: {
        title: 'Напряжение (В)',
        range: [43, 55],
        gridcolor: darkMode ? '#4B5563' : undefined,
        color: darkMode ? '#F9FAFB' : undefined,
        tickmode: 'linear',
        tick0: 43,
        dtick: 1
      },
      hovermode: 'closest',
      showlegend: true,
      legend: { 
        orientation: 'h', 
        y: 1.1,
        font: { color: darkMode ? '#F9FAFB' : undefined }
      },
      margin: { t: 60, r: 30, b: 60, l: 60 },
      dragmode: 'zoom',
      clickmode: 'event+select',
      plot_bgcolor: darkMode ? '#1F2937' : undefined,
      paper_bgcolor: darkMode ? '#111827' : undefined,
      shapes: [
        // Отмечаем базовые уровни рекомендуемого напряжения
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: 48,
          y1: 48,
          line: {
            color: darkMode ? 'rgba(74, 222, 128, 0.5)' : 'rgba(16, 185, 129, 0.5)',
            width: 1,
            dash: 'dash'
          }
        },
        {
          type: 'rect',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: 47,
          y1: 49,
          fillcolor: darkMode ? 'rgba(74, 222, 128, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          line: { width: 0 }
        },
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: 45,
          y1: 45,
          line: {
            color: 'rgba(245, 158, 11, 0.5)',
            width: 1,
            dash: 'dash'
          }
        },
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: 52,
          y1: 52,
          line: {
            color: 'rgba(245, 158, 11, 0.5)',
            width: 1,
            dash: 'dash'
          }
        }
      ],
      annotations: [
        {
          x: 1,
          y: 48,
          xref: 'paper',
          yref: 'y',
          text: 'Оптимально',
          showarrow: false,
          font: { 
            size: 10,
            color: darkMode ? '#4ADE80' : '#10B981'
          },
          align: 'right',
          xanchor: 'right'
        },
        {
          x: 1,
          y: 45,
          xref: 'paper',
          yref: 'y',
          text: 'Мин.',
          showarrow: false,
          font: { 
            size: 10,
            color: '#F59E0B'
          },
          align: 'right',
          xanchor: 'right'
        },
        {
          x: 1,
          y: 52,
          xref: 'paper',
          yref: 'y',
          text: 'Макс.',
          showarrow: false,
          font: { 
            size: 10,
            color: '#F59E0B'
          },
          align: 'right',
          xanchor: 'right'
        }
      ]
    };

    setPlotData(traces);
    setPlotLayout(layout);
  }, [data, customMarkers, chartType, timeFrame, showMA, maPeriod, darkMode, timeRange]);

  const getAlarmColor = (type: string, isDark: boolean = false): string => {
    const colors: Record<string, { light: string; dark: string }> = {
      POWER: { light: '#EF4444', dark: '#F87171' },
      RECTIFIER: { light: '#3B82F6', dark: '#60A5FA' },
      No_connection_to_unit: { light: '#F59E0B', dark: '#FBBF24' },
      TEMP_HIGH: { light: '#10B981', dark: '#34D399' },
      TEMP_LOW: { light: '#8B5CF6', dark: '#A78BFA' },
      DOOR: { light: '#F97316', dark: '#FB923C' },
      SECOFF: { light: '#84CC16', dark: '#A3E635' },
      FIRE: { light: '#DC2626', dark: '#EF4444' }
    };
    
    return (colors[type] ? (isDark ? colors[type].dark : colors[type].light) : (isDark ? '#9CA3AF' : '#6B7280'));
  };

  return (
    <div className={`p-6 mt-16 rounded-lg max-h-[90vh] overflow-y-scroll shadow-md ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">Мониторинг напряжения БС</h2>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="NSXXXX"
            pattern="NS\d{4}"
            className={`w-24 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-300'
            }`}
            required
          />
          <button 
            type="submit" 
            className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isFetching}
          >
            {isFetching ? 'Загрузка...' : 'Обновить'}
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
          >
            Сбросить масштаб
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-3">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h3 className="mb-2 text-lg font-medium">Настройки графика</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center">
              <label className="mr-2">Тип:</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'line' | 'candle')}
                className={`px-2 py-1 border rounded ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="line">Линия</option>
                <option value="candle">Свечи</option>
              </select>
            </div>

            {chartType === 'candle' && (
              <div className="flex items-center">
                <label className="mr-2">Интервал:</label>
                <select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(Number(e.target.value))}
                  className={`px-2 py-1 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                  }`}
                >
                  {TIME_FRAMES.map((frame) => (
                    <option key={frame.minutes} value={frame.minutes}>
                      {frame.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center">
              <label className="mr-2">Период:</label>
              <select
                value={timeRange}
                onChange={(e) => handleChangeTimeRange(Number(e.target.value))}
                className={`px-2 py-1 border rounded ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value={1}>1 день</option>
                <option value={3}>3 дня</option>
                <option value={7}>7 дней</option>
                <option value={14}>14 дней</option>
                <option value={30}>30 дней</option>
              </select>
            </div>

            <div className="flex items-center ml-2">
              <input
                type="checkbox"
                id="showMA"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="mr-1"
              />
              <label htmlFor="showMA" className="mr-2">SMA</label>
              <input
                type="number"
                value={maPeriod}
                onChange={(e) => setMaPeriod(Number(e.target.value))}
                min="5"
                max="100"
                disabled={!showMA}
                className={`w-16 px-2 py-1 border rounded ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                } ${!showMA ? 'opacity-50' : ''}`}
              />
            </div>

            <div className="flex items-center ml-2">
              <input
                type="checkbox"
                id="darkMode"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="mr-1"
              />
              <label htmlFor="darkMode">Темная тема</label>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h3 className="mb-2 text-lg font-medium">Добавить маркер</h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Текст маркера"
              className={`flex-1 px-4 py-2 border rounded-md ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            />
            <input
              type="color"
              value={markerColor}
              onChange={(e) => setMarkerColor(e.target.value)}
              className="w-16 h-10"
            />
          </div>
          <div className="mt-2 text-sm">
            Кликните на график, чтобы добавить маркер
          </div>
        </div>

        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h3 className="mb-2 text-lg font-medium">Легенда</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ background: darkMode ? '#4ADE80' : '#10B981' }}></span>
              <span>Нормальное напряжение</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ background: '#F59E0B' }}></span>
              <span>Предупреждение</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ background: '#EF4444' }}></span>
              <span>Критическое</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 mr-2 bg-blue-500 rounded-full"></span>
              <span>SMA (скользящая средняя)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[500px]" ref={plotRef}>
        {isFetching ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : isError || !data?.station_info ? (
          <div className={`absolute inset-0 flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isError ? 'Ошибка загрузки данных' : 'Данные по станции отсутствуют'}
          </div>
        ) : plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={plotLayout}
            config={{
              displayModeBar: true,
              displaylogo: false,
              responsive: true,
              scrollZoom: true,
              toImageButtonOptions: {
                format: 'png',
                filename: `BS_${bsNumber}_voltage_chart`,
                height: 800,
                width: 1200,
                scale: 2
              },
              modeBarButtonsToAdd: [
                'drawline',
                'drawopenpath',
                'drawcircle',
                'drawrect',
                'eraseshape'
              ]
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            onClick={handlePlotClick}
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Введите номер БС для отображения графика
          </div>
        )}
      </div>

      {/* Статистика и информация о напряжении */}
      {data?.voltage_history && data.voltage_history.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 mt-6 md:grid-cols-4 ${darkMode ? 'text-gray-100' : ''}`}>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Текущее напряжение</div>
            <div className="text-2xl font-semibold">
              {data.voltage_history[data.voltage_history.length - 1].value.toFixed(2)} В
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Мин. за период</div>
            <div className="text-2xl font-semibold">
              {Math.min(...data.voltage_history.map(item => item.value)).toFixed(2)} В
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Макс. за период</div>
            <div className="text-2xl font-semibold">
              {Math.max(...data.voltage_history.map(item => item.value)).toFixed(2)} В
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Среднее значение</div>
            <div className="text-2xl font-semibold">
              {(data.voltage_history.reduce((sum, item) => sum + item.value, 0) / 
                data.voltage_history.length).toFixed(2)} В
            </div>
          </div>
        </div>
      )}

      {customMarkers.length > 0 && (
        <div className="mt-6">
          <h3 className={`mb-2 text-lg font-medium ${darkMode ? 'text-gray-100' : ''}`}>Добавленные маркеры</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customMarkers.map((marker, index) => (
              <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-200'
              }`}>
                <div>
                  <div className="font-medium" style={{ color: marker.color }}>
                    {marker.text}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {format(marker.x, 'PPpp', 
                      
                      { locale: ru })}
                  </div>
                  <div className="text-sm">
                    Напряжение: {marker.y.toFixed(2)}V
                  </div>
                </div>
                <button
                  onClick={() => removeMarker(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Таблица аварий */}
      {data?.alarms_history && data.alarms_history.length > 0 && (
        <div className="mt-6">
          <h3 className={`mb-2 text-lg font-medium ${darkMode ? 'text-gray-100' : ''}`}>Последние аварии</h3>
          <div className={`overflow-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Тип</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Статус</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Время</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
                {data.alarms_history
                  .filter(alarm => alarm.type) // Фильтруем только аварии с указанным типом
                  .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()) // Сортировка по времени (сначала новые)
                  .slice(0, 10) // Ограничиваем 10 последними записями
                  .map((alarm, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-gray-50') : ''}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        <div className="flex items-center">
                          <span 
                            className="inline-block w-3 h-3 mr-2 rounded-full"
                            style={{ background: getAlarmColor(alarm.type!, darkMode) }}
                          ></span>
                          {alarm.type}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          alarm.status 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {alarm.status ? 'Активна' : 'Устранена'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {format(new Date(alarm.recorded_at), 'PPpp', 
                        
                        { locale: ru })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BsSchedule;