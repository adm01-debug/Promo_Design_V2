import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const StoryCarouselAnimation = ({ productImage }: { productImage: string }) => {
  const [slide, setSlide] = useState(0);
  const colors = ["from-primary/20 to-transparent", "from-secondary/20 to-transparent", "from-accent/20 to-transparent"];
  useEffect(() => {
    const interval = setInterval(() => setSlide((s) => (s + 1) % 3), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={slide} className={`absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-b ${colors[slide]}`} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <motion.img src={productImage} alt="" className="max-w-[50%] max-h-[45%] object-contain drop-shadow-xl" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} />
          <div className="absolute bottom-6 left-4 right-4">
            <motion.div className="h-0.5 bg-primary/40 rounded-full overflow-hidden" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "linear" }} />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default StoryCarouselAnimation;
