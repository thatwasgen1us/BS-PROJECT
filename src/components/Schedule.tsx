import { useCallback, useMemo, useState } from "react";
import { SiteInfo, WeekData } from "@/api/api";
import { Link, useNavigate } from "react-router-dom";

interface ScheduleProps {
  data: SiteInfo | null | undefined;
}

const Schedule: React.FC<ScheduleProps> = ({ data }) => {
  const dataObj = data?.site_info;
  const navigate = useNavigate();

  const hasData = Array.isArray(dataObj) && dataObj.length > 0;

  const limitedData = useMemo(
    () => (hasData ? dataObj.slice(-52) : []),
    [dataObj, hasData]
  );

  const rowsData = useMemo(
    () =>
      limitedData.map((item) => ({
        ...item,
        CA_2G: Number(item.CA_2G),
      })),
    [limitedData]
  );

  const rows = useMemo(
    () =>
      Array.from({ length: Math.ceil(rowsData.length / 13) }, (_, i) =>
        rowsData.slice(i * 13, i * 13 + 13)
      ),
    [rowsData]
  );

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
  const [, setHoveredKey] = useState<string | null>(null);

  const getColor = useCallback((value: number): string => {
    if (value === 100) return "#43a047";
    if (value >= 99.8) return "orange";
    if (value === 0) return "gray";
    return "#d32f2f";
  }, []);

  const handleMouseEnter = useCallback(
    (item: WeekData & { CA_2G: string | number }, event: React.MouseEvent) => {
      setTooltip({
        visible: true,
        content: `${item.weak}: ${item.CA_2G}%`,
        x: event.clientX,
        y: event.clientY,
      });
      setHoveredKey(item.weak);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip({ visible: false, content: "", x: 0, y: 0 });
    setHoveredKey(null);
  }, []);

  const handleAnchorClick = useCallback(
    (event: React.MouseEvent, item: WeekData & { CA_2G: string | number }) => {
      event.preventDefault(); 
  
      navigate(`#${item.weak}`, { replace: true });
  
      setTimeout(() => {
        const element = document.getElementById(item.weak);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center', // Прокручивает элемент к центру экрана
          });
        }
      }, 100);
    },
    [navigate] 
  );

  return (
    <div className="table-container">
      <div className="table">
        {rows.length > 0 ? (
          rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex row">
              {row.map((item) => {
                const weakValue = item.weak
                  ? Number(item.weak.slice(-2))
                  : null;
                return (
                  <Link
                    to={`#${item.weak}`} 
                    key={item.weak}
                    className="flex items-center justify-center w-8 h-8 p-2 duration-75 border border-gray-300 rounded cursor-default du hover:scale-105"
                    style={{ backgroundColor: getColor(item.CA_2G) }}
                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleAnchorClick(e, item)}
                  >
                    {weakValue !== null && weakValue > 17 && weakValue < 43 && (
                      <span>☀</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))
        ) : (
          <div>No data available</div>
        )}
      </div>
  
      {tooltip.visible && (
        <div
          className="fixed z-50 p-2 bg-white border border-black rounded shadow-lg tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          <div>{tooltip.content}</div>
        </div>
      )}
    </div>
  );
};

export { Schedule };
