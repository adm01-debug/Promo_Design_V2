import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function getInput() {
  // The component renders an unlabeled input with a placeholder.
  return screen.getByPlaceholderText(/Adicionar tag/i);
}

describe("TagChipsInput validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects empty tags (whitespace-only) and surfaces an error", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onValidation = vi.fn();
    render(<Harness onValidationChange={onValidation} />);

    await user.click(getInput());
    await user.type(getInput(), "   {Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(/não pode ser vazia/i);
    expect(onValidation).toHaveBeenCalledWith("Tag não pode ser vazia");
    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("rejects duplicate tags (case-insensitive)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onValidation = vi.fn();
    render(<Harness initial={["alpha"]} onValidationChange={onValidation} />);

    await user.type(getInput(), "ALPHA{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(/já adicionada/i);
    expect(onValidation).toHaveBeenCalledWith("Tag já adicionada");
    expect(screen.getByTestId("value")).toHaveTextContent("alpha");
  });

  it("rejects invalid characters (e.g., '!', accents) but accepts normalized valid input", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);

    await user.type(getInput(), "bad!tag{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(/Use letras, números/i);
    expect(screen.getByTestId("value")).toHaveTextContent("");

    // Comma also commits — switch to a valid tag.
    await user.type(getInput(), "good-tag,");
    expect(screen.getByTestId("value")).toHaveTextContent("good-tag");
  });

  it("rejects tags longer than 30 characters (regex upper bound)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);

    const tooLong = "a".repeat(31);
    await user.type(getInput(), `${tooLong}{Enter}`);

    expect(screen.getByRole("alert")).toHaveTextContent(/1–30 caracteres/i);
    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("blocks adding once maxTags is reached", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={["one", "two", "three"]} maxTags={3} />);

    await user.type(getInput(), "four{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(/Máximo de 3 tags/i);
    expect(screen.getByTestId("value")).toHaveTextContent("one|two|three");
  });

  it("clears the validation error automatically after the timeout", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onValidation = vi.fn();
    render(<Harness onValidationChange={onValidation} />);

    await user.type(getInput(), "{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onValidation).toHaveBeenLastCalledWith(null);
  });
});
