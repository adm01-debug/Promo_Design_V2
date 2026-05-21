import { motion } from "framer-motion";

const CleanMinimalAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[50%] max-h-[45%] object-contain"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.1))" }}
    />
  </motion.div>
);

export default CleanMinimalAnimation;
