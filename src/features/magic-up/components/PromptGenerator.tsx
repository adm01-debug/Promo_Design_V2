import { useState, useMemo } from "react";
import { Wand2, Target, MessageSquare, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const OBJECTIVES = [
  { id: "awareness", label: "Reconhecimento", emoji: "📢" },
  { id: "conversion", label: "Conversão", emoji: "🎯" },
  { id: "engagement", label: "Engajamento", emoji: "💬" },
  { id: "branding", label: "Branding", emoji: "✨" },
];

const TONES = [
  { id: "professional", label: "Profissional", emoji: "💼" },
  { id: "playful", label: "Descontraído", emoji: "🎉" },
  { id: "luxurious", label: "Luxuoso", emoji: "👑" },
  { id: "minimalist", label: "Minimalista", emoji: "◻️" },
  { id: "bold", label: "Impactante", emoji: "⚡" },
  { id: "warm", label: "Acolhedor", emoji: "☀️" },
];

const AUDIENCES = [
  { id: "corporate", label: "Corporativo", emoji: "🏢" },
  { id: "young", label: "Jovem", emoji: "🎓" },
  { id: "premium", label: "Premium", emoji: "💎" },
  { id: "general", label: "Público Geral", emoji: "👥" },
];

const SEASONS = [
  { id: "none", label: "Atemporal", emoji: "♾️" },
  { id: "christmas", label: "Natal", emoji: "🎄" },
  { id: "easter", label: "Páscoa", emoji: "🐣" },
  { id: "mothers", label: "Dia das Mães", emoji: "💐" },
  { id: "fathers", label: "Dia dos Pais", emoji: "👔" },
  { id: "valentines", label: "Namorados", emoji: "❤️" },
  { id: "blackfriday", label: "Black Friday", emoji: "🏷️" },
  { id: "summer", label: "Verão", emoji: "🌊" },
];

interface Props {
  onGenerate: (prompt: string) => void;
  productName?: string;
}

const PromptGenerator = ({ onGenerate, productName }: Props) => {
  const [objective, setObjective] = useState("awareness");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("corporate");
  const [season, setSeason] = useState("none");

  const generatedPrompt = useMemo(() => {
    const obj = OBJECTIVES.find((o) => o.id === objective)?.label || "";
    const tn = TONES.find((t) => t.id === tone)?.label || "";
    const aud = AUDIENCES.find((a) => a.id === audience)?.label || "";
    const ssn = SEASONS.find((s) => s.id === season);
    const product = productName || "produto personalizado";

    let prompt = `Crie uma imagem publicitária de "${product}" com objetivo de ${obj.toLowerCase()}, tom ${tn.toLowerCase()}, voltada para público ${aud.toLowerCase()}`;
    if (ssn && ssn.id !== "none") {
      prompt += `, temática de ${ssn.label}`;
    }
    prompt += ". Alta qualidade, fotorrealista, composição profissional, iluminação de estúdio.";
    return prompt;
  }, [objective, tone, audience, season, productName]);

  const axes = [
    { icon: Target, label: "Objetivo", options: OBJECTIVES, value: objective, onChange: setObjective },
    { icon: MessageSquare, label: "Tom", options: TONES, value: tone, onChange: setTone },
    { icon: Users, label: "Público", options: AUDIENCES, value: audience, onChange: setAudience },
    { icon: CalendarDays, label: "Temporada", options: SEASONS, value: season, onChange: setSeason },
  ];

  return (
    <div className="space-y-4">
      {axes.map((axis) => (
        <div key={axis.label}>
          <div className="flex items-center gap-1.5 mb-2">
            <axis.icon className="w-3.5 h-3.5 text-primary" />
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{axis.label}</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {axis.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => axis.onChange(opt.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                  axis.value === opt.id
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Preview */}
      <div className="mt-3">
        <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Prompt Gerado</h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed font-mono bg-surface-2 rounded-lg p-2.5 border border-border">
          {generatedPrompt}
        </p>
      </div>

      <Button
        size="sm"
        className="w-full gap-1.5 text-xs bg-gradient-primary text-primary-foreground"
        onClick={() => onGenerate(generatedPrompt)}
      >
        <Wand2 className="w-3.5 h-3.5" /> Usar este Prompt
      </Button>
    </div>
  );
};

export default PromptGenerator;
