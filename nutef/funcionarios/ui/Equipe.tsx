/** Os funcionários de IA já contratados, com o que fizeram neste mês (PRD §8 "métricas"). */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCentsUSD } from "@/lib/money";
import type { FuncionarioDaEquipe } from "../equipe";

export function Equipe({ equipe }: { equipe: FuncionarioDaEquipe[] }) {
  if (equipe.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Sua equipe de IA</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {equipe.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/app/ai/agents/${f.id}`} className="font-medium underline-offset-2 hover:underline">{f.nome}</Link>
                {f.descricao ? <p className="truncate text-xs text-muted-foreground">{f.descricao}</p> : null}
              </div>
              <Badge variant={f.publicado && f.ativo ? "success" : f.publicado ? "neutral" : "warning"}>
                {f.publicado && f.ativo ? "Trabalhando" : f.publicado ? "Pausado" : "Ainda não publicado"}
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Conversas no mês</dt><dd className="font-medium tabular-nums">{f.conversas_mes}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Passou p/ pessoa</dt><dd className="font-medium tabular-nums">{f.passagens_mes}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Custo de IA</dt><dd className="font-medium tabular-nums">{formatCentsUSD(f.custo_mes_cents)}</dd></div>
            </dl>
            {f.falhas_mes > 0 ? <p className="mt-2 text-xs text-destructive">{f.falhas_mes} {f.falhas_mes === 1 ? "resposta falhou" : "respostas falharam"} neste mês — veja em IA › Execuções.</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
