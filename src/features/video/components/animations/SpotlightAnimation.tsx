import { motion } from "framer-motion";

const SpotlightAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden bg-black/40">
    <motion.div
      className="absolute w-[200px] h-[200px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)" }}
      animate={{ x: [-60, 60, -60], y: [-30, 30, -30] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />
    <img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl relative z-10"
    />
  </motion.div>
);

export default SpotlightAnimation;
