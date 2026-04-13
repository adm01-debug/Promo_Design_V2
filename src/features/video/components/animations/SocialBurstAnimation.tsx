import { motion } from "framer-motion";

const SocialBurstAnimation = ({ productImage }: { productImage: string }) => {
  const emojis = ["🔥", "✨", "💯", "🎉", "⚡", "❤️", "🙌", "💎"];
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
      <motion.img src={productImage} alt="" className="max-w-[50%] max-h-[45%] object-contain drop-shadow-xl relative z-10" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
      {emojis.map((emoji, i) => (
        <motion.span key={i} className="absolute text-lg z-0" initial={{ opacity: 0, y: 40, scale: 0 }} animate={{ opacity: [0, 1, 0], y: [40, -60], scale: [0, 1.2, 0.8] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity, repeatDelay: emojis.length * 0.4 - 2 }} style={{ left: `${15 + (i % 4) * 22}%`, top: `${20 + Math.floor(i / 4) * 40}%` }}>
          {emoji}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default SocialBurstAnimation;
