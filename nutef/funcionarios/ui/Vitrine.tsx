/**
 * "Contrate um funcionário de IA" — a vitrine dos modelos (PRD §8). Server
 * component puro: cada card leva à tela de criação do motor já preenchida
 * (`/app/ai/agents/new?modelo=<id>`), onde o dono revisa e publica.
 */
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MODELOS_DE_FUNCIONARIO } from "../modelos";
import { PACOTES } from "@/lib/mcp/tools/pacotes";

const rotuloDoPacote = (id: string) => PACOTES.find((p) => p.id === id)?.rotulo ?? id;

export function Vitrine() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MODELOS_DE_FUNCIONARIO.map((m) => (
        <Card key={m.id} className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-3xl leading-none">{m.avatar}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">{m.nome}</h2>
              <p className="text-sm text-muted-foreground">{m.funcao}</p>
            </div>
          </div>
          <p className="text-sm">{m.objetivo}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {m.tarefas.map((t) => <li key={t}>• {t}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">
            Capacidades: {m.pacotes.map(rotuloDoPacote).join(" · ")}
          </p>
          <div className="mt-auto pt-2">
            <Link
              href={`/app/ai/agents/new?modelo=${m.id}`}
              className="inline-flex h-9 items-center rounded-sm bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Contratar {m.nome}
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
