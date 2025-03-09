import { useCallback, useMemo, useState } from "react";
import { baseStation } from "../mock";
import { week } from "../mock";

const Schedule = () => {
  const dataObj = baseStation;

  const hasData = Array.isArray(dataObj) && dataObj.length > 0;

  const limitedData = useMemo(() => (hasData ? dataObj.slice(0, 52) : []), [dataObj, hasData]);


  const rowsData = useMemo(() => 
    limitedData.map((item) => ({
      ...item,
      CA_2G: Number(item.CA_2G),
    })), 
    [limitedData]
  );

  const rows = useMemo(() => 
    Array.from({ length: Math.ceil(rowsData.length / 13) }, (_, i) =>
      rowsData.slice(i * 13, i * 13 + 13)
    ), 
    [rowsData]
  );

  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [, setHoveredKey] = useState<string | null>(null);

  const getColor = useCallback((value: number): string => {
    if (value === 100) return '#43a047';
    if (value >= 99.8) return 'orange';
    if (value === 0) return 'gray';
    return '#d32f2f';
  }, []);

  const handleMouseEnter = useCallback((item: week & { CA_2G: string | number }, event: React.MouseEvent) => {
    setTooltip({
      visible: true,
      content: `${item.weak}: ${item.CA_2G}%`,
      x: event.clientX,
      y: event.clientY,
    });
    setHoveredKey(item.weak);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip({ visible: false, content: '', x: 0, y: 0 });
    setHoveredKey(null);
  }, []);

  return (
    <div className="table-container">
      <div className="table">
        {rows.length > 0 ? (
          rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex row">
              {row.map((item) => {
                const weakValue = item.weak ? Number(item.weak.slice(-2)) : null;
                return (
                  <div
                    key={item.weak}
                    className="flex justify-center items-center p-2 w-8 h-8 rounded border border-gray-300 cursor-default hover:scale-105"
                    style={{ backgroundColor: getColor(item.CA_2G) }}
                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {weakValue !== null && weakValue > 17 && weakValue < 43 && (
                      <span>☀</span>
                    )}
                  </div>
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
          className="fixed z-50 p-2 bg-white rounded border border-black shadow-lg tooltip"
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
