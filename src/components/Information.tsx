import { useParams } from "react-router-dom";
import { Schedule, BsTable, Error, Spinner } from "@/components";
import { SiteInfo, useGetBaseInfoQuery } from "@/api/api";
import React from "react";

interface InformationProps {
  onBaseInfoUpdate: (data: SiteInfo) => void;
}

const Information: React.FC<InformationProps> = ({ onBaseInfoUpdate }) => {
  const { stationId } = useParams();
  const { data, isLoading, error } = useGetBaseInfoQuery(stationId ?? "NS1120");

  React.useEffect(() => {
    if (data) {
      onBaseInfoUpdate(data);
    }
  }, [data, onBaseInfoUpdate]);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <div className="flex-1 min-w-[350px] bg-blue-50 rounded-lg shadow-lg p-6 w-full overflow-y-auto h-full scrollbar-none pb-6">
      {/* Заголовок */}
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {stationId || "NS1120"}
        </h1>
      </div>

      {/* Основной контент */}
      <div className="flex justify-between gap-6">
        {/* Блок с информацией */}
        <div className="flex-1 p-4 overflow-hidden bg-white rounded-lg shadow-md bg-background text-text">
          <h2 className="mb-4 text-xl font-semibold">Информация</h2>
          <div className="space-y-3 break-words">
            <p>Название: {stationId || "NS1120"}</p>
            <p>Месяц: 99.5%</p>
            <p>Год: 98.9%</p>
            <p>Статус: Активна</p>
          </div>
        </div>

        {/* График */}
        <div className="flex items-center justify-center flex-1 p-4 rounded-lg shadow-md bg-background">
          <Schedule data={data} />
        </div>
      </div>

      {/* Таблица */}
      <div className="mt-6">
        <BsTable dataInfo={data} />
      </div>
    </div>
  );
};

export { Information };
