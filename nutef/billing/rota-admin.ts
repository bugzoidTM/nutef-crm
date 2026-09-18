/**
 * O cabeçalho comum das rotas admin de billing: platform admin + parse do body
 * com Zod. Devolve a resposta de erro pronta ou o contexto para seguir.
 *
 * A guarda de suporte (`requireSupportWrite`) fica de FORA de propósito: o gate
 * tests/unit/suporte-cobertura-de-efeitos varre cada handler mutante procurando
 * a chamada literal, e escondê-la num helper deixaria o gate cego. Cada rota
 * que escreve a chama na primeira linha, com o organization_id do path.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { fail } from "@/lib/api/wrappers";
import { requirePlatformAdmin, type PlatformAdminContext } from "@/lib/auth/requirePlatformAdmin";

export interface ContextoAdmin<B> {
  requestId: string;
  admin: PlatformAdminContext;
  body: B;
}

export async function abrirRotaAdmin<S extends z.ZodTypeAny>(
  req: NextRequest,
  opts: { body?: S },
): Promise<ContextoAdmin<z.infer<S>> | Response> {
  const requestId = randomUUID();
  let admin: PlatformAdminContext;
  try {
    admin = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  let body: z.infer<S> = undefined as z.infer<S>;
  if (opts.body) {
    try {
      body = opts.body.parse(await req.json());
    } catch {
      return fail("validation_failed", "Invalid request body", 400, { requestId });
    }
  }
  return { requestId, admin, body };
}

export const ehResposta = (x: unknown): x is Response => x instanceof Response;
