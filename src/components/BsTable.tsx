import { baseStation } from "../mock";
import { week } from "../mock";

const BsTable = () => {
  const data = baseStation;
  return (
    <div className="overflow-x-auto my-12 mt-6 rounded-lg shadow-md">
      <div className="min-w-[800px] text-center">
        {/* Заголовки таблицы */}
        <div className="grid grid-cols-[repeat(5,100px)_1fr] gap-4 p-3 rounded-t-lg bg-background text-text">
          <div className="font-semibold">Неделя</div>
          <div className="font-semibold">Change of Battery</div>
          <div className="font-semibold">Count of Alarms</div>
          <div className="font-semibold">Time of Alarms</div>
          <div className="font-semibold">Cell Availability</div>
          <div className="font-semibold">Combine</div>
        </div>

        {/* Данные таблицы */}
        <div className="text-center bg-white divide-y divide-gray-200">
          {data?.map(
            (week: week, index: number) =>
              Number(week.CA_2G) < 100 &&
              week.CA_2G !== "" && (
                <div
                  key={week.weak || index}
                  className="grid grid-cols-[repeat(5,100px)_1fr] gap-4 p-3 transition-colors duration-200 hover:bg-gray-50"
                >
                  <div className="text-gray-800">{week.weak}</div>
                  <div className="text-gray-800">{week.change_of_battery}</div>
                  <div className="text-gray-800">{week.count_of_alarms}</div>
                  <div className="text-gray-800">
                    {typeof week.time_of_alarms === "string" &&
                    week.time_of_alarms.length > 0
                      ? week.time_of_alarms.includes("1900")
                        ? week.time_of_alarms.split("T")[1]?.split(".")[0]
                        : week.time_of_alarms.split(".")[0]
                      : ""}
                  </div>
                  <div className="text-gray-800">{week.CA_2G} %</div>
                  <div
                    className="ml-4 text-left text-gray-800"
                    dangerouslySetInnerHTML={{
                      __html: week.combined_text
                        ? week.combined_text.replace(/\/n/g, "<br />")
                        : "",
                    }}
                  />
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
};

export { BsTable };
