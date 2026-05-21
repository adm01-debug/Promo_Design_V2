import { motion } from "framer-motion";

const SplitRevealAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute top-0 left-0 w-1/2 h-full bg-primary/10 z-20"
      initial={{ x: 0 }}
      animate={{ x: "-100%" }}
      transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
    />
    <motion.div
      className="absolute top-0 right-0 w-1/2 h-full bg-secondary/10 z-20"
      initial={{ x: 0 }}
      animate={{ x: "100%" }}
      transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
    />
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <motion.img
        src={productImage}
        alt=""
        className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease: "backOut" }}
      />
    </motion.div>
  </motion.div>
);

export default SplitRevealAnimation;
