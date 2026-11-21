import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GitCompareArrows, Loader2, Package, LayoutTemplate } from "lucide-react";
import { useMockupDrafts, type MockupDraft } from "@/features/mockup";
import { format } from "date-fns";

/** Comparador A/B de versões de mockup — revisão entre iterações. */
const MockupCompare = () => {
  const { drafts, isLoading } = useMockupDrafts();
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const left = drafts.find((d) => d.id === leftId) ?? null;
  const right = drafts.find((d) => d.id === rightId) ?? null;

  const selectedIds = useMemo(() => new Set([leftId, rightId]), [leftId, rightId]);

  const diffRows = useMemo(() => {
    if (!left || !right) return [];
    const fields: { label: string; key: string; fmt?: (v: unknown) => string }[] = [
      { label: "Produto", key: "productName", fmt: (v) => String(v ?? "—") },
      { label: "SKU", key: "productSku", fmt: (v) => String(v ?? "—") },
      { label: "Superfície", key: "surfaceType", fmt: (v) => String(v ?? "—") },
      { label: "Modo de mistura", key: "blendMode", fmt: (v) => String(v ?? "—") },
      { label: "Opacidade do logo", key: "logoOpacity", fmt: (v) => `${v ?? "—"}%` },
      { label: "Sombra", key: "shadowEnabled", fmt: (v) => (v ? "Ligada" : "Desligada") },
      { label: "Intensidade da sombra", key: "shadowIntensity", fmt: (v) => String(v ?? "—") },
      { label: "Mostrar logo", key: "showLogo", fmt: (v) => (v ? "Sim" : "Não") },
    ];
    const leftS = (left.editorState ?? {}) as Record<string, unknown>;
    const rightS = (right.editorState ?? {}) as Record<string, unknown>;
    const lP = leftS.placement as Record<string, unknown> | undefined;
    const rP = rightS.placement as Record<string, unknown> | undefined;
    return [
      ...fields.map(({ label, key, fmt }) => ({
        label,
        left: fmt?.(leftS[key] ?? left[key as keyof MockupDraft]) ?? String(leftS[key] ?? "—"),
        right: fmt?.(rightS[key] ?? right[key as keyof MockupDraft]) ?? String(rightS[key] ?? "—"),
        changed:
          String(leftS[key] ?? left[key as keyof MockupDraft]) !==
          String(rightS[key] ?? right[key as keyof MockupDraft]),
      })),
      {
        label: "Rotação",
        left: String(lP?.rotation ?? "—"),
        right: String(rP?.rotation ?? "—"),
        changed: (lP?.rotation ?? "") !== (rP?.rotation ?? ""),
      },
      {
        label: "Escala",
        left: String(lP?.scale ?? "—"),
        right: String(rP?.scale ?? "—"),
        changed: (lP?.scale ?? "") !== (rP?.scale ?? ""),
      },
    ];
  }, [left, right]);

  const renderCanvas = (draft: MockupDraft) => {
    const s = (draft.editorState ?? {}) as Record<string, unknown>;
    const p = (s.placement ?? {}) as Record<string, unknown>;
    return (
      <div
        className="relative overflow-hidden rounded-lg bg-muted/30"
        style={{
          width: 500,
          height: 500,
          margin: "0 auto",
        }}
      >
        {draft.thumbnailUrl ? (
          <img
            src={draft.thumbnailUrl}
            alt={draft.name}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}
        {s.logoPreview ? (
          <img
            src={s.logoPreview as string}
            alt="Logo aplicado"
            className="absolute"
            style={{
              left: Number(p.x ?? 50),
              top: Number(p.y ?? 50),
              width: `${Number(p.scale ?? 0.6) * 100}%`,
              transform: `rotate(${Number(p.rotation ?? 0)}deg)`,
            }}
          />
        ) : null}
      </div>
    );
  };

  const selector = (value: string, onChange: (v: string) => void, exclude: Set<string>) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-surface-2 border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary transition-all"
    >
      <option value="">Selecionar versão...</option>
      {drafts
        .filter((d) => !exclude.has(d.id) || d.id === value)
        .map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — {format(new Date(d.updatedAt), "dd/MM HH:mm")}
          </option>
        ))}
    </select>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Carregando versões...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <GitCompareArrows className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-display font-bold text-foreground">Comparador de Mockups</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-3 mb-6">
        Compare duas versões lado a lado para revisão A/B.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Versão A</label>
          {selector(leftId, setLeftId, selectedIds)}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Versão B</label>
          {selector(rightId, setRightId, selectedIds)}
        </div>
      </div>

      {drafts.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <LayoutTemplate className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">
            Nenhum mockup salvo ainda
          </p>
          <p className="text-xs text-muted-foreground">
            Salve versões no Studio para poder compará-las aqui
          </p>
        </div>
      )}

      {!left && !right ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl"
        >
          <GitCompareArrows className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Selecione duas versões acima para comparar
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {[left, right].map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {i === 0 ? "Versão A" : "Versão B"} — {d?.name ?? "Sem seleção"}
                </h3>
                {d?.isTemplate && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <LayoutTemplate className="w-3 h-3" /> Template
                  </span>
                )}
              </div>
              {d ? renderCanvas(d) : null}
            </div>
          ))}
        </div>
      )}

      {left && right && diffRows.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Diferenças de configuração</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-4 font-medium">Configuração</th>
                  <th className="py-2 pr-4 font-medium">Versão A</th>
                  <th className="py-2 pr-4 font-medium">Versão B</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((r) => (
                  <tr
                    key={r.label}
                    className={`border-t border-border ${r.changed ? "bg-primary/5" : ""}`}
                  >
                    <td className="py-2 pr-4 font-medium text-foreground">{r.label}</td>
                    <td
                      className={`py-2 pr-4 ${r.changed ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {r.left}
                    </td>
                    <td
                      className={`py-2 pr-4 ${r.changed ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {r.right}
                    </td>
                    <td className="py-2">
                      {r.changed ? (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          Diferente
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md">
                          Igual
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockupCompare;
