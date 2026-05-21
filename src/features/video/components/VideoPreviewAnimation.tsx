import { AnimatePresence, motion } from "framer-motion";
import {
  RevealAnimation,
  Showcase360Animation,
  FlashPromoAnimation,
  LifestyleAnimation,
  UnboxingAnimation,
  CleanMinimalAnimation,
  SocialBurstAnimation,
  StoryCarouselAnimation,
  ZoomPulseAnimation,
  SplitRevealAnimation,
  GlitchAnimation,
  FloatingAnimation,
  CinematicAnimation,
  NeonGlowAnimation,
  BounceDropAnimation,
  MorphShapesAnimation,
  SpotlightAnimation,
  TypewriterAnimation,
  ColorSweepAnimation,
  MatrixRainAnimation,
  AmbassadorAnimation,
} from "./animations";

interface VideoPreviewAnimationProps {
  templateId: string;
  productImage: string;
  productName: string;
  characterAvatar?: string;
}

const ANIMATION_MAP: Record<
  string,
  React.FC<{ productImage: string; characterAvatar?: string }>
> = {
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
  neonglow: NeonGlowAnimation,
  bouncedrop: BounceDropAnimation,
  morphshapes: MorphShapesAnimation,
  spotlight: SpotlightAnimation,
  typewriter: TypewriterAnimation,
  colorsweep: ColorSweepAnimation,
  matrixrain: MatrixRainAnimation,
  ambassador: AmbassadorAnimation,
};

const VideoPreviewAnimation = ({
  templateId,
  productImage,
  productName,
  characterAvatar,
}: VideoPreviewAnimationProps) => {
  const AnimComponent = ANIMATION_MAP[templateId];

  if (!AnimComponent) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img
          src={productImage}
          alt={productName}
          className="max-w-[55%] max-h-[50%] object-contain drop-shadow-2xl"
        />
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
        <AnimComponent productImage={productImage} characterAvatar={characterAvatar} />
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPreviewAnimation;
