import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { TagChipsInput } from "../TagChipsInput";

/**
 * Controlled wrapper so we can assert the externally-managed `value` updates.
 * Mirrors how the real consumers (e.g. AssetUploadDialog) wire the component.
 */
function Harness({
  initial = [],
  maxTags,
  onValidationChange,
}: {
  initial?: string[];
  maxTags?: number;
  onValidationChange?: (err: string | null) => void;
}) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <div>
      <TagChipsInput
        value={tags}
        onChange={setTags}
        maxTags={maxTags}
        onValidationChange={onValidationChange}
      />
      <output data-testid="value">{tags.join("|")}</output>
    </div>
  );
}

function getInput(): HTMLInputElement {
  // Placeholder is hidden once any tag exists, so query by role with a fallback.
  const inputs = screen.getAllByRole("textbox");
  const candidate = inputs.find((el) => el.tagName === "INPUT");
  if (!candidate) throw new Error("input not found");
  return candidate as HTMLInputElement;
}

function commit(input: HTMLInputElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("TagChipsInput validation", () => {
  it("rejects empty tags (whitespace-only) and surfaces an error", () => {
    const onValidation = vi.fn();
    render(<Harness onValidationChange={onValidation} />);

    commit(getInput(), "   ");

    expect(screen.getByRole("alert")).toHaveTextContent(/não pode ser vazia/i);
    expect(onValidation).toHaveBeenCalledWith("Tag não pode ser vazia");
    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("rejects duplicate tags (case-insensitive)", () => {
    const onValidation = vi.fn();
    render(<Harness initial={["alpha"]} onValidationChange={onValidation} />);

    commit(getInput(), "ALPHA");

    expect(screen.getByRole("alert")).toHaveTextContent(/já adicionada/i);
    expect(onValidation).toHaveBeenCalledWith("Tag já adicionada");
    expect(screen.getByTestId("value")).toHaveTextContent("alpha");
  });

  it("rejects invalid characters but accepts normalized valid input", () => {
    render(<Harness />);

    commit(getInput(), "bad!tag");
    expect(screen.getByRole("alert")).toHaveTextContent(/Use letras, números/i);
    expect(screen.getByTestId("value")).toHaveTextContent("");

    // Comma key also commits.
    fireEvent.change(getInput(), { target: { value: "good-tag" } });
    fireEvent.keyDown(getInput(), { key: "," });
    expect(screen.getByTestId("value")).toHaveTextContent("good-tag");
  });

  it("rejects tags longer than 30 characters (regex upper bound)", () => {
    render(<Harness />);

    commit(getInput(), "a".repeat(31));

    expect(screen.getByRole("alert")).toHaveTextContent(/1–30 caracteres/i);
    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("blocks adding once maxTags is reached", () => {
    render(<Harness initial={["one", "two", "three"]} maxTags={3} />);

    commit(getInput(), "four");

    expect(screen.getByRole("alert")).toHaveTextContent(/Máximo de 3 tags/i);
    expect(screen.getByTestId("value")).toHaveTextContent("one|two|three");
  });

  it("clears the validation error automatically after the timeout", () => {
    vi.useFakeTimers();
    try {
      const onValidation = vi.fn();
      render(<Harness onValidationChange={onValidation} />);

      commit(getInput(), "");
      expect(screen.getByRole("alert")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2600);
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onValidation).toHaveBeenLastCalledWith(null);
    } finally {
      vi.useRealTimers();
    }
  });
});
