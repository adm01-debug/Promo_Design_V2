/**
 * Local type shim for `recharts`.
 *
 * The installed `recharts` package ships an incomplete `types/` folder
 * (only `chart/` and `util/`, no component declarations), so we provide
 * pragmatic typings here: every chart component is a React FC accepting
 * arbitrary props, but the module exports proper named symbols so
 * autocomplete and JSX usage work without `any` at the import site.
 */
declare module "recharts" {
  import type { ComponentType, ReactNode, CSSProperties, SVGProps, RefAttributes } from "react";

  // ---- Shared prop shapes -------------------------------------------------

  export interface Margin {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }

  export interface TooltipPayloadEntry<TValue = number | string, TName = string> {
    name?: TName;
    value?: TValue;
    dataKey?: string | number;
    color?: string;
    fill?: string;
    stroke?: string;
    unit?: string;
    type?: string;
    payload?: Record<string, unknown>;
  }

  export interface TooltipProps<TValue = number | string, TName = string> {
    active?: boolean;
    payload?: TooltipPayloadEntry<TValue, TName>[];
    label?: string | number;
    labelFormatter?: (label: unknown, payload: TooltipPayloadEntry<TValue, TName>[]) => ReactNode;
    formatter?: (
      value: TValue,
      name: TName,
      item: TooltipPayloadEntry<TValue, TName>,
      index: number,
      payload: Record<string, unknown>,
    ) => ReactNode;
    contentStyle?: CSSProperties;
    labelStyle?: CSSProperties;
    labelClassName?: string;
    itemStyle?: CSSProperties;
    wrapperStyle?: CSSProperties;
    cursor?: boolean | object | ReactNode;
    content?: ReactNode | ComponentType<TooltipProps<TValue, TName>>;
    separator?: string;
    offset?: number;
    isAnimationActive?: boolean;
    animationDuration?: number;
    animationEasing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
    filterNull?: boolean;
    allowEscapeViewBox?: { x?: boolean; y?: boolean };
    position?: { x?: number; y?: number };
    coordinate?: { x: number; y: number };
    viewBox?: { x?: number; y?: number; width?: number; height?: number };
  }

  export interface LegendPayloadEntry {
    value?: string;
    id?: string;
    type?: string;
    color?: string;
    dataKey?: string | number;
    payload?: Record<string, unknown>;
  }

  export interface LegendProps {
    payload?: LegendPayloadEntry[];
    verticalAlign?: "top" | "middle" | "bottom";
    align?: "left" | "center" | "right";
    layout?: "horizontal" | "vertical";
    iconType?: string;
    iconSize?: number;
    wrapperStyle?: CSSProperties;
    height?: number;
    width?: number;
    content?: ReactNode | ComponentType<LegendProps>;
    formatter?: (value: string, entry: LegendPayloadEntry, index: number) => ReactNode;
    onClick?: (data: LegendPayloadEntry, index: number, event: React.MouseEvent) => void;
    onMouseEnter?: (data: LegendPayloadEntry, index: number, event: React.MouseEvent) => void;
    onMouseLeave?: (data: LegendPayloadEntry, index: number, event: React.MouseEvent) => void;
  }

  // Permissive base for chart/series props — allows any extra recharts prop
  // while still surfacing the most common ones in autocomplete.
  interface BaseChartProps {
    width?: number;
    height?: number;
    data?: readonly Record<string, unknown>[];
    margin?: Margin;
    layout?: "horizontal" | "vertical";
    syncId?: string | number;
    syncMethod?: "index" | "value" | ((tooltipTicks: unknown[], data: unknown) => number);
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    onClick?: (data: unknown, event: React.MouseEvent) => void;
    onMouseEnter?: (data: unknown, event: React.MouseEvent) => void;
    onMouseLeave?: (data: unknown, event: React.MouseEvent) => void;
    [key: string]: unknown;
  }

  interface SeriesProps {
    dataKey?: string | number | ((data: Record<string, unknown>) => number | string);
    name?: string;
    type?: string;
    stackId?: string | number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    fillOpacity?: number;
    radius?: number | [number, number, number, number];
    barSize?: number;
    isAnimationActive?: boolean;
    animationDuration?: number;
    animationEasing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
    label?: boolean | object | ReactNode | ComponentType<unknown>;
    children?: ReactNode;
    [key: string]: unknown;
  }

  interface AxisProps {
    dataKey?: string | number;
    type?: "number" | "category";
    domain?: ReadonlyArray<
      number | string | "auto" | "dataMin" | "dataMax" | ((v: number) => number)
    >;
    allowDecimals?: boolean;
    allowDataOverflow?: boolean;
    tick?: boolean | object | ReactNode | ComponentType<unknown>;
    tickFormatter?: (value: unknown, index: number) => string;
    tickLine?: boolean | object;
    axisLine?: boolean | object;
    width?: number;
    height?: number;
    orientation?: "top" | "bottom" | "left" | "right";
    hide?: boolean;
    label?: string | number | ReactNode | object;
    children?: ReactNode;
    [key: string]: unknown;
  }

  // ---- Containers ---------------------------------------------------------

  export interface ResponsiveContainerProps {
    aspect?: number;
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    maxHeight?: number;
    children?: ReactNode;
    debounce?: number;
    id?: string | number;
    className?: string;
    style?: CSSProperties;
  }
  export const ResponsiveContainer: ComponentType<
    ResponsiveContainerProps & RefAttributes<HTMLDivElement>
  >;

  // ---- Chart wrappers -----------------------------------------------------

  export const BarChart: ComponentType<BaseChartProps>;
  export const LineChart: ComponentType<BaseChartProps>;
  export const AreaChart: ComponentType<BaseChartProps>;
  export const PieChart: ComponentType<BaseChartProps>;
  export const RadarChart: ComponentType<BaseChartProps>;
  export const RadialBarChart: ComponentType<BaseChartProps>;
  export const ScatterChart: ComponentType<BaseChartProps>;
  export const ComposedChart: ComponentType<BaseChartProps>;
  export const FunnelChart: ComponentType<BaseChartProps>;
  export const Treemap: ComponentType<BaseChartProps>;
  export const Sankey: ComponentType<BaseChartProps>;

  // ---- Series -------------------------------------------------------------

  export const Bar: ComponentType<SeriesProps>;
  export const Line: ComponentType<SeriesProps>;
  export const Area: ComponentType<SeriesProps>;
  export const Pie: ComponentType<
    SeriesProps & {
      cx?: number | string;
      cy?: number | string;
      innerRadius?: number | string;
      outerRadius?: number | string;
      startAngle?: number;
      endAngle?: number;
      paddingAngle?: number;
      minAngle?: number;
      nameKey?: string;
    }
  >;
  export const Radar: ComponentType<SeriesProps>;
  export const RadialBar: ComponentType<SeriesProps>;
  export const Scatter: ComponentType<SeriesProps>;
  export const Funnel: ComponentType<SeriesProps>;

  // ---- Axes / grid / overlays --------------------------------------------

  export const XAxis: ComponentType<AxisProps>;
  export const YAxis: ComponentType<AxisProps>;
  export const ZAxis: ComponentType<AxisProps>;
  export const PolarAngleAxis: ComponentType<AxisProps>;
  export const PolarRadiusAxis: ComponentType<AxisProps>;
  export const PolarGrid: ComponentType<{
    gridType?: "polygon" | "circle";
    [key: string]: unknown;
  }>;
  export const CartesianGrid: ComponentType<{
    horizontal?: boolean;
    vertical?: boolean;
    strokeDasharray?: string;
    stroke?: string;
    fill?: string;
    [key: string]: unknown;
  }>;

  export const Tooltip: ComponentType<TooltipProps>;
  export const Legend: ComponentType<LegendProps>;
  export const Brush: ComponentType<{ dataKey?: string; height?: number; [key: string]: unknown }>;

  export const ReferenceLine: ComponentType<{
    x?: number | string;
    y?: number | string;
    [key: string]: unknown;
  }>;
  export const ReferenceArea: ComponentType<{ [key: string]: unknown }>;
  export const ReferenceDot: ComponentType<{
    x?: number | string;
    y?: number | string;
    [key: string]: unknown;
  }>;

  export const Cell: ComponentType<SVGProps<SVGElement> & { [key: string]: unknown }>;
  export const LabelList: ComponentType<{
    dataKey?: string | number;
    position?: string;
    formatter?: (value: unknown) => ReactNode;
    [key: string]: unknown;
  }>;
  export const Label: ComponentType<{
    value?: string | number;
    position?: string;
    [key: string]: unknown;
  }>;
  export const Sector: ComponentType<SVGProps<SVGPathElement> & { [key: string]: unknown }>;

  // ---- Default export (rare, but recharts exposes it) --------------------

  const recharts: {
    BarChart: typeof BarChart;
    LineChart: typeof LineChart;
    AreaChart: typeof AreaChart;
    PieChart: typeof PieChart;
    Tooltip: typeof Tooltip;
    Legend: typeof Legend;
  };
  export default recharts;
}
