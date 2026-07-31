import 'server-only'

import {
  isAuthSessionMissingError,
  type User,
} from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createRequestPublicApplicationService,
  createRequestPublicServerService,
  type RequestPublicApplicationService,
  type RequestPublicServerService,
} from '@/lib/request-public-service'
import {
  createRequestApplicationService,
  RequestAuthorityError,
  type RequestApplicationService,
} from '@/lib/request-service'

export async function getRequestApplicationService(): Promise<RequestApplicationService> {
  return createRequestApplicationService(await createClient())
}

export async function getRequestPublicApplicationService(): Promise<RequestPublicApplicationService> {
  return createRequestPublicApplicationService(await createClient())
}

export function getRequestPublicServerService(): RequestPublicServerService {
  return createRequestPublicServerService(createAdminClient())
}

export type RequestViewerState =
  | { status: 'signed_in'; user: User }
  | { status: 'signed_out' }
  | { status: 'unavailable' }

export async function getRequestViewerState(): Promise<RequestViewerState> {
  const client = await createClient()
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error) {
    return isAuthSessionMissingError(error)
      ? { status: 'signed_out' }
      : { status: 'unavailable' }
  }
  return user ? { status: 'signed_in', user } : { status: 'signed_out' }
}

export function requestAuthorityErrorCode(error: unknown) {
  return error instanceof RequestAuthorityError ? error.code : 'unknown'
}
