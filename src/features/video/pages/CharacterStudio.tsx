import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Camera,
  Palette,
  Search,
  Heart,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CharacterCreator from "@/features/video/components/CharacterCreator";

interface CharacterProfile {
  id: string;
  name: string;
  avatar: string;
  style: string;
  traits: string[];
  outfits: string[];
  poses: string[];
  createdAt: string;
  favorite: boolean;
}

const STYLES = [
  { id: "professional", label: "Profissional", emoji: "👔", desc: "Terno, blazer, roupas formais" },
  { id: "casual", label: "Casual", emoji: "👕", desc: "Camiseta, jeans, confortável" },
  { id: "sporty", label: "Esportivo", emoji: "🏃", desc: "Roupas fitness, ativas" },
  { id: "elegant", label: "Elegante", emoji: "👗", desc: "Vestido, tailleur, sofisticado" },
  { id: "streetwear", label: "Streetwear", emoji: "🧢", desc: "Urbano, moderno, despojado" },
  { id: "corporate", label: "Corporativo", emoji: "💼", desc: "Uniforme empresarial, crachá" },
];
const TRAIT_OPTIONS = [
  "Sorridente",
  "Sério",
  "Confiante",
  "Amigável",
  "Jovem",
  "Maduro",
  "Diverso",
  "Atlético",
  "Intelectual",
  "Criativo",
  "Líder",
  "Aventureiro",
];
const POSE_OPTIONS = [
  "Segurando produto",
  "Usando produto",
  "Apontando para produto",
  "Sentado com produto",
  "Andando com produto",
  "Close-up com produto",
  "Grupo usando produto",
  "Selfie com produto",
];
const OUTFIT_OPTIONS = [
  "Camiseta branca",
  "Blazer escuro",
  "Jaqueta jeans",
  "Vestido preto",
  "Moletom cinza",
  "Camisa social",
  "Regata",
  "Uniforme de marca",
];

const DEMO_CHARACTERS: CharacterProfile[] = [
  {
    id: "char-1",
    name: "Ana — Embaixadora Premium",
    avatar: "👩‍💼",
    style: "professional",
    traits: ["Confiante", "Sorridente", "Líder"],
    outfits: ["Blazer escuro", "Camisa social"],
    poses: ["Segurando produto", "Apontando para produto"],
    createdAt: new Date().toISOString(),
    favorite: true,
  },
  {
    id: "char-2",
    name: "Lucas — Lifestyle Casual",
    avatar: "🧑",
    style: "casual",
    traits: ["Amigável", "Jovem", "Criativo"],
    outfits: ["Camiseta branca", "Jaqueta jeans"],
    poses: ["Usando produto", "Selfie com produto"],
    createdAt: new Date().toISOString(),
    favorite: false,
  },
  {
    id: "char-3",
    name: "Equipe Fit",
    avatar: "🏋️",
    style: "sporty",
    traits: ["Atlético", "Jovem", "Aventureiro"],
    outfits: ["Regata", "Moletom cinza"],
    poses: ["Usando produto", "Grupo usando produto"],
    createdAt: new Date().toISOString(),
    favorite: false,
  },
];

const CharacterStudio = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterProfile[]>(DEMO_CHARACTERS);
  const [selectedChar, setSelectedChar] = useState<CharacterProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newName, setNewName] = useState("");
  const [newStyle, setNewStyle] = useState("professional");
  const [newTraits, setNewTraits] = useState<string[]>([]);
  const [newPoses, setNewPoses] = useState<string[]>([]);
  const [newOutfits, setNewOutfits] = useState<string[]>([]);
  const [consistency, setConsistency] = useState(80);

  const handleUseInVideo = (char: CharacterProfile) => {
    // Store selected character in a way VideoNew can access (e.g., localStorage or state management)
    localStorage.setItem("selected_character_avatar", char.avatar);
    localStorage.setItem("selected_character_id", char.id);
    toast.info(`Personagem ${char.name} selecionado para o Video Studio`);
    navigate("/video/new");
  };

  const filteredChars = characters.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const toggleFavorite = (id: string) =>
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)));
  const deleteChar = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedChar?.id === id) setSelectedChar(null);
    toast.success("Personagem removido");
  };
  const generatePrompt = (char: CharacterProfile) => {
    const style = STYLES.find((s) => s.id === char.style);
    return `A ${char.traits.join(", ").toLowerCase()} person wearing ${char.outfits.join(" or ")}, in a ${style?.desc || "professional"} style, ${char.poses[0] || "holding a product"}, photorealistic, studio lighting, high quality product photography`;
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Dê um nome ao personagem");
      return;
    }
    const style = STYLES.find((s) => s.id === newStyle);
    const newChar: CharacterProfile = {
      id: `char-${Date.now()}`,
      name: newName,
      avatar: style?.emoji || "👤",
      style: newStyle,
      traits: newTraits,
      outfits: newOutfits,
      poses: newPoses,
      createdAt: new Date().toISOString(),
      favorite: false,
    };
    setCharacters((prev) => [newChar, ...prev]);
    setSelectedChar(newChar);
    setIsCreating(false);
    setNewName("");
    setNewTraits([]);
    setNewPoses([]);
    setNewOutfits([]);
    toast.success("Personagem criado com sucesso!");
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">Character Studio</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
            Soul ID
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {characters.length} personagens
          </span>
          <Button size="sm" className="text-xs gap-1.5 h-8" onClick={() => setIsCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> Novo Personagem
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Character List */}
        <div className="w-[320px] bg-card border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar personagens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredChars.map((char) => (
              <motion.div
                key={char.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedChar(char);
                  setIsCreating(false);
                }}
                role="button"
                tabIndex={0}
                className={`w-full rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${selectedChar?.id === char.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{char.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {char.name}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(char.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(char.id);
                          }
                        }}
                        className="inline-flex p-0.5 cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${char.favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                        />
                      </span>
                    </div>
                    <span className="text-[10px] text-primary font-mono">
                      {STYLES.find((s) => s.id === char.style)?.label}
                    </span>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {char.traits.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center: Detail / Creator */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            {isCreating ? (
              <CharacterCreator
                newName={newName}
                setNewName={setNewName}
                newStyle={newStyle}
                setNewStyle={setNewStyle}
                newTraits={newTraits}
                setNewTraits={setNewTraits}
                newOutfits={newOutfits}
                setNewOutfits={setNewOutfits}
                newPoses={newPoses}
                setNewPoses={setNewPoses}
                consistency={consistency}
                setConsistency={setConsistency}
                onCancel={() => setIsCreating(false)}
                onCreate={handleCreate}
                styles={STYLES}
                traitOptions={TRAIT_OPTIONS}
                outfitOptions={OUTFIT_OPTIONS}
                poseOptions={POSE_OPTIONS}
              />
            ) : selectedChar ? (
              <motion.div
                key={selectedChar.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 max-w-3xl mx-auto w-full space-y-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-border flex items-center justify-center text-5xl">
                      {selectedChar.avatar}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedChar.name}</h2>
                      <span className="text-xs text-primary font-mono">
                        {STYLES.find((s) => s.id === selectedChar.style)?.label}
                      </span>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {selectedChar.traits.map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(generatePrompt(selectedChar));
                        toast.success("Prompt do personagem copiado!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Prompt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive gap-1"
                      onClick={() => deleteChar(selectedChar.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                    Prompt Gerado Automaticamente
                  </label>
                  <p className="text-xs text-foreground leading-relaxed font-mono">
                    {generatePrompt(selectedChar)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                      Figurinos
                    </label>
                    <div className="space-y-1">
                      {selectedChar.outfits.map((o) => (
                        <div
                          key={o}
                          className="flex items-center gap-2 text-xs text-foreground bg-muted rounded-lg px-3 py-2"
                        >
                          <Palette className="w-3 h-3 text-primary" /> {o}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                      Poses com Produto
                    </label>
                    <div className="space-y-1">
                      {selectedChar.poses.map((p) => (
                        <div
                          key={p}
                          className="flex items-center gap-2 text-xs text-foreground bg-muted rounded-lg px-3 py-2"
                        >
                          <Camera className="w-3 h-3 text-primary" /> {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4">
                  <Button variant="outline" className="gap-2 text-xs">
                    <Camera className="w-4 h-4" /> Gerar Foto
                  </Button>
                  <Button
                    className="gap-2 text-xs bg-gradient-to-r from-primary to-secondary text-white border-none"
                    onClick={() => handleUseInVideo(selectedChar)}
                  >
                    <Video className="w-4 h-4" /> Usar no Vídeo
                  </Button>
                  <Button variant="outline" className="gap-2 text-xs">
                    <Sparkles className="w-4 h-4" /> Usar no Mockup
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8"
              >
                <User className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Character Studio</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Crie personagens consistentes que interagem com seus produtos em diferentes
                  cenários.
                </p>
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Primeiro Personagem
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CharacterStudio;
