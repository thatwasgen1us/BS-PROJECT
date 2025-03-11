import { Comments, Information, Stations } from "@/components";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SiteInfo } from "../api/api";

const Home = () => {
  const { stationId } = useParams();
  const [baseInfo, setBaseInfo] = useState<SiteInfo | null>(null); // Состояние для хранения данных

  const handleBaseInfoUpdate = (data: SiteInfo) => {
    setBaseInfo(data); // Обновляем состояние с полученными данными
  };

  return (
    <div className="flex justify-between gap-2 p-2 mx-auto h-dvh">
      {stationId ? (
        <>
          <Stations />
          <Information onBaseInfoUpdate={handleBaseInfoUpdate}/>
          <Comments data={baseInfo}/>
        </>
      ) : (
        <>
          <Stations />
          <h1 className="text-2xl font-semibold text-text">
            Выберите базовую станцию
          </h1>
          <Comments data={baseInfo}/>
        </>
      )}
    </div>
  );
};

export default Home;
