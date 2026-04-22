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

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !value.includes(s))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [suggestions, draft, value]);

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
      {focused && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover p-1 shadow-md">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}