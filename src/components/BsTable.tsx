import { SiteInfo, WeekData } from "@/api/api";

interface Props {
  dataInfo: SiteInfo | null | undefined;
}

const BsTable: React.FC<Props> = ({ dataInfo }) => {
  const data = dataInfo?.site_info;
  return (
    <div className="my-12 mt-6 overflow-x-auto rounded-lg shadow-md">
      <div className="min-w-[800px] text-center">
        {/* Заголовки таблицы */}
        <div className="grid grid-cols-[repeat(5,100px)_1fr] gap-4 p-3 rounded-t-lg bg-background text-text items-center">
          <div className="font-semibold">Неделя</div>
          <div className="font-semibold">Время работы АКБ</div>
          <div className="font-semibold">Кол-во отключений</div>
          <div className="font-semibold">Время отключения</div>
          <div className="font-semibold">Процент в работе</div>
          <div className="font-semibold">Заявки</div>
        </div>

        {/* Данные таблицы */}
        <div className="text-center bg-white divide-y divide-gray-200">
          {data?.map((week: WeekData, index: number) => {
            const isCA2GLessThan100 = Number(week.CA_2G) < 100;
            const isCountOfAlarmsGreaterThan0 =
              Number(week.count_of_alarms) > 0;
            const isCA2GNotEmpty = week.CA_2G !== "";

            if (
              (isCA2GLessThan100 || isCountOfAlarmsGreaterThan0) &&
              isCA2GNotEmpty
            ) {
              return (
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
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export { BsTable };
