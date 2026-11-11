export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function getUserFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

export function buildWeeklyActivity(
  orders: { createdAt: string }[],
  drafts: { createdAt: string }[],
  magicUp: { createdAt: string }[],
) {
  const weeks: { label: string; os: number; mockups: number; ia: number }[] = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const inRange = (d: string) => {
      const date = new Date(d);
      return date >= weekStart && date < weekEnd;
    };
    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    weeks.push({
      label,
      os: orders.filter((o) => inRange(o.createdAt)).length,
      mockups: drafts.filter((d) => inRange(d.createdAt)).length,
      ia: magicUp.filter((m) => inRange(m.createdAt)).length,
    });
  }
  return weeks;
}

export function buildMonthlyHeatmap(
  orders: { createdAt: string }[],
  drafts: { createdAt: string }[],
  magicUp: { createdAt: string }[],
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const allDates = [
    ...orders.map((o) => o.createdAt),
    ...drafts.map((d) => d.createdAt),
    ...magicUp.map((m) => m.createdAt),
  ];
  const countByDay: Record<number, number> = {};
  for (const d of allDates) {
    const date = new Date(d);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      countByDay[day] = (countByDay[day] || 0) + 1;
    }
  }
  const days: { day: number; count: number; weekday: number; week: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
    const week = Math.floor((firstDayOfWeek + d - 1) / 7);
    days.push({ day: d, count: countByDay[d] || 0, weekday: dayOfWeek, week });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long" });
  return { days, maxCount, monthName, year, today: now.getDate(), firstDayOfWeek };
}
