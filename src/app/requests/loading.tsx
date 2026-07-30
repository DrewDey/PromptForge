import { RequestServiceOverview } from '@/components/requests/service'

export default function RequestServiceLoading() {
  return (
    <RequestServiceOverview
      availability={{ status: 'loading' }}
      intakeEligibility="sign_in_required"
    />
  )
}
