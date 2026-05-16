import { motion } from "framer-motion";

const AmbassadorAnimation = ({ productImage, characterAvatar }: { productImage: string, characterAvatar: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
    {/* Character on the left */}
    <motion.div 
      className="absolute left-4 bottom-12 text-7xl"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {characterAvatar}
      <motion.div 
        className="absolute -right-2 top-0 bg-primary/20 rounded-full w-4 h-4"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>

    {/* Product being presented */}
    <motion.div 
      className="relative z-10"
      initial={{ scale: 0.5, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.img 
        src={productImage} 
        alt="" 
        className="max-w-[180px] max-h-[180px] object-contain mx-auto drop-shadow-2xl" 
        style={{ filter: "drop-shadow(0 0 40px hsl(var(--primary) / 0.4))" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Decorative sparkles */}
      <motion.div 
        className="absolute -top-4 -right-4 text-primary"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ✨
      </motion.div>
    </motion.div>

    {/* Presentation beam */}
    <motion.div 
      className="absolute left-[80px] bottom-[100px] w-[140px] h-[2px] bg-gradient-to-r from-primary/40 to-transparent origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    />
  </motion.div>
);

export default AmbassadorAnimation;
