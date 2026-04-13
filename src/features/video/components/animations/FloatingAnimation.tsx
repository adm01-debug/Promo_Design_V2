import { motion } from "framer-motion";

const FloatingAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    {[...Array(12)].map((_, i) => (
      <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30" animate={{ y: [100, -100], x: [Math.random() * 20 - 10, Math.random() * 20 - 10], opacity: [0, 0.8, 0] }} transition={{ duration: 3 + Math.random() * 2, delay: i * 0.3, repeat: Infinity, ease: "easeOut" }} style={{ left: `${5 + i * 8}%`, bottom: 0 }} />
    ))}
    <motion.img src={productImage} alt="" className="max-w-[50%] max-h-[45%] object-contain drop-shadow-2xl relative z-10" animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
  </motion.div>
);

export default FloatingAnimation;
