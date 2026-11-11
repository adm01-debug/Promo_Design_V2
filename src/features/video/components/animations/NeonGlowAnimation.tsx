import { motion } from "framer-motion";

const NeonGlowAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.div
      className="relative"
      animate={{
        filter: [
          "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))",
          "drop-shadow(0 0 25px hsl(var(--primary) / 0.8))",
          "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain mx-auto" />
    </motion.div>
  </motion.div>
);

export default NeonGlowAnimation;
