import { useParams } from "react-router-dom";
import { Schedule, BsTable } from "@/components";

const Information = () => {
  const { stationId } = useParams();

  return (
    <div className="flex-1 min-w-[350px] bg-blue-50 rounded-lg shadow-lg p-6 w-full overflow-y-auto h-full scrollbar-none">

      {/* Заголовок */}
      <div className="flex justify-center items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {stationId || "Выберите базовую станцию"}
        </h1>
      </div>

      {/* Основной контент */}
      <div className="flex gap-6 justify-between">
        {/* Блок с информацией */}
        <div className="overflow-hidden flex-1 p-4 bg-white rounded-lg shadow-md bg-background text-text">
          <h2 className="mb-4 text-xl font-semibold">Информация</h2>
          <div className="space-y-3 break-words">
            <p>Название: {stationId}</p>
            <p>Месяц: 99.5%</p>
            <p>Год: 98.9%</p>
            <p>Статус: Активна</p>
          </div>
        </div>

        {/* График */}
        <div className="flex flex-1 justify-center items-center p-4 rounded-lg shadow-md bg-background">
          <Schedule />
        </div>
      </div>

      {/* Таблица */}
      <div className="mt-6">
        <BsTable />
      </div>
    </div>
  );
};

export { Information };