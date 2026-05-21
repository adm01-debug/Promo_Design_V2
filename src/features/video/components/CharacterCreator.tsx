import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface CharacterCreatorProps {
  newName: string;
  setNewName: (s: string) => void;
  newStyle: string;
  setNewStyle: (s: string) => void;
  newTraits: string[];
  setNewTraits: (s: string[]) => void;
  newOutfits: string[];
  setNewOutfits: (s: string[]) => void;
  newPoses: string[];
  setNewPoses: (s: string[]) => void;
  consistency: number;
  setConsistency: (n: number) => void;
  onCancel: () => void;
  onCreate: () => void;
  styles: { id: string; label: string; emoji: string; desc: string }[];
  traitOptions: string[];
  outfitOptions: string[];
  poseOptions: string[];
}

const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
  setter(arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item]);
};

const CharacterCreator = ({
  newName,
  setNewName,
  newStyle,
  setNewStyle,
  newTraits,
  setNewTraits,
  newOutfits,
  setNewOutfits,
  newPoses,
  setNewPoses,
  consistency,
  setConsistency,
  onCancel,
  onCreate,
  styles,
  traitOptions,
  outfitOptions,
  poseOptions,
}: CharacterCreatorProps) => (
  <motion.div
    key="create"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="p-6 max-w-3xl mx-auto w-full space-y-6"
  >
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">Criar Novo Personagem</h2>
      <p className="text-xs text-muted-foreground">
        Defina a identidade visual do personagem que aparecerá com seus produtos
      </p>
    </div>
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
        Nome do Personagem
      </label>
      <input
        type="text"
        placeholder="Ex: Ana — Embaixadora Premium"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
    </div>
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
        Estilo Visual
      </label>
      <div className="grid grid-cols-3 gap-2">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => setNewStyle(style.id)}
            className={`rounded-xl border-2 p-3 text-left transition-all ${newStyle === style.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
          >
            <div className="text-2xl mb-1">{style.emoji}</div>
            <div className="text-xs font-semibold text-foreground">{style.label}</div>
            <div className="text-[10px] text-muted-foreground">{style.desc}</div>
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
        Traços de Personalidade
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {traitOptions.map((trait) => (
          <button
            key={trait}
            onClick={() => toggleItem(newTraits, trait, setNewTraits)}
            className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${newTraits.includes(trait) ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border hover:border-primary/30"}`}
          >
            {trait}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
        Figurinos
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {outfitOptions.map((outfit) => (
          <button
            key={outfit}
            onClick={() => toggleItem(newOutfits, outfit, setNewOutfits)}
            className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${newOutfits.includes(outfit) ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border hover:border-primary/30"}`}
          >
            {outfit}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
        Poses com Produto
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {poseOptions.map((pose) => (
          <button
            key={pose}
            onClick={() => toggleItem(newPoses, pose, setNewPoses)}
            className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${newPoses.includes(pose) ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border hover:border-primary/30"}`}
          >
            {pose}
          </button>
        ))}
      </div>
    </div>
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Consistência do Personagem
        </label>
        <span className="text-[10px] font-mono text-primary">{consistency}%</span>
      </div>
      <Slider
        value={[consistency]}
        onValueChange={([v]) => setConsistency(v)}
        min={50}
        max={100}
        step={5}
      />
      <p className="text-[9px] text-muted-foreground mt-1">
        Quanto maior, mais parecido o personagem será entre diferentes gerações
      </p>
    </div>
    <div className="flex gap-3 pt-2">
      <Button variant="outline" onClick={onCancel} className="flex-1">
        Cancelar
      </Button>
      <Button onClick={onCreate} className="flex-1 gap-2">
        <Sparkles className="w-4 h-4" /> Criar Personagem
      </Button>
    </div>
  </motion.div>
);

export default CharacterCreator;
