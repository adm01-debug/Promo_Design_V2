import { motion } from "framer-motion";

const CinematicAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute top-0 left-0 right-0 h-[12%] bg-black z-20"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    />
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-[12%] bg-black z-20"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    />
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <motion.img
        src={productImage}
        alt=""
        className="max-w-[60%] max-h-[50%] object-contain drop-shadow-2xl"
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  </motion.div>
);

export default CinematicAnimation;
