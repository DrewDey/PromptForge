import 'server-only'

import { callActivationGateway } from './gateway'
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
  const response = await callActivationGateway<{ data: ActivationDashboardData }>('dashboard', {
    days,
    environment,
  })
  return response.data
}
