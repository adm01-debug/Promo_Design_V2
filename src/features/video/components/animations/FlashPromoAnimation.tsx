import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const FlashPromoAnimation = ({ productImage }: { productImage: string }) => {
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setFlash((f) => (f + 1) % 3), 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div key={flash} initial={{ scale: 1.3, opacity: 0, rotate: -3 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.8, opacity: 0, rotate: 3 }} transition={{ duration: 0.3 }} className="flex items-center justify-center">
          <img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl" />
        </motion.div>
      </AnimatePresence>
      <motion.div className="absolute inset-0 bg-primary/10" animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 0.8, repeat: Infinity }} />
    </motion.div>
  );
};

export default FlashPromoAnimation;
