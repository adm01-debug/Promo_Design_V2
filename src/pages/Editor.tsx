import { useState } from "react";
import { motion } from "framer-motion";

import {
  MousePointer2, Type, Square, Circle, Image, Download,
  ZoomIn, ZoomOut, Undo, Redo, Layers, Move,
  Palette, AlignLeft, AlignCenter, AlignRight, Grid3X3,
  Upload, Maximize2
} from "lucide-react";

const tools = [
  { icon: MousePointer2, label: "Selecionar", shortcut: "V" },
  { icon: Move, label: "Mover", shortcut: "M" },
  { icon: Square, label: "Retângulo", shortcut: "R" },
  { icon: Circle, label: "Elipse", shortcut: "O" },
  { icon: Type, label: "Texto", shortcut: "T" },
  { icon: Image, label: "Imagem", shortcut: "I" },
  { icon: Palette, label: "Cor", shortcut: "C" },
];

const layers = [
  { name: "Background", visible: true, locked: false },
  { name: "Mockup Device", visible: true, locked: false },
  { name: "Design Screen", visible: true, locked: false },
  { name: "Shadow Layer", visible: true, locked: true },
  { name: "Overlay Effect", visible: false, locked: false },
];

const Editor = () => {
  const [activeTool, setActiveTool] = useState(0);
  const [zoom, setZoom] = useState(100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <motion.aside
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-14 bg-surface-1 border-r border-border flex flex-col items-center py-3 gap-1"
        >
          {tools.map((tool, i) => (
            <button
              key={tool.label}
              onClick={() => setActiveTool(i)}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all group ${
                activeTool === i
                  ? "bg-gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              }`}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <tool.icon className="w-4 h-4" />
              <span className="absolute left-12 px-2 py-1 rounded-md bg-surface-3 text-foreground text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {tool.label} <span className="text-muted-foreground ml-1">{tool.shortcut}</span>
              </span>
            </button>
          ))}
        </motion.aside>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="h-10 bg-surface-1 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <Undo className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <Redo className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
              <div className="w-px h-5 bg-border mx-1" />
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 canvas-grid flex items-center justify-center overflow-auto bg-surface-2/50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-[800px] h-[600px] bg-card rounded-xl border border-border shadow-elevated flex items-center justify-center"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  Arraste seu design aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  ou clique para selecionar um arquivo
                </p>
                <button className="mt-4 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                  Importar Design
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Panel */}
        <motion.aside
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-64 bg-surface-1 border-l border-border flex flex-col"
        >
          {/* Properties */}
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Propriedades</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Largura</label>
                  <input
                    type="text"
                    defaultValue="800"
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Altura</label>
                  <input
                    type="text"
                    defaultValue="600"
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase">Formato de Saída</label>
                <select className="w-full mt-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary">
                  <option>PNG - Alta Qualidade</option>
                  <option>JPG - Comprimido</option>
                  <option>PDF - Arte Final</option>
                  <option>SVG - Vetor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Layers */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Camadas</h3>
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              {layers.map((layer) => (
                <div
                  key={layer.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 transition-colors cursor-pointer group"
                >
                  <div className={`w-2 h-2 rounded-full ${layer.visible ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-xs flex-1 truncate ${layer.visible ? "text-foreground" : "text-muted-foreground"}`}>
                    {layer.name}
                  </span>
                  {layer.locked && (
                    <span className="text-[10px] text-muted-foreground">🔒</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="p-4 border-t border-border">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </motion.aside>
      </div>
    </div>
  );
};

export default Editor;
