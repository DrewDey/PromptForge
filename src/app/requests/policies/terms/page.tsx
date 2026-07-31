import type { Metadata } from 'next'
import { RequestPolicyPage } from '@/components/requests/RequestPolicyPage'

export const metadata: Metadata = {
  title: 'Request a Build service terms | PathForge',
  robots: { index: false, follow: false },
}
export default function RequestServiceTermsPage() {
  return (
    <RequestPolicyPage
      version="request-terms-v1"
      title="Request a Build service terms"
      intro="Request a Build is a private, capacity-controlled managed service for bounded outcomes—not a marketplace, public request board, or guaranteed delivery service."
    >
      <section>
        <h2>What a submission requests</h2>
        <p>
          A submission asks PathForge to triage one finite, testable outcome.
          PathForge may resolve it with an existing path, request clarification,
          accept it for staffed fulfillment, decline it, or close it for a
          documented reason.
        </p>
      </section>
      <section>
        <h2>No automatic acceptance or service-level promise</h2>
        <p>
          A durable intake receipt confirms only that the private brief was
          recorded. It does not promise assignment, a delivery date, acceptance,
          fitness for a particular purpose, uninterrupted availability, or a
          contractual service level.
        </p>
      </section>
      <section>
        <h2>Private participation</h2>
        <p>
          Cases are available only to the requester, assigned operators, and
          authorized administrators. PathForge may place a case on hold, remove
          it for safety or rights concerns, or stop work when continuing would
          conflict with these policies.
        </p>
      </section>
      <section>
        <h2>Withdrawal and repairs</h2>
        <p>
          A requester may withdraw an eligible case. A delivered result may
          return for repair only when an original acceptance check failed; a new
          feature or materially expanded scope requires a new request.
        </p>
      </section>
    </RequestPolicyPage>
  )
}
