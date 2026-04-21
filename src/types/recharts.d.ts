// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "recharts" {
  // Allow any named import (e.g. BarChart, XAxis, LegendProps) without strict typing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExport: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type LegendProps = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default anyExport;
  // Re-export catch-all so `import { X } from "recharts"` resolves to any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BarChart: any, Bar: any, XAxis: any, YAxis: any, Tooltip: any,
    ResponsiveContainer: any, CartesianGrid: any, PieChart: any, Pie: any,
    Cell: any, AreaChart: any, Area: any, LineChart: any, Line: any, Legend: any,
    RadialBarChart: any, RadialBar: any, ScatterChart: any, Scatter: any,
    ComposedChart: any, ReferenceLine: any, ReferenceArea: any, ReferenceDot: any,
    Brush: any, LabelList: any, Label: any, Sector: any, Funnel: any, FunnelChart: any,
    Treemap: any, Sankey: any, RadarChart: any, Radar: any, PolarGrid: any,
    PolarAngleAxis: any, PolarRadiusAxis: any;
}