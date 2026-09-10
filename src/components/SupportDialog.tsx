import { Heart, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import paypalQr from "@/assets/paypal-qr.png";

/**
 * Métodos de doação.
 *
 * Cada método é apenas um QR code — nunca um número de telefone, IBAN ou email,
 * para não expor dados pessoais do autor nem depender de serviços externos de
 * geração de QR (a imagem é servida pelo próprio site e funciona offline).
 *
 * Para acrescentar o MB WAY:
 *   1. Na app MB WAY, gere o QR de recebimento (idealmente de valor aberto; se
 *      obrigar a fixar um montante, use um valor simbólico como 5 €).
 *   2. Guarde a imagem em `src/assets/mbway-qr.png`.
 *   3. Descomente o import e a entrada correspondente abaixo.
 */
// import mbwayQr from "@/assets/mbway-qr.png";

type DonationMethod = {
  id: string;
  name: string;
  /** Etiqueta do montante, quando o QR tem valor fixo. */
  amount?: string;
  hint: string;
  qr: string;
};

const METHODS: DonationMethod[] = [
  {
    id: "paypal",
    name: "PayPal",
    hint: "Leia o código com a câmara do telemóvel ou com a app PayPal.",
    qr: paypalQr,
  },
  // {
  //   id: "mbway",
  //   name: "MB WAY",
  //   amount: "5 €",
  //   hint: "Leia o código na app MB WAY.",
  //   qr: mbwayQr,
  // },
];

function MethodCard({ method }: { method: DonationMethod }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{method.name}</span>
        {method.amount && (
          <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
            {method.amount}
          </span>
        )}
      </div>
      <div className="flex justify-center rounded-lg bg-white p-3">
        <img
          src={method.qr}
          alt={`Código QR para doação via ${method.name}`}
          width={200}
          height={200}
          className="h-[200px] w-[200px] object-contain"
        />
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {method.hint}
      </p>
    </div>
  );
}

export function SupportDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Heart className="mr-2 h-4 w-4" aria-hidden="true" /> Apoiar o Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" aria-hidden="true" /> Apoiar o Projeto
          </DialogTitle>
          <DialogDescription>
            Esta ferramenta é gratuita, sem registo e sem publicidade. Se lhe foi útil, um
            contributo voluntário ajuda a mantê-la disponível e atualizada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {METHODS.map((m) => (
            <MethodCard key={m.id} method={m} />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Contribuir é inteiramente opcional — a checklist continua completa e sem limitações.
        </p>
      </DialogContent>
    </Dialog>
  );
}
