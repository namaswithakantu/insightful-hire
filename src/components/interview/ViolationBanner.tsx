import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  message: string | null;
  onDismiss: () => void;
}

export function ViolationBanner({ message, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (message) {
      setVisible(true);
      const t = setTimeout(() => { setVisible(false); onDismiss(); }, 4000);
      return () => clearTimeout(t);
    }
  }, [message, onDismiss]);

  if (!message || !visible) return null;
  return (
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-card px-4 py-3 shadow-violation pulse-violation">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm font-medium text-foreground">{message}</p>
        <button onClick={() => { setVisible(false); onDismiss(); }} className="ml-2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
