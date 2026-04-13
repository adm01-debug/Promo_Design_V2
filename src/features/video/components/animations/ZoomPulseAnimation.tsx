import { motion } from "framer-motion";

const ZoomPulseAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.div className="absolute inset-0 rounded-full bg-primary/5" style={{ margin: "auto", width: "60%", height: "60%" }} animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
    <motion.img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl relative z-10" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
  </motion.div>
);

export default ZoomPulseAnimation;
