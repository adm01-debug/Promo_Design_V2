import { motion } from "framer-motion";

interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

const MiniSparkline = ({
  data,
  color = "hsl(var(--primary))",
  width = 60,
  height = 20,
}: MiniSparklineProps) => {
  if (!data.length || data.every((v) => v === 0)) return null;

  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * height,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </motion.svg>
  );
};

export default MiniSparkline;
