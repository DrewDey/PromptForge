import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ActivationDashboardData, ActivationEnvironment } from './contract'

export const ACTIVATION_WINDOWS = [7, 30, 90] as const
export type ActivationWindow = typeof ACTIVATION_WINDOWS[number]

export function normalizeActivationWindow(value: string | undefined): ActivationWindow {
  const parsed = Number.parseInt(value ?? '', 10)
  return ACTIVATION_WINDOWS.includes(parsed as ActivationWindow)
    ? parsed as ActivationWindow
    : 30
}

export async function getActivationDashboard(
  days: ActivationWindow,
  environment: ActivationEnvironment = 'production',
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pathforge_activation_dashboard_for_admin', {
    p_days: days,
    p_environment: environment,
  })
  if (error) throw new Error(`Activation dashboard query failed: ${error.message}`)
  return data as ActivationDashboardData
}
