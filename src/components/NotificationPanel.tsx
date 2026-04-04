import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, ClipboardList, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { STATUS_CONFIG, type OsStatus } from "@/features/service-orders";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

function getEventLabel(n: Notification): string {
  if (n.eventType === "os_created") {
    return `Nova OS criada`;
  }
  const oldLabel = n.oldStatus ? (STATUS_CONFIG[n.oldStatus as OsStatus]?.label ?? n.oldStatus) : "–";
  const newLabel = STATUS_CONFIG[n.newStatus as OsStatus]?.label ?? n.newStatus;
  return `${oldLabel} → ${newLabel}`;
}

function getStatusDot(status: string): string {
  const cfg = STATUS_CONFIG[status as OsStatus];
  return cfg?.color ?? "text-muted-foreground";
}

const NotificationItem = ({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    role="listitem"
    tabIndex={0}
    aria-label={`OS ${notification.osNumber}${notification.productName ? ` — ${notification.productName}` : ""}: ${getEventLabel(notification)}${notification.read ? "" : " (não lida)"}`}
    onKeyDown={(e) => {
      if ((e.key === "Enter" || e.key === " ") && !notification.read) {
        e.preventDefault();
        onMarkRead(notification.id);
      }
    }}
    className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      notification.read
        ? "opacity-60 hover:opacity-80"
        : "bg-primary/5 hover:bg-primary/10"
    )}
    onClick={() => !notification.read && onMarkRead(notification.id)}
  >
    <div className="mt-0.5 shrink-0" aria-hidden="true">
      <ClipboardList className={cn("w-4 h-4", getStatusDot(notification.newStatus))} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground truncate">
        OS {notification.osNumber}
        {notification.productName && (
          <span className="text-muted-foreground font-normal"> — {notification.productName}</span>
        )}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
        <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
        {getEventLabel(notification)}
      </p>
    </div>
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span className="text-[10px] text-muted-foreground">{formatTime(notification.createdAt)}</span>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
      )}
    </div>
  </motion.div>
);

const NotificationPanel = () => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
          className="relative p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="w-4.5 h-4.5 text-muted-foreground" aria-hidden="true" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 overflow-hidden"
        role="dialog"
        aria-label="Painel de notificações"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground" id="notif-heading">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Limpar todas as notificações"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5" role="list" aria-labelledby="notif-heading">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground" role="status">
              <Bell className="w-8 h-8 mb-2 opacity-30" aria-hidden="true" />
              <p className="text-xs">Nenhuma notificação</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-t border-border" aria-live="polite">
            <p className="text-[10px] text-muted-foreground text-center">
              {unreadCount} {unreadCount === 1 ? "não lida" : "não lidas"}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
