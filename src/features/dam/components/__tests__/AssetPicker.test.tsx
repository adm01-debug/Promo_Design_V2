import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// --- Mocks (must precede the SUT import) ---

const mockAssets = [
  {
    id: "a-1",
    name: "Logo Acme",
    asset_type: "logo",
    client_id: "c-1",
    version: 1,
    file_size: 1024,
    mime_type: "image/png",
    file_path: "p/a1.png",
    thumbnail_path: null,
    tags: ["brand"],
    dominant_colors: [],
    is_archived: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    description: null,
    metadata: null,
    width: null,
    height: null,
    organization_id: "org-1",
    parent_asset_id: null,
    created_by: "u",
    ocr_status: "skipped",
    ocr_text: null,
  },
  {
    id: "a-2",
    name: "Logo Beta",
    asset_type: "logo",
    client_id: "c-2",
    version: 1,
    file_size: 2048,
    mime_type: "image/png",
    file_path: "p/a2.png",
    thumbnail_path: null,
    tags: [],
    dominant_colors: [],
    is_archived: false,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    description: null,
    metadata: null,
    width: null,
    height: null,
    organization_id: "org-1",
    parent_asset_id: null,
    created_by: "u",
    ocr_status: "skipped",
    ocr_text: null,
  },
];

vi.mock("../../hooks/use-assets", async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    MIN_SEARCH_LENGTH: 3,
    useAssets: () => ({
      assets: mockAssets,
      total: mockAssets.length,
      totalPages: 1,
      isLoading: false,
    }),
  };
});

vi.mock("@/hooks/use-organization", () => ({
  useOrganizations: () => ({ currentOrgId: "org-1" }),
}));

vi.mock("@/features/clients/hooks/use-clients", () => ({
  useClients: () => ({
    clients: [
      { id: "c-1", name: "Acme" },
      { id: "c-2", name: "Beta" },
    ],
  }),
}));

vi.mock("../AssetThumbnail", () => ({
  AssetThumbnail: ({ asset }: { asset: { name: string } }) => (
    <div data-testid="thumb">{asset.name}</div>
  ),
}));
vi.mock("../AssetCard", () => ({
  AssetCard: ({
    asset,
    onClick,
  }: {
    asset: { id: string; name: string };
    onClick?: () => void;
  }) => (
    <button data-testid={`card-${asset.id}`} onClick={onClick}>
      {asset.name}
    </button>
  ),
}));
vi.mock("../TagFilter", () => ({ TagFilter: () => <div /> }));
vi.mock("@/components/ResultsPagination", () => ({ ResultsPagination: () => <div /> }));

import { AssetPicker } from "../AssetPicker";
// Garante que o barrel re-exporta os mesmos símbolos consumidos por Mockup/SO.
import * as damBarrel from "@/features/dam";

afterEach(() => cleanup());

describe("AssetPicker — barrel + back-compat (Mockup Studio / Service Order)", () => {
  it("expõe AssetPicker e downloadAssetAsFile pelo barrel @/features/dam", () => {
    expect(damBarrel.AssetPicker).toBe(AssetPicker);
    expect(typeof damBarrel.downloadAssetAsFile).toBe("function");
  });

  it("modo single (default): clica em um card, dispara onSelect(asset) e fecha o modal", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<AssetPicker open onOpenChange={onOpenChange} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("card-a-1"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "a-1" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("aceita prop legada `clientId` (back-compat com Service Order/Mockup)", () => {
    const onSelect = vi.fn();
    render(<AssetPicker open onOpenChange={vi.fn()} clientId="c-1" onSelect={onSelect} />);
    // Renderiza sem erro com prop legada
    expect(screen.getByTestId("card-a-1")).toBeInTheDocument();
  });

  it("aceita a nova prop `defaultClientId`", () => {
    const onSelect = vi.fn();
    render(<AssetPicker open onOpenChange={vi.fn()} defaultClientId="c-2" onSelect={onSelect} />);
    expect(screen.getByTestId("card-a-2")).toBeInTheDocument();
  });

  it("`lockClient` esconde o seletor de cliente (caso brand kit)", () => {
    render(
      <AssetPicker open onOpenChange={vi.fn()} clientId="c-1" lockClient onSelect={vi.fn()} />,
    );
    // O placeholder "Cliente" não deve aparecer quando travado
    expect(screen.queryByText("Cliente")).not.toBeInTheDocument();
  });
});

describe("AssetPicker — modo multiSelect", () => {
  it("acumula seleção e Confirmar emite onSelect(assets[])", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<AssetPicker open onOpenChange={onOpenChange} multiSelect onSelect={onSelect} />);

    // Botão Confirmar inicialmente desabilitado
    const confirm = screen.getByRole("button", { name: /confirmar/i });
    expect(confirm).toBeDisabled();

    // Seleciona dois assets
    fireEvent.click(screen.getByTestId("card-a-1"));
    fireEvent.click(screen.getByTestId("card-a-2"));

    // Contador atualizado
    expect(screen.getByText(/2 selecionados/i)).toBeInTheDocument();

    // Modal NÃO fecha ao clicar nos cards em modo múltiplo
    expect(onOpenChange).not.toHaveBeenCalled();

    // Confirmar dispara onSelect com array e fecha
    fireEvent.click(confirm);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg).toHaveLength(2);
    expect(arg.map((a: { id: string }) => a.id).sort()).toEqual(["a-1", "a-2"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("desselecionar um item remove ele do array final", () => {
    const onSelect = vi.fn();
    render(<AssetPicker open onOpenChange={vi.fn()} multiSelect onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("card-a-1"));
    fireEvent.click(screen.getByTestId("card-a-2"));
    fireEvent.click(screen.getByTestId("card-a-1")); // desmarca

    expect(screen.getByText(/1 selecionado$/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onSelect.mock.calls[0][0]).toEqual([expect.objectContaining({ id: "a-2" })]);
  });
});
