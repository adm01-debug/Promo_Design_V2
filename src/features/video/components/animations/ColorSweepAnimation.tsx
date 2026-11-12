import { motion } from "framer-motion";

const ColorSweepAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    <motion.div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.15) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["-100% 0%", "200% 0%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
    />
    <img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl relative z-10"
    />
  </motion.div>
);

export default ColorSweepAnimation;
