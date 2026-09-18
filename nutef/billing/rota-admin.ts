/**
 * O cabeçalho comum das rotas admin de billing: platform admin + guarda de
 * suporte (escrita) + parse do body com Zod. Devolve a resposta de erro pronta
 * ou o contexto para seguir. Mantém cada route.ts com uma tela só de lógica.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { fail } from "@/lib/api/wrappers";
import { requirePlatformAdmin, type PlatformAdminContext } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";

export interface ContextoAdmin<B> {
  requestId: string;
  admin: PlatformAdminContext;
  body: B;
}

export async function abrirRotaAdmin<S extends z.ZodTypeAny>(
  req: NextRequest,
  opts: { escrita?: string | true; body?: S },
): Promise<ContextoAdmin<z.infer<S>> | Response> {
  const requestId = randomUUID();
  if (opts.escrita !== undefined) {
    const negado = await requireSupportWrite(opts.escrita === true ? undefined : opts.escrita);
    if (negado) return negado;
  }
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
