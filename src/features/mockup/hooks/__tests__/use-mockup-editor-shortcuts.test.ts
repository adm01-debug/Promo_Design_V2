import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMockupEditorShortcuts } from "../use-mockup-editor-shortcuts";
import type { Placement } from "../use-mockup-editor-state";

const basePlacement: Placement = {
  x: 100,
  y: 200,
  scale: 0.6,
  rotation: 0,
  flipH: false,
  flipV: false,
};

interface Handles {
  undo: ReturnType<typeof vi.fn>;
  redo: ReturnType<typeof vi.fn>;
  updatePlacement: ReturnType<typeof vi.fn>;
  centerLogo: ReturnType<typeof vi.fn>;
}

function setup(
  overrides: Partial<{ logoPreview: string | null; showLogo: boolean; placement: Placement }> = {},
) {
  const handles: Handles = {
    undo: vi.fn(),
    redo: vi.fn(),
    updatePlacement: vi.fn(),
    centerLogo: vi.fn(),
  };
  const utils = renderHook(() =>
    useMockupEditorShortcuts({
      undo: handles.undo,
      redo: handles.redo,
      logoPreview:
        "logoPreview" in overrides
          ? (overrides.logoPreview as string | null)
          : "data:image/png;base64,xxx",
      showLogo: overrides.showLogo ?? true,
      currentPlacement: overrides.placement ?? basePlacement,
      updatePlacement: handles.updatePlacement,
      centerLogo: handles.centerLogo,
    }),
  );
  return { handles, ...utils };
}

function dispatchKey(init: KeyboardEventInit & { target?: EventTarget }) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  const target = init.target ?? document.body;
  target.dispatchEvent(event);
  return event;
}

describe("useMockupEditorShortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("Ctrl+Z chama undo", () => {
    const { handles } = setup();
    dispatchKey({ key: "z", ctrlKey: true });
    expect(handles.undo).toHaveBeenCalledTimes(1);
    expect(handles.redo).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+Z chama redo", () => {
    const { handles } = setup();
    dispatchKey({ key: "z", ctrlKey: true, shiftKey: true });
    expect(handles.redo).toHaveBeenCalledTimes(1);
    expect(handles.undo).not.toHaveBeenCalled();
  });

  it("Ctrl+Y chama redo", () => {
    const { handles } = setup();
    dispatchKey({ key: "y", ctrlKey: true });
    expect(handles.redo).toHaveBeenCalledTimes(1);
  });

  it("Cmd (metaKey) funciona como Ctrl para undo", () => {
    const { handles } = setup();
    dispatchKey({ key: "z", metaKey: true });
    expect(handles.undo).toHaveBeenCalledTimes(1);
  });

  it("ArrowLeft/Right ajustam x com step=2", () => {
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft" });
    expect(handles.updatePlacement).toHaveBeenCalledWith({ x: 98 });
    dispatchKey({ key: "ArrowRight" });
    expect(handles.updatePlacement).toHaveBeenCalledWith({ x: 102 });
  });

  it("Shift+ArrowLeft/Right usa step=10", () => {
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", shiftKey: true });
    expect(handles.updatePlacement).toHaveBeenCalledWith({ x: 90 });
    dispatchKey({ key: "ArrowRight", shiftKey: true });
    expect(handles.updatePlacement).toHaveBeenCalledWith({ x: 110 });
  });

  it("regressão: ArrowUp/Down ajustam y (não x)", () => {
    const { handles } = setup();
    dispatchKey({ key: "ArrowUp" });
    expect(handles.updatePlacement).toHaveBeenLastCalledWith({ y: 198 });
    dispatchKey({ key: "ArrowDown" });
    expect(handles.updatePlacement).toHaveBeenLastCalledWith({ y: 202 });
    dispatchKey({ key: "ArrowDown", shiftKey: true });
    expect(handles.updatePlacement).toHaveBeenLastCalledWith({ y: 210 });
    // Confirma que nenhuma chamada mexeu em x
    for (const call of handles.updatePlacement.mock.calls) {
      expect(call[0]).not.toHaveProperty("x");
    }
  });

  it("Ctrl+C com logoPreview chama centerLogo", () => {
    const { handles } = setup();
    dispatchKey({ key: "c", ctrlKey: true });
    expect(handles.centerLogo).toHaveBeenCalledTimes(1);
  });

  it("ignora eventos quando target é <input>", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", target: input });
    dispatchKey({ key: "z", ctrlKey: true, target: input });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
    expect(handles.undo).not.toHaveBeenCalled();
  });

  it("ignora eventos quando target é <textarea>", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", target: ta });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("ignora eventos quando target é contenteditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
    document.body.appendChild(div);
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", target: div });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("ignora eventos dentro de [role=combobox]", () => {
    const wrap = document.createElement("div");
    wrap.setAttribute("role", "combobox");
    const inner = document.createElement("span");
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", target: inner });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("ignora eventos dentro de .cmdk-input", () => {
    const wrap = document.createElement("div");
    wrap.className = "cmdk-input";
    document.body.appendChild(wrap);
    const { handles } = setup();
    dispatchKey({ key: "ArrowLeft", target: wrap });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("não movimenta logo quando logoPreview é null", () => {
    const { handles } = setup({ logoPreview: null });
    dispatchKey({ key: "ArrowLeft" });
    dispatchKey({ key: "ArrowUp" });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("não movimenta logo quando showLogo é false", () => {
    const { handles } = setup({ showLogo: false });
    dispatchKey({ key: "ArrowLeft" });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
  });

  it("tecla 'z' sem modificador não chama undo", () => {
    const { handles } = setup();
    dispatchKey({ key: "z" });
    expect(handles.undo).not.toHaveBeenCalled();
  });

  it("preventDefault é chamado em shortcuts capturados", () => {
    setup();
    const ev = dispatchKey({ key: "ArrowLeft" });
    expect(ev.defaultPrevented).toBe(true);
  });

  it("cleanup: unmount remove o listener", () => {
    const { handles, unmount } = setup();
    unmount();
    dispatchKey({ key: "ArrowLeft" });
    dispatchKey({ key: "z", ctrlKey: true });
    expect(handles.updatePlacement).not.toHaveBeenCalled();
    expect(handles.undo).not.toHaveBeenCalled();
  });
});
