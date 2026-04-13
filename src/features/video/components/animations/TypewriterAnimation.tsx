import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const TypewriterAnimation = ({ productImage }: { productImage: string }) => {
  const text = "OFERTA ESPECIAL";
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setChars((c) => {
        if (c >= text.length) {
          setTimeout(() => setChars(0), 1500);
          return c;
        }
        return c + 1;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-4">
      <motion.img src={productImage} alt="" className="max-w-[45%] max-h-[35%] object-contain drop-shadow-2xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} />
      <div className="text-primary font-display font-bold text-sm tracking-widest">
        {text.slice(0, chars)}
        <motion.span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />
      </div>
    </motion.div>
  );
};

export default TypewriterAnimation;
