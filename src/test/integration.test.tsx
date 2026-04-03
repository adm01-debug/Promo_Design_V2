import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { SectionTitle, ArtUploadField } from "@/features/service-orders";
import EmptyState from "@/components/EmptyState";
import LoadingScreen from "@/components/LoadingScreen";
import { StatCardSkeleton, ProjectCardSkeleton, ChartSkeleton } from "@/components/DashboardSkeleton";
import { Package, FolderOpen } from "lucide-react";

// ============================================================
// SectionTitle integration tests
// ============================================================
describe("SectionTitle", () => {
  it("renders icon and title", () => {
    render(<SectionTitle icon={Package} title="Dados do Produto" />);
    expect(screen.getByText("Dados do Produto")).toBeInTheDocument();
  });

  it("renders with different icons without crashing", () => {
    const { rerender } = render(<SectionTitle icon={Package} title="A" />);
    expect(screen.getByText("A")).toBeInTheDocument();
    rerender(<SectionTitle icon={FolderOpen} title="B" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("applies correct styling classes", () => {
    const { container } = render(<SectionTitle icon={Package} title="Test" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.classList.contains("flex")).toBe(true);
    expect(wrapper?.classList.contains("items-center")).toBe(true);
  });
});

// ============================================================
// ArtUploadField integration tests
// ============================================================
describe("ArtUploadField", () => {
  const defaultProps = {
    artFile: "",
    artFileDataUrl: "",
    onUpload: vi.fn(),
    onRemove: vi.fn(),
    uploading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty upload zone", () => {
    render(<ArtUploadField {...defaultProps} />);
    expect(screen.getByText(/arraste a arte/i)).toBeInTheDocument();
  });

  it("shows uploading state", () => {
    render(<ArtUploadField {...defaultProps} uploading={true} />);
    expect(screen.getByText(/enviando arte/i)).toBeInTheDocument();
  });

  it("shows image preview when artFileDataUrl is set", () => {
    render(
      <ArtUploadField
        {...defaultProps}
        artFile="logo.png"
        artFileDataUrl="data:image/png;base64,abc"
      />
    );
    expect(screen.getByAltText("Arte")).toBeInTheDocument();
    expect(screen.getByText("logo.png")).toBeInTheDocument();
  });

  it("shows non-image file without preview", () => {
    render(
      <ArtUploadField
        {...defaultProps}
        artFile="design.ai"
        artFileDataUrl=""
      />
    );
    expect(screen.getByText("design.ai")).toBeInTheDocument();
    expect(screen.getByText(/formato não-imagem/i)).toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", async () => {
    const onRemove = vi.fn();
    render(
      <ArtUploadField
        {...defaultProps}
        artFile="logo.png"
        artFileDataUrl="data:image/png;base64,abc"
        onRemove={onRemove}
      />
    );
    const removeBtn = screen.getByText("Remover");
    await userEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("shows swap and remove buttons for image preview", () => {
    render(
      <ArtUploadField
        {...defaultProps}
        artFile="logo.png"
        artFileDataUrl="data:image/png;base64,abc"
      />
    );
    expect(screen.getByText("Trocar")).toBeInTheDocument();
    expect(screen.getByText("Remover")).toBeInTheDocument();
  });

  it("shows remove button for non-image files", () => {
    render(
      <ArtUploadField
        {...defaultProps}
        artFile="design.ai"
        artFileDataUrl=""
      />
    );
    expect(screen.getByText("Remover")).toBeInTheDocument();
  });
});

// ============================================================
// EmptyState integration tests
// ============================================================
describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <BrowserRouter>
        <EmptyState
          icon={FolderOpen}
          title="Nenhum projeto"
          description="Comece criando seu primeiro mockup."
          actionLabel="Criar mockup"
          actionPath="/mockup/new"
        />
      </BrowserRouter>
    );
    expect(screen.getByText("Nenhum projeto")).toBeInTheDocument();
    expect(screen.getByText("Comece criando seu primeiro mockup.")).toBeInTheDocument();
  });

  it("renders action button with correct link", () => {
    render(
      <BrowserRouter>
        <EmptyState
          icon={FolderOpen}
          title="Vazio"
          description="Nada aqui"
          actionLabel="Criar"
          actionPath="/create"
        />
      </BrowserRouter>
    );
    const link = screen.getByText("Criar").closest("a");
    expect(link).toHaveAttribute("href", "/create");
  });
});

// ============================================================
// LoadingScreen integration test
// ============================================================
describe("LoadingScreen", () => {
  it("renders loading text", () => {
    render(<LoadingScreen />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});

// ============================================================
// Dashboard Skeleton components
// ============================================================
describe("Dashboard Skeletons", () => {
  it("renders StatCardSkeleton", () => {
    const { container } = render(<StatCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders ProjectCardSkeleton", () => {
    const { container } = render(<ProjectCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders ChartSkeleton", () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders multiple StatCardSkeletons like the dashboard", () => {
    const { container } = render(
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
    const children = container.firstElementChild?.children;
    expect(children?.length).toBe(4);
  });
});

// ============================================================
// Form validation integration
// ============================================================
import { validateForm, ServiceOrderData, TECHNIQUES, generateOsNumber } from "@/components/service-order/types";

describe("Form validation — integration scenarios", () => {
  const makeForm = (overrides: Partial<ServiceOrderData> = {}): ServiceOrderData => ({
    osNumber: generateOsNumber(),
    date: new Date().toISOString().slice(0, 10),
    deliveryDate: "",
    clientName: "João Silva",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: "Caneca 350ml",
    productSku: "",
    productMaterial: "",
    productColors: "",
    technique: TECHNIQUES[0],
    areaName: "",
    areaWidth: "",
    areaHeight: "",
    areaShape: "",
    artColors: "",
    artDpi: "300",
    artFile: "",
    artFileDataUrl: "",
    quantity: "100",
    observations: "",
    mockupImageUrl: "",
    identificacaoCaixa: "",
    materialEvento: false,
    aprovarPrimeiraPeca: false,
    qtdCompra: "",
    qtdLiberada: "",
    fazParteKit: false,
    gravacaoDetalhe: "",
    ...overrides,
  });

  it("valid form with all 17 techniques passes", () => {
    TECHNIQUES.forEach((tech) => {
      const errors = validateForm(makeForm({ technique: tech }));
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  it("form with emoji in names passes", () => {
    const errors = validateForm(makeForm({
      clientName: "João 🎉",
      productName: "Caneca ★ Premium",
    }));
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("form with unicode characters passes", () => {
    const errors = validateForm(makeForm({
      clientName: "Müller & Associés",
      productName: "Ñandú — Édition Spéciale",
    }));
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("quantity edge: 0.5 should fail (not integer ≥ 1)", () => {
    const errors = validateForm(makeForm({ quantity: "0.5" }));
    // 0.5 < 1 so should fail
    expect(errors.quantity).toBeDefined();
  });

  it("quantity edge: 1 should pass", () => {
    const errors = validateForm(makeForm({ quantity: "1" }));
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("quantity edge: very large number passes", () => {
    const errors = validateForm(makeForm({ quantity: "9999999" }));
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("all required fields empty produces 4 errors", () => {
    const errors = validateForm(makeForm({
      clientName: "",
      productName: "",
      technique: "",
      quantity: "",
    }));
    expect(Object.keys(errors)).toHaveLength(4);
  });

  it("OS number generation is always valid format", () => {
    for (let i = 0; i < 50; i++) {
      const os = generateOsNumber();
      expect(os).toMatch(/^OS-\d{4}-\d{4}$/);
    }
  });
});

// ============================================================
// NotificationPanel helpers (extracted logic)
// ============================================================
describe("Notification time formatting", () => {
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  it("formats 'agora' for recent", () => {
    expect(formatTime(new Date().toISOString())).toBe("agora");
  });

  it("formats minutes correctly", () => {
    expect(formatTime(new Date(Date.now() - 3 * 60_000).toISOString())).toBe("3min");
  });

  it("formats hours correctly", () => {
    expect(formatTime(new Date(Date.now() - 5 * 3600_000).toISOString())).toBe("5h");
  });

  it("formats days correctly", () => {
    expect(formatTime(new Date(Date.now() - 2 * 86400_000).toISOString())).toBe("2d");
  });

  it("formats older dates as dd/mm", () => {
    const old = new Date(Date.now() - 14 * 86400_000).toISOString();
    expect(formatTime(old)).toMatch(/\d{2}\/\d{2}/);
  });
});

// ============================================================
// Status event label mapping
// ============================================================
describe("Status event label mapping", () => {
  const STATUS_LABELS: Record<string, string> = {
    aberta: "Aberta",
    em_producao: "Em Produção",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };

  function getEventLabel(eventType: string, oldStatus: string | null, newStatus: string): string {
    if (eventType === "os_created") return "Nova OS criada";
    const from = oldStatus ? STATUS_LABELS[oldStatus] || oldStatus : "";
    const to = STATUS_LABELS[newStatus] || newStatus;
    return from ? `${from} → ${to}` : to;
  }

  it("labels os_created correctly", () => {
    expect(getEventLabel("os_created", null, "aberta")).toBe("Nova OS criada");
  });

  it("labels status_change with transition", () => {
    expect(getEventLabel("status_change", "aberta", "em_producao")).toBe("Aberta → Em Produção");
  });

  it("handles unknown status gracefully", () => {
    expect(getEventLabel("status_change", "custom", "outro")).toBe("custom → outro");
  });

  it("handles null oldStatus", () => {
    expect(getEventLabel("status_change", null, "concluida")).toBe("Concluída");
  });
});
