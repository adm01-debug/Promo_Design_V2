import { motion } from "framer-motion";

const Showcase360Animation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl" animate={{ rotateY: [0, 360] }} transition={{ duration: 4, ease: "linear", repeat: Infinity }} style={{ perspective: 800 }} />
  </motion.div>
);

export default Showcase360Animation;
