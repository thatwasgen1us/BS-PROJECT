import { Comments, Information, Stations } from "@/components";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SiteInfo } from "@/api/api";

const Home = () => {
  const { stationId } = useParams();
  const [baseInfo, setBaseInfo] = useState<SiteInfo | null>(null);

  const handleBaseInfoUpdate = (data: SiteInfo) => {
    setBaseInfo(data);
  };

  return (
    <div className="flex justify-between gap-2 p-2 pt-16 mx-auto h-dvh">
      {stationId ? (
        <>
          <Stations />
          <Information onBaseInfoUpdate={handleBaseInfoUpdate} />
          <Comments data={baseInfo} />
        </>
      ) : (
        <>
          <Stations />
          <h1 className="text-2xl font-semibold text-text">
            Выберите базовую станцию
          </h1>
          <Comments />
        </>
      )}
    </div>
  );
};

export default Home;
