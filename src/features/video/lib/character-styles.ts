/**
 * Estilos de personagem do Character Studio.
 * Vivem na camada pura (lib) porque tanto a UI quanto o handoff para o
 * Video Studio precisam da mesma descrição de estilo.
 */
export interface CharacterStyle {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const CHARACTER_STYLES: CharacterStyle[] = [
  { id: "professional", label: "Profissional", emoji: "👔", desc: "Terno, blazer, roupas formais" },
  { id: "casual", label: "Casual", emoji: "👕", desc: "Camiseta, jeans, confortável" },
  { id: "sporty", label: "Esportivo", emoji: "🏃", desc: "Roupas fitness, ativas" },
  { id: "elegant", label: "Elegante", emoji: "👗", desc: "Vestido, tailleur, sofisticado" },
  { id: "streetwear", label: "Streetwear", emoji: "🧢", desc: "Urbano, moderno, despojado" },
  { id: "corporate", label: "Corporativo", emoji: "💼", desc: "Uniforme empresarial, crachá" },
];

export function findCharacterStyle(id: string | null | undefined): CharacterStyle | null {
  if (!id) return null;
  return CHARACTER_STYLES.find((style) => style.id === id) ?? null;
}
