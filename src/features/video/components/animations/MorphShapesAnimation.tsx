import { motion } from "framer-motion";

const MorphShapesAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    {[...Array(4)].map((_, i) => (
      <motion.div key={i} className="absolute border border-primary/20 rounded-full" style={{ width: 80 + i * 50, height: 80 + i * 50 }} animate={{ rotate: [0, 360], borderRadius: ["50%", "30%", "50%"], scale: [1, 1.1, 1] }} transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear", delay: i * 0.5 }} />
    ))}
    <motion.img src={productImage} alt="" className="max-w-[45%] max-h-[40%] object-contain drop-shadow-2xl relative z-10" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
  </motion.div>
);

export default MorphShapesAnimation;
