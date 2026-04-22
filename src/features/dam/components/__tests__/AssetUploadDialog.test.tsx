import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// --- Mocks must be declared before importing the component under test ---

vi.mock("../../hooks/use-asset-upload", () => ({
  useAssetUpload: () => ({ uploadFile: vi.fn(), isUploading: false, progress: 0 }),
  UPLOAD_PHASE_LABELS: {
    "analyzing": "Analisando arquivo…",
    "rendering-pdf": "Renderizando PDF…",
    "rasterizing-svg": "Rastreando SVG…",
    "processing-image": "Processando imagem…",
    "uploading-file": "Enviando arquivo…",
    "uploading-thumb": "Enviando thumbnail…",
    "saving-record": "Salvando metadados…",
    "done": "Concluído",
  },
}));

vi.mock("../../hooks/use-assets", () => ({
  useAssets: () => ({ assets: [], create: { mutateAsync: vi.fn() } }),
}));

vi.mock("@/features/clients/hooks/use-clients", () => ({
  useClients: () => ({ clients: [] }),
}));

const buildSvgPreviewUrl = vi.fn(async () => "blob:svg-preview");
const rasterizePdfFirstPage = vi.fn(async () => ({
  blob: new Blob(["x"], { type: "image/jpeg" }),
  url: "blob:pdf-preview",
  width: 100,
  height: 100,
  canvas: null,
}));
const getPdfPageCount = vi.fn(async () => 5);

vi.mock("../../lib/file-preview", async (orig) => {
  const actual = (await orig()) as typeof import("../../lib/file-preview");
  return {
    ...actual,
    detectFileKind: actual.detectFileKind,
    buildSvgPreviewUrl: (...a: Parameters<typeof actual.buildSvgPreviewUrl>) =>
      buildSvgPreviewUrl(...a),
    rasterizePdfFirstPage: (...a: Parameters<typeof actual.rasterizePdfFirstPage>) =>
      rasterizePdfFirstPage(...a),
    getPdfPageCount: (...a: Parameters<typeof actual.getPdfPageCount>) =>
      getPdfPageCount(...a),
  };
});

import { AssetUploadDialog } from "../AssetUploadDialog";

const ORG_ID = "00000000-0000-0000-0000-000000000000";

function dropFile(file: File) {
  const dropzone = screen.getByText(/Arraste arquivos/i).closest("div")!;
  const dataTransfer = {
    files: [file],
    items: [],
    types: ["Files"],
  } as unknown as DataTransfer;
  // simulate full drag/drop sequence
  const dragEnter = new Event("dragenter", { bubbles: true });
  const dragOver = new Event("dragover", { bubbles: true });
  const drop = new Event("drop", { bubbles: true });
  Object.defineProperty(dragEnter, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(dragOver, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
  dropzone.dispatchEvent(dragEnter);
  dropzone.dispatchEvent(dragOver);
  dropzone.dispatchEvent(drop);
}

describe("AssetUploadDialog · preview generation & blob cleanup", () => {
  const createObjectURL = vi.fn(() => "blob:raster");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    buildSvgPreviewUrl.mockClear();
    rasterizePdfFirstPage.mockClear();
    getPdfPageCount.mockClear();
    // jsdom doesn't define these
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a PDF preview before upload and exposes page picker", async () => {
    render(
      <AssetUploadDialog
        open
        onOpenChange={() => {}}
        organizationId={ORG_ID}
      />,
    );

    const pdf = new File(["%PDF-1.4"], "doc.pdf", { type: "application/pdf" });
    dropFile(pdf);

    await waitFor(() => {
      expect(rasterizePdfFirstPage).toHaveBeenCalled();
      expect(getPdfPageCount).toHaveBeenCalled();
    });

    // Preview <img> appears once the rasterizer resolves
    await waitFor(() => {
      const img = document.querySelector('img[src="blob:pdf-preview"]');
      expect(img).toBeTruthy();
    });

    // Page picker reflects detected count
    await waitFor(() => {
      expect(screen.getByText(/de 5/)).toBeInTheDocument();
    });
  });

  it("renders an SVG preview before upload", async () => {
    render(
      <AssetUploadDialog
        open
        onOpenChange={() => {}}
        organizationId={ORG_ID}
      />,
    );

    const svg = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    dropFile(svg);

    await waitFor(() => {
      expect(buildSvgPreviewUrl).toHaveBeenCalled();
    });
    await waitFor(() => {
      const img = document.querySelector('img[src="blob:svg-preview"]');
      expect(img).toBeTruthy();
    });
  });

  it("revokes blob URLs on cleanup (unmount)", async () => {
    const { unmount } = render(
      <AssetUploadDialog
        open
        onOpenChange={() => {}}
        organizationId={ORG_ID}
      />,
    );

    // raster image takes the createObjectURL path synchronously in addFiles
    const img = new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" });
    dropFile(img);

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });

    unmount();

    // Cleanup effect must release the blob URL we created
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:raster");
  });
});