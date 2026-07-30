import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  createRequestApplicationService,
  RequestAuthorityError,
  type RequestApplicationService,
} from '@/lib/request-service'

export async function getRequestApplicationService(): Promise<RequestApplicationService> {
  return createRequestApplicationService(await createClient())
}

export async function getRequestViewer() {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  return user
}

export function requestAuthorityErrorCode(error: unknown) {
  return error instanceof RequestAuthorityError ? error.code : 'unknown'
}
