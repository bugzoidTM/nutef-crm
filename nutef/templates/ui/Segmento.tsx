"use client";
/** "Seu segmento" — escolher/confirmar o modelo do negócio e aplicá-lo (PRD §9). */
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { aplicarTemplate, type ResultadoDoTemplate } from "../aplicar";
import type { SegmentoId } from "../segmentos";

export interface SegmentoProps {
  segmentos: Array<{ id: SegmentoId; nome: string }>;
  sugerido: SegmentoId;
  escolhido: SegmentoId | null;
  perguntas: Record<SegmentoId, readonly string[]>;
  podeAplicar: boolean;
}

export function Segmento({ segmentos, sugerido, escolhido, perguntas, podeAplicar }: SegmentoProps) {
  const [segmento, setSegmento] = useState<SegmentoId>(escolhido ?? sugerido);
  const [resultado, setResultado] = useState<ResultadoDoTemplate | null>(null);
  const [pendente, startTransition] = useTransition();
  const aplicado = resultado?.ok ? resultado.segmento : escolhido;

  function aplicar() {
    const fd = new FormData(); fd.set("segmento", segmento);
    startTransition(async () => {
      const r = await aplicarTemplate(fd);
      setResultado(r);
      if (r.ok) toast.success("Modelo aplicado"); else toast.error(r.erro ?? "Não deu certo");
    });
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Seu segmento</h2>
          <p className="text-sm text-muted-foreground">
            {aplicado ? "Modelo aplicado: " + (segmentos.find((s) => s.id === aplicado)?.nome ?? aplicado) + "." : "Pelo que você contou no cadastro, parece ser: " + (segmentos.find((s) => s.id === sugerido)?.nome ?? sugerido) + "."}{" "}
            O modelo ensina os funcionários a qualificar, cria os campos do funil e deixa pronto um fluxo de retomada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={segmento} onValueChange={(v) => setSegmento(v as SegmentoId)}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>{segmentos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={aplicar} disabled={!podeAplicar || pendente}>{pendente ? "Aplicando…" : aplicado === segmento ? "Aplicar de novo" : "Aplicar modelo"}</Button>
        </div>
      </div>
      {resultado?.ok ? (
        <p className="text-sm">
          {resultado.funil ? `Funil "${resultado.funil}": ${resultado.camposAcrescentados} campo(s) acrescentado(s). ` : "Ainda não há funil — conclua o passo \"Onde ele organiza\" do onboarding e aplique de novo. "}
          {resultado.fluxo === "criado" ? <>Fluxo de retomada criado em rascunho — <Link className="underline" href="/app/ai/followups">revise e publique</Link>.</> : resultado.fluxo === "ja_existia" ? "O fluxo de retomada já existia." : null}
        </p>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">O que os clientes deste segmento perguntam — responda no Acervo para os funcionários não dizerem "vou confirmar"</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {(perguntas[segmento] ?? []).map((q) => <li key={q}>{q}</li>)}
        </ul>
        <p className="mt-2"><Link className="underline" href="/app/ai/knowledge">Abrir o Acervo</Link></p>
      </details>
    </Card>
  );
}
