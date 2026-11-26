import { PlugZap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationQueueTab } from "../components/IntegrationQueueTab";
import { OsWebhookQueueTab } from "../components/OsWebhookQueueTab";

/**
 * Painel das filas de integracao. As duas filas nasceram trancadas no banco
 * (RLS sem policy e sem grant para authenticated), o que deixava evento preso
 * invisivel: os_webhook_queue respondia por ERP e integration_queue responde
 * por Promo Champions, Fast Gravacoes e Promo Supply.
 */
const IntegrationsPage = () => {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <PlugZap className="h-6 w-6" aria-hidden="true" />
          Integracoes
        </h1>
        <p className="text-sm text-muted-foreground">
          Filas de eventos que saem do Promo Design. Atualizam automaticamente a cada 30 segundos.
        </p>
      </header>

      <Tabs defaultValue="erp" className="space-y-6">
        <TabsList>
          <TabsTrigger value="erp">ERP (ordens de servico)</TabsTrigger>
          <TabsTrigger value="sistemas">Champions, Supply e Fast Gravacoes</TabsTrigger>
        </TabsList>
        <TabsContent value="erp">
          <OsWebhookQueueTab />
        </TabsContent>
        <TabsContent value="sistemas">
          <IntegrationQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;
