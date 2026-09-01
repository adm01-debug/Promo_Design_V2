import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const GlitchAnimation = ({ productImage }: { productImage: string }) => {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <motion.img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl" animate={glitch ? { x: [0, -4, 4, -2, 0], filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(45deg)", "hue-rotate(0deg)"] } : { x: 0, filter: "hue-rotate(0deg)" }} transition={{ duration: 0.15 }} />
      {glitch && (
        <>
          <motion.div className="absolute inset-0 bg-primary/10" style={{ clipPath: "inset(30% 0 40% 0)" }} animate={{ x: [0, 8, -8, 0] }} transition={{ duration: 0.15 }} />
          <motion.div className="absolute inset-0 bg-destructive/10" style={{ clipPath: "inset(60% 0 10% 0)" }} animate={{ x: [0, -6, 6, 0] }} transition={{ duration: 0.15 }} />
        </>
      )}
    </motion.div>
  );
};

export default GlitchAnimation;
