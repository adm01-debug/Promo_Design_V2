import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  onValidationChange?: (err: string | null) => void;
}

const TAG_REGEX = /^[a-z0-9\-_ ]{1,30}$/;
const normalize = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, " ");

export function TagChipsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Adicionar tag (Enter ou ,)",
  maxTags = 20,
  onValidationChange,
}: Props) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setErr = (msg: string | null) => {
    setError(msg);
    onValidationChange?.(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    if (msg) {
      errorTimerRef.current = setTimeout(() => {
        setError(null);
        onValidationChange?.(null);
      }, 2500);
    }
  };

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  const addTag = (raw: string) => {
    const tag = normalize(raw);
    if (!tag) {
      setErr("Tag não pode ser vazia");
      return;
    }
    if (!TAG_REGEX.test(tag)) {
      setErr("Use letras, números, - ou _ (1–30 caracteres)");
      return;
    }
    if (value.includes(tag)) {
      setErr("Tag já adicionada");
      return;
    }
    if (value.length >= maxTags) {
      setErr(`Máximo de ${maxTags} tags`);
      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setErr(null);
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const usedSet = useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);

  const matchedSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions.filter((s) => (q ? s.toLowerCase().includes(q) : true));
  }, [suggestions, draft]);

  // Show used tags first (highlighted) so the user can confirm choices, then unused.
  const visibleSuggestions = useMemo(() => {
    const decorated = matchedSuggestions.map((s) => ({ tag: s, used: usedSet.has(s.toLowerCase()) }));
    decorated.sort((a, b) => (a.used === b.used ? 0 : a.used ? -1 : 1));
    return decorated.slice(0, 8);
  }, [matchedSuggestions, usedSet]);

  const totalMatches = matchedSuggestions.length;
  const usedMatches = matchedSuggestions.filter((s) => usedSet.has(s.toLowerCase())).length;

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap gap-1.5 p-2 rounded-md border bg-background min-h-10 cursor-text ${
          error ? "border-destructive" : "border-input"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-destructive"
              aria-label={`Remover ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setErr(null);
          }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p className="text-destructive text-xs mt-1" role="alert">{error}</p>
      )}
      {focused && visibleSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover p-1 shadow-md">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Sugestões</span>
            <span className="tabular-nums font-mono">
              {usedMatches > 0 ? `${usedMatches} adicionada${usedMatches > 1 ? "s" : ""} · ` : ""}
              {totalMatches} disponíve{totalMatches === 1 ? "l" : "is"}
            </span>
          </div>
          {visibleSuggestions.map(({ tag, used }) => (
            <button
              key={tag}
              type="button"
              disabled={used}
              onMouseDown={(e) => {
                e.preventDefault();
                if (used) return;
                addTag(tag);
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 text-left px-2 py-1.5 text-sm rounded transition-colors",
                used ? "bg-primary/10 text-primary cursor-default" : "hover:bg-accent",
              )}
              aria-disabled={used}
              title={used ? "Tag já adicionada" : `Adicionar tag ${tag}`}
            >
              <span className="truncate">{tag}</span>
              {used && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}