import { useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Clock, Eye, Star, Copy, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ProjectCardProps {
  title: string;
  category: string;
  thumbnail: string;
  lastEdited: string;
  views: number;
  index: number;
  path?: string;
}

const ProjectCard = ({ title, category, thumbnail, lastEdited, views, index, path }: ProjectCardProps) => {
  const [fav, setFav] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    if (path) navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-glow shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer"
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); setFav(!fav); }}
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="absolute top-2 right-2 p-1.5 rounded-md glass opacity-0 group-hover:opacity-100 transition-all"
        >
          <Star className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-yellow-400 text-yellow-400" : "text-foreground"}`} />
        </button>

        {/* Hover Actions */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <span className="px-2.5 py-1 rounded-md bg-gradient-primary text-primary-foreground text-xs font-semibold">
            Abrir
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Mais opções"
                className="p-1.5 rounded-md glass text-foreground hover:bg-surface-3"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(title); toast.success("Nome copiado!"); }}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copiar nome
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display font-semibold text-foreground text-sm truncate pr-2">
            {title}
          </h3>
        </div>
        <span className="text-xs font-mono text-primary uppercase tracking-wider">{category}</span>
        <div className="flex items-center gap-3 mt-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" /> {lastEdited}
          </span>
          {views > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Eye className="w-3 h-3" /> {views}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
