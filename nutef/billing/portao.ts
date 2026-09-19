/**
 * O portão do estágio 2 da régua (PRD §24): "bloqueio de novos envios
 * automáticos". Consultado pelo motor em `runBeforeSend` (gate `billing`),
 * que é o funil único por onde passa TODO envio automático — turno do agente,
 * follow-up, aviso de escalação, entrega de reunião, resposta aprovada.
 *
 * FAIL-OPEN por desenho, nas três direções:
 *   - função ausente (instalação sem o apêndice do fork) → envia;
 *   - organização sem assinatura → envia (a função SQL já devolve true);
 *   - erro de consulta → envia, com log. Bloquear envio por defeito de cobrança
 *     seria punir o cliente pelo nosso bug; o estágio 3 (org suspensa) é quem
 *     fecha de verdade, e esse o motor já respeita sozinho.
 */
export interface Consultavel {
  query<R extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/**
 * DUAS consultas, de propósito. Uma só — `case when to_regprocedure(...) is null
 * then true else fn(...) end` — abortava a transação do turno onde o fork não
 * está instalado: o Postgres resolve o nome da função ao PLANEJAR, mesmo no
 * ramo que não executa, e "function does not exist" dentro de `begin` deixa
 * a conexão em "current transaction is aborted" (medido: 11 invariantes do
 * upstream vermelhos). `to_regprocedure` sozinho nunca erra.
 */
export async function envioAutomaticoPermitidoPg(db: Consultavel, organizationId: string): Promise<boolean> {
  try {
    const { rows: existe } = await db.query<{ ha: boolean }>(
      `select to_regprocedure('public.fn_billing_envio_automatico_permitido(uuid)') is not null as ha`,
    );
    if (existe[0]?.ha !== true) return true;
    const { rows } = await db.query<{ permitido: boolean | null }>(
      `select public.fn_billing_envio_automatico_permitido($1::uuid) as permitido`,
      [organizationId],
    );
    return rows[0]?.permitido !== false;
  } catch {
    return true;
  }
}
