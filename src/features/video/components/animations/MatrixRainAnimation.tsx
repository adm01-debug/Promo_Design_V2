import { useState } from "react";
import { motion } from "framer-motion";

const MatrixRainAnimation = ({ productImage }: { productImage: string }) => {
  const cols = 10;
  const [columns] = useState(() =>
    Array.from({ length: cols }, () => ({
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
      digits: Array.from({ length: 5 }, () => (Math.random() > 0.5 ? "1" : "0")),
    })),
  );

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
      {columns.map((c, i) => (
        <motion.div
          key={i}
          className="absolute top-0 text-[8px] font-mono text-primary/30 leading-3 select-none"
          style={{ left: `${i * 10 + 2}%` }}
          animate={{ y: [-20, 500] }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {c.digits.map((d, j) => (
            <div key={j}>{d}</div>
          ))}
        </motion.div>
      ))}
      <img
        src={productImage}
        alt=""
        className="max-w-[50%] max-h-[45%] object-contain drop-shadow-2xl relative z-10"
      />
    </motion.div>
  );
};

export default MatrixRainAnimation;
