import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
}

export function SimpleBarChart({ data, height = 200, showValues = true }: SimpleBarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = item.color || 'hsl(var(--primary))';

        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{item.label}</span>
              {showValues && (
                <span className="text-muted-foreground ml-2">{item.value}</span>
              )}
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  minWidth: item.value > 0 ? '2rem' : '0'
                }}
              >
                {item.value > 0 && showValues && (
                  <span className="text-xs font-bold text-white">
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SimplePieChartProps {
  data: DataPoint[];
  size?: number;
}

export function SimplePieChart({ data, size = 200 }: SimplePieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  let currentAngle = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`;

          // Créer un arc SVG
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
          const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M 50 50`,
            `L ${startX} ${startY}`,
            `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={color}
              stroke="white"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>

      {/* Légende */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`;

          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{item.label}</span>
              <span className="text-muted-foreground ml-auto">
                {Math.round(percentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}

export function SimpleLineChart({ data, height = 200, color = 'hsl(var(--primary))' }: SimpleLineChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  const range = maxValue - minValue || 1;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return { x, y, value: item.value };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaData = `${pathData} L 100 100 L 0 100 Z`;

  return (
    <div className="space-y-2">
      <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Aire sous la courbe */}
        <path
          d={areaData}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Ligne */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}