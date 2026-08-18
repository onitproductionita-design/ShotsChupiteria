import { formatCents } from "@/lib/money";

/** Righe di un ordine, riusate da checkout, scontrino e vista barman. */
export default function OrderLines({
  items,
  size = "md",
}: {
  items: { name: string; emoji: string | null; unitCents: number; quantity: number }[];
  size?: "md" | "lg";
}) {
  return (
    <ul className={`flex flex-col ${size === "lg" ? "gap-3" : "gap-2"}`}>
      {items.map((item, index) => (
        <li
          key={`${item.name}-${index}`}
          className={`flex items-baseline justify-between gap-3 ${
            size === "lg" ? "text-lg" : "text-sm"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`mr-2 font-mono font-bold ${
                size === "lg" ? "text-2xl text-lime" : "text-accent"
              }`}
            >
              {item.quantity}×
            </span>
            {item.emoji && <span className="mr-1">{item.emoji}</span>}
            <span className={size === "lg" ? "font-bold" : ""}>{item.name}</span>
          </span>
          <span className="shrink-0 font-mono text-muted">
            {formatCents(item.unitCents * item.quantity)}
          </span>
        </li>
      ))}
    </ul>
  );
}
