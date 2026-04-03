import { motion } from "framer-motion";
import { Video, Search, Clock, Download, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const VideoHistory = () => {
  const [search, setSearch] = useState("");
  const videos: Array<{ id: string; productName: string; aspectRatio: string; createdAt: string }> = [];

  return (
    <div className="p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">
          Histórico de <span className="text-gradient-primary">Vídeos</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Vídeos publicitários gerados anteriormente</p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar vídeos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1">Nenhum vídeo gerado</h3>
            <p className="text-sm text-muted-foreground">Crie seu primeiro vídeo publicitário no Video Studio</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video: any, i: number) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className="aspect-video bg-surface-2 relative flex items-center justify-center">
                  <Play className="w-10 h-10 text-muted-foreground" />
                  <div className="absolute inset-0 bg-card/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <Eye className="w-3 h-3" /> Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <Download className="w-3 h-3" /> Baixar
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-display font-semibold text-foreground truncate">{video.productName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <span className="text-[10px] font-mono">{video.aspectRatio}</span>
                    <span className="text-[10px]">·</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-2.5 h-2.5" /> {video.createdAt}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VideoHistory;
