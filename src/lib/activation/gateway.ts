import 'server-only'

import { createClient } from '@/lib/supabase/server'

export class ActivationGatewayError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`Activation gateway request failed (${status}).`)
    this.name = 'ActivationGatewayError'
  }
}

export async function callActivationGateway<T>(
  operation: 'record' | 'dashboard',
  payload: Record<string, unknown>,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const gatewaySecret = process.env.ACTIVATION_INGEST_SECRET
  if (!supabaseUrl || !gatewaySecret) {
    throw new ActivationGatewayError(503, 'gateway_not_configured')
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-pathforge-activation-secret': gatewaySecret,
  }
  if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`

  let response: Response
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/pathforge-activation`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operation, ...payload }),
      cache: 'no-store',
    })
  } catch {
    throw new ActivationGatewayError(503, 'gateway_unreachable')
  }

  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    throw new ActivationGatewayError(
      response.status,
      typeof body?.error === 'string' ? body.error : 'gateway_error',
    )
  }
  return body as T
}
