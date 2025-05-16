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

export interface StationDataVoltage {
  alarms_history: AlarmHistory[];
  voltage_history: VoltageHistory[];
  station_info: StationInfo;
}

type TimeRange = '24h' | '7d';

const BsSchedule: React.FC = () => {
  const [bsNumber, setBsNumber] = useState<string>('NS0519');
  const [inputValue, setInputValue] = useState<string>(bsNumber);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [plotData, setPlotData] = useState<any[]>([]);
  const [plotLayout, setPlotLayout] = useState<any>({});
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [markerText, setMarkerText] = useState<string>('');
  const [markerColor, setMarkerColor] = useState<string>('#FF5733');
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

  useEffect(() => {
    refetch();
  }, [bsNumber, timeRange, refetch]);

  useEffect(() => {
    if (!data || !data.station_info) return;

    const now = new Date();
    const startDate = timeRange === '24h' ? subDays(now, 1) : subDays(now, 7);

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
        line: { color: 'white', width: 1 }
      },
      text: [marker.text],
      textposition: 'top center',
      hoverinfo: 'text',
      customdata: [index]
    }));

    const traces = [
      {
        x: voltageData.map((item: {x: Date}) => item.x),
        y: voltageData.map((item: {y: number}) => item.y),
        name: 'Напряжение',
        mode: 'lines+markers',
        type: 'scatter',
        line: { color: '#10B981', width: 2 },
        marker: { size: 4 },
        hoverinfo: 'text',
        hovertext: voltageData.map((item: {x: Date, y: number, status: string}) =>
          `Напряжение: ${item.y.toFixed(2)}V<br>` +
          `Время: ${format(item.x, 'PPpp', 
            // @ts-ignore
            { locale: ru })}<br>` +
          `Статус: ${item.status || 'неизвестно'}`
        )
      },
      {
        x: alarmData.map((item: {x: Date}) => item.x),
        y: alarmData.map((item: {y: number}) => item.y),
        name: 'Аварии',
        mode: 'markers',
        type: 'scatter',
        marker: {
          color: alarmData.map((item: {type: string}) => getAlarmColor(item.type)),
          size: alarmData.map((item: {size: number}) => item.size),
          symbol: alarmData.map((item: {symbol: string}) => item.symbol),
          line: { color: 'white', width: 1 }
        },
        hoverinfo: 'text',
        hovertext: alarmData.map((item: {x: Date, type: string, status: string | null}) =>
          `${item.status ? 'Появление аварии' : 'Исчезновение аварии'}: ${item.type}<br>` +
          `Время: ${format(item.x, 'PPpp', 
            // @ts-ignore
            { locale: ru })}<br>` +
          `Статус: ${item.status || 'неизвестно'}`
        )
      },
      ...markersData
    ];

    const layout = {
      title: {
        text: `Мониторинг БС ${data.station_info.bs_id}`,
        font: {
          size: 16,
          family: 'Arial, sans-serif'
        }
      },
      xaxis: {
        title: 'Время',
        type: 'date',
        tickformat: timeRange === '24h' ? '%H:%M' : '%d.%m',
        rangeslider: { visible: true },
        rangeselector: {
          buttons: [
            { count: 6, label: '6ч', step: 'hour', stepmode: 'backward' },
            { count: 12, label: '12ч', step: 'hour', stepmode: 'backward' },
            { count: 1, label: '1д', step: 'day', stepmode: 'backward' },
            { step: 'all', label: 'Все' }
          ]
        }
      },
      yaxis: {
        title: 'Напряжение (В)',
        range: [43, 55]
      },
      hovermode: 'closest',
      showlegend: true,
      legend: { orientation: 'h', y: 1.1 },
      margin: { t: 60, r: 30, b: 60, l: 60 },
      dragmode: 'zoom',
      clickmode: 'event+select'
    };

    setPlotData(traces);
    setPlotLayout(layout);
  }, [data, timeRange, customMarkers]);

  const getAlarmColor = (type: string): string => {
    const colors: Record<string, string> = {
      POWER: '#EF4444',
      RECTIFIER: '#3B82F6',
      No_connection_to_unit: '#F59E0B',
      TEMP_HIGH: '#10B981',
      TEMP_LOW: '#8B5CF6',
      DOOR: '#F97316',
      SECOFF: '#84CC16',
      FIRE: '#DC2626'
    };
    return colors[type] || '#6B7280';
  };

  return (
    <div className="p-6 mt-16 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">Мониторинг напряжения БС</h2>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="NSXXXX"
            pattern="NS\d{4}"
            className="w-24 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
          </select>
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

      <div className="p-4 mb-4 rounded-lg bg-gray-50">
        <h3 className="mb-2 text-lg font-medium">Добавить маркер</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={markerText}
            onChange={(e) => setMarkerText(e.target.value)}
            placeholder="Текст маркера"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="color"
            value={markerColor}
            onChange={(e) => setMarkerColor(e.target.value)}
            className="w-16 h-10"
          />
          <div className="text-sm">
            Кликните на график, чтобы добавить маркер
          </div>
        </div>
      </div>

      <div className="relative w-full h-[500px]" ref={plotRef}>
        {isFetching ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : isError || !data?.station_info ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
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
              scrollZoom: true
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            onClick={handlePlotClick}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Введите номер БС для отображения графика
          </div>
        )}
      </div>

      {customMarkers.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-lg font-medium">Добавленные маркеры</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customMarkers.map((marker, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium" style={{ color: marker.color }}>
                    {marker.text}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(marker.x, 'PPpp', 
                      // @ts-ignore
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
    </div>
  );
};

export default BsSchedule;
