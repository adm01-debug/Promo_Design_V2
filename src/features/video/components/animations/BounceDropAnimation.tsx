import { motion } from "framer-motion";

const BounceDropAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
      initial={{ y: -300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, mass: 1.2 }}
    />
    <motion.div
      className="absolute bottom-[30%] w-[30%] h-2 rounded-full bg-foreground/5 blur-sm"
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.3 }}
    />
  </motion.div>
);

export default BounceDropAnimation;
