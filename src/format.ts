export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const brazilian = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
  if (brazilian.length === 10 || brazilian.length === 11) {
    const area = brazilian.slice(0, 2);
    const subscriber = brazilian.slice(2);
    const split = subscriber.length === 9 ? 5 : 4;
    const national = `(${area}) ${subscriber.slice(0, split)}-${subscriber.slice(split)}`;
    return digits.startsWith("55") ? `+55 ${national}` : national;
  }
  return value;
}
