import { useState } from "react";
import { Heart, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MBWAY = "+351 900 000 000";
const IBAN = "PT50 0000 0000 0000 0000 0000 0";
const PAYPAL = "https://www.paypal.com/paypalme/seuuser";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-background px-2 py-1.5 text-sm">{value}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

export function SupportDialog() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `MBWAY:${MBWAY}`,
  )}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-pink-500/40 text-pink-600 hover:bg-pink-500/10 hover:text-pink-700">
          <Heart className="mr-2 h-4 w-4 fill-current" /> Apoiar o Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-pink-500 text-pink-500" /> Apoiar o Projeto
          </DialogTitle>
          <DialogDescription>
            Esta plataforma é disponibilizada gratuitamente. Se considera este projeto útil, pode
            contribuir para o seu desenvolvimento e manutenção através de uma doação voluntária.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CopyField label="MB WAY" value={MBWAY} />
          <div className="flex justify-center rounded-lg border bg-white p-3">
            <img src={qrUrl} alt="QR Code MB WAY" width={180} height={180} />
          </div>
          <CopyField label="IBAN" value={IBAN} />
          <a
            href={PAYPAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted/60"
          >
            <div>
              <div className="text-xs font-medium text-muted-foreground">PayPal</div>
              <div className="text-sm">{PAYPAL.replace(/^https?:\/\//, "")}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground">Obrigado pelo seu apoio! 💙</p>
      </DialogContent>
    </Dialog>
  );
}
