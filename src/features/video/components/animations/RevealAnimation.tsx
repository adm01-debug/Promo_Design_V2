import { motion } from "framer-motion";

const RevealAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.div className="relative" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}>
      <motion.img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain mx-auto drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px hsl(var(--primary) / 0.3))" }} />
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" initial={{ x: "-200%" }} animate={{ x: "200%" }} transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }} />
    </motion.div>
  </motion.div>
);

export default RevealAnimation;
