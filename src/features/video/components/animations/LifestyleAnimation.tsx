import { motion } from "framer-motion";

const LifestyleAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"
      animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[50%] max-h-[45%] object-contain drop-shadow-2xl relative z-10"
      animate={{ y: [-8, 8, -8], x: [-4, 4, -4] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

export default LifestyleAnimation;
