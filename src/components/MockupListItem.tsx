import { motion } from "framer-motion";
import { Clock, Eye, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface MockupListItemProps {
  title: string;
  category: string;
  thumbnail: string;
  lastEdited: string;
  views: number;
  index: number;
  path?: string;
}

const MockupListItem = ({
  title,
  category,
  thumbnail,
  lastEdited,
  views,
  index,
  path,
}: MockupListItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    if (path) navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className={cn(
        "group relative flex gap-4 p-4 rounded-xl bg-card border border-border/50",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg",
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden shrink-0 bg-surface-2">
        {!imageLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
        <img
          src={thumbnail}
          alt={title}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            isHovered && "scale-110",
          )}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-1.5">
          <span className="text-xs font-mono text-primary uppercase tracking-wider">
            {category}
          </span>
          <h3 className="font-display font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3" /> {lastEdited}
          </span>
          {views > 0 && (
            <span className="flex items-center gap-1.5 text-xs">
              <Eye className="w-3 h-3" /> {views}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-5 w-5 text-primary" />
      </div>
    </motion.div>
  );
};

export default MockupListItem;
