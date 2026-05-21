import { motion } from "framer-motion";

const UnboxingAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    <motion.div
      className="absolute top-0 left-0 right-0 h-1/2 bg-surface-2 border-b border-border z-20 flex items-end justify-center pb-2"
      initial={{ y: 0 }}
      animate={{ y: "-100%" }}
      transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="text-[10px] font-mono text-muted-foreground">📦</span>
    </motion.div>
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1/2 bg-surface-2 border-t border-border z-20"
      initial={{ y: 0 }}
      animate={{ y: "100%" }}
      transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.2, ease: "backOut" }}
    />
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full bg-primary"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
          x: [0, (Math.random() - 0.5) * 120],
          y: [0, (Math.random() - 0.5) * 120],
        }}
        transition={{ duration: 1, delay: 1.4 + i * 0.1, ease: "easeOut" }}
      />
    ))}
  </motion.div>
);

export default UnboxingAnimation;
