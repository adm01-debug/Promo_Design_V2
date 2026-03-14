import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface VideoPreviewAnimationProps {
  templateId: string;
  productImage: string;
  productName: string;
}

/** Reveal: zoom in com brilho */
const RevealAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.div
      className="relative"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.img
        src={productImage}
        alt=""
        className="max-w-[55%] max-h-[50%] object-contain mx-auto drop-shadow-2xl"
        style={{ filter: "drop-shadow(0 0 30px hsl(var(--primary) / 0.3))" }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-200%" }}
        animate={{ x: "200%" }}
        transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
      />
    </motion.div>
  </motion.div>
);

/** Showcase 360°: rotação suave */
const Showcase360Animation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
      animate={{ rotateY: [0, 360] }}
      transition={{ duration: 4, ease: "linear", repeat: Infinity }}
      style={{ perspective: 800 }}
    />
  </motion.div>
);

/** Flash Promo: cortes rápidos */
const FlashPromoAnimation = ({ productImage }: { productImage: string }) => {
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setFlash((f) => (f + 1) % 3), 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={flash}
          initial={{ scale: 1.3, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotate: 3 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <img src={productImage} alt="" className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl" />
        </motion.div>
      </AnimatePresence>
      <motion.div
        className="absolute inset-0 bg-primary/10"
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </motion.div>
  );
};

/** Lifestyle: parallax suave */
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

/** Unboxing: abertura de caixa */
const UnboxingAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    {/* Box lids */}
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
    {/* Sparkles */}
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

/** Clean Minimal: fade elegante */
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

/** Social Burst: emojis e efeitos sociais */
const SocialBurstAnimation = ({ productImage }: { productImage: string }) => {
  const emojis = ["🔥", "✨", "💯", "🎉", "⚡", "❤️", "🙌", "💎"];
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
      <motion.img
        src={productImage}
        alt=""
        className="max-w-[50%] max-h-[45%] object-contain drop-shadow-xl relative z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {emojis.map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute text-lg z-0"
          initial={{ opacity: 0, y: 40, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [40, -60],
            scale: [0, 1.2, 0.8],
          }}
          transition={{
            duration: 2,
            delay: i * 0.4,
            repeat: Infinity,
            repeatDelay: emojis.length * 0.4 - 2,
          }}
          style={{
            left: `${15 + (i % 4) * 22}%`,
            top: `${20 + Math.floor(i / 4) * 40}%`,
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </motion.div>
  );
};

/** Story Carousel: slides animados verticais */
const StoryCarouselAnimation = ({ productImage }: { productImage: string }) => {
  const [slide, setSlide] = useState(0);
  const colors = ["from-primary/20 to-transparent", "from-secondary/20 to-transparent", "from-accent/20 to-transparent"];
  useEffect(() => {
    const interval = setInterval(() => setSlide((s) => (s + 1) % 3), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          className={`absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-b ${colors[slide]}`}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={productImage}
            alt=""
            className="max-w-[50%] max-h-[45%] object-contain drop-shadow-xl"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          <div className="absolute bottom-6 left-4 right-4">
            <motion.div
              className="h-0.5 bg-primary/40 rounded-full overflow-hidden"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

/** Zoom Pulse: zoom pulsante contínuo */
const ZoomPulseAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6">
    <motion.div
      className="absolute inset-0 rounded-full bg-primary/5"
      style={{ margin: "auto", width: "60%", height: "60%" }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl relative z-10"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/** Split Reveal: divisão da tela */
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

/** Glitch Effect */
const GlitchAnimation = ({ productImage }: { productImage: string }) => {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-6">
      <motion.img
        src={productImage}
        alt=""
        className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
        animate={glitch ? {
          x: [0, -4, 4, -2, 0],
          filter: [
            "hue-rotate(0deg)",
            "hue-rotate(90deg)",
            "hue-rotate(-90deg)",
            "hue-rotate(45deg)",
            "hue-rotate(0deg)",
          ],
        } : { x: 0, filter: "hue-rotate(0deg)" }}
        transition={{ duration: 0.15 }}
      />
      {glitch && (
        <>
          <motion.div
            className="absolute inset-0 bg-primary/10"
            style={{ clipPath: "inset(30% 0 40% 0)" }}
            animate={{ x: [0, 8, -8, 0] }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            className="absolute inset-0 bg-destructive/10"
            style={{ clipPath: "inset(60% 0 10% 0)" }}
            animate={{ x: [0, -6, 6, 0] }}
            transition={{ duration: 0.15 }}
          />
        </>
      )}
    </motion.div>
  );
};

/** Floating particles */
const FloatingAnimation = ({ productImage }: { productImage: string }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/30"
        animate={{
          y: [100, -100],
          x: [Math.random() * 20 - 10, Math.random() * 20 - 10],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          delay: i * 0.3,
          repeat: Infinity,
          ease: "easeOut",
        }}
        style={{ left: `${5 + i * 8}%`, bottom: 0 }}
      />
    ))}
    <motion.img
      src={productImage}
      alt=""
      className="max-w-[50%] max-h-[45%] object-contain drop-shadow-2xl relative z-10"
      animate={{ y: [-4, 4, -4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/** Cinematic Bars */
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

const ANIMATION_MAP: Record<string, React.FC<{ productImage: string }>> = {
  reveal: RevealAnimation,
  showcase: Showcase360Animation,
  promo: FlashPromoAnimation,
  lifestyle: LifestyleAnimation,
  unboxing: UnboxingAnimation,
  minimal: CleanMinimalAnimation,
  social: SocialBurstAnimation,
  story: StoryCarouselAnimation,
  zoompulse: ZoomPulseAnimation,
  splitreveal: SplitRevealAnimation,
  glitch: GlitchAnimation,
  floating: FloatingAnimation,
  cinematic: CinematicAnimation,
};

const VideoPreviewAnimation = ({ templateId, productImage, productName }: VideoPreviewAnimationProps) => {
  const AnimComponent = ANIMATION_MAP[templateId];

  if (!AnimComponent) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img src={productImage} alt={productName} className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={templateId}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AnimComponent productImage={productImage} />
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPreviewAnimation;
