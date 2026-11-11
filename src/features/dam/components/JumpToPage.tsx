import { useEffect, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface JumpToPageProps {
  currentPage: number;
  totalPages: number;
  onJump: (page: number) => void;
}

/**
 * Quick "go to page" input. Validated client-side with Zod (integer in
 * [1, totalPages]). Submit on Enter or click. Resets to current page when
 * the parent navigates by other means.
 */
export function JumpToPage({ currentPage, totalPages, onJump }: JumpToPageProps) {
  const [value, setValue] = useState<string>(String(currentPage));
  const [error, setError] = useState<string | null>(null);

  // Keep the input in sync when the user navigates via prev/next/keyboard.
  useEffect(() => {
    setValue(String(currentPage));
    setError(null);
  }, [currentPage]);

  const schema = z.coerce
    .number({ invalid_type_error: "Número inválido" })
    .int("Use um número inteiro")
    .min(1, "Página mínima é 1")
    .max(totalPages, `Página máxima é ${totalPages}`);

  const submit = () => {
    const parsed = schema.safeParse(value.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Valor inválido");
      return;
    }
    setError(null);
    if (parsed.data !== currentPage) onJump(parsed.data);
  };

  return (
    <form
      className="flex items-center justify-end gap-2 text-xs"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="dam-jump-to-page"
    >
      <Label htmlFor="dam-jump-to-page-input" className="text-muted-foreground">
        Ir para página
      </Label>
      <Input
        id="dam-jump-to-page-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        className="h-7 w-20 text-xs"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? "dam-jump-to-page-error" : undefined}
      />
      <span className="text-muted-foreground">de {totalPages}</span>
      <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs">
        Ir
      </Button>
      {error && (
        <span id="dam-jump-to-page-error" role="alert" className="text-destructive ml-1">
          {error}
        </span>
      )}
    </form>
  );
}
