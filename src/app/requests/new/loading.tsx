import { RequestIntakeForm } from '@/components/requests/intake'

export default function RequestIntakeLoading() {
  return (
    <RequestIntakeForm
      idempotencyKey="request-intake-loading-placeholder"
      pending
    />
  )
}
