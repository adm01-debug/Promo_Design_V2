import { motion } from "framer-motion";
import { Video, Search, Clock, Download, Eye, Play, TrendingUp, Film, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useVideos, type VideoEntry } from "../hooks/use-videos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const VideoHistory = () => {
  const [search, setSearch] = useState("");
  const { videos, isLoading, deleteVideo } = useVideos({ search });

  const stats = {
    total: videos.length,
    byFormat: videos.reduce((acc, v) => {
      acc[v.aspect_ratio] = (acc[v.aspect_ratio] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const pieData = Object.entries(stats.byFormat).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">
          Histórico de <span className="text-gradient-primary">Vídeos</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Vídeos publicitários gerados anteriormente</p>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de Vídeos</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Atividade
            </h3>
            <div className="h-[80px] flex items-end gap-1">
              {/* Simple dummy bar chart for activity since we don't have daily counts yet */}
              {[30, 45, 25, 60, 40, 55, 35].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-primary" /> Por Formato
            </h3>
            <div className="h-[80px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value" stroke="none">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">Sem dados</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar vídeos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Buscando seu histórico...</p>
          </div>
        ) : videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1">Nenhum vídeo gerado</h3>
            <p className="text-sm text-muted-foreground">Crie seu primeiro vídeo publicitário no Video Studio</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video, i: number) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="aspect-video bg-surface-2 relative flex items-center justify-center overflow-hidden">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Play className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="sm" className="h-8 text-xs gap-1" onClick={() => window.open(video.video_url, "_blank")}>
                      <Eye className="w-3 h-3" /> Ver
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 text-xs gap-1">
                      <Download className="w-3 h-3" /> Baixar
                    </Button>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteVideo.mutate(video.id); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-display font-semibold text-foreground truncate">{video.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <span className="text-[10px] font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border">{video.aspect_ratio}</span>
                    <span className="text-[10px]">·</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-2.5 h-2.5" /> {format(new Date(video.created_at), "dd MMM yyyy", { locale: ptBR })}
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
