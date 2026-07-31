import type { Metadata } from 'next'
import { RequestPolicyPage } from '@/components/requests/RequestPolicyPage'

export const metadata: Metadata = {
  title: 'Request a Build publication terms | PathForge',
  robots: { index: false, follow: false },
}
export default function RequestPublicationTermsPage() {
  return (
    <RequestPolicyPage
      version="request-publication-v1"
      title="Optional safe-outcome publication terms"
      intro="A private case never publishes itself. Only a newly written, bounded outcome summary may pass through separate consent and the existing PathForge publication airlock."
    >
      <section>
        <h2>What may become public</h2>
        <p>
          A public outcome may contain only its safe title and summary, builder
          attribution, the requester attribution choice, reuse permission,
          publication date, and a link to an already-approved PathForge project.
          It does not contain the request ID, raw brief, clarification, review
          notes, storage identity, manifest digest, or participant contact data.
        </p>
      </section>
      <section>
        <h2>Independent decisions</h2>
        <p>
          The requester chooses whether to be credited. The builder separately
          chooses view-only or adapt-with-credit reuse. Replacing the proposed
          public title or summary resets both decisions. Silence is never
          consent.
        </p>
      </section>
      <section>
        <h2>Airlock and approved project</h2>
        <p>
          Consent does not guarantee publication. An authorized operator must
          submit the exact proposal to the community airlock, and the final
          service-only bridge must recheck the approved delivery, independent
          review, useful requester outcome, live policy gates, and exact approved
          project binding.
        </p>
      </section>
      <section>
        <h2>Withdrawal and removal</h2>
        <p>
          Either consenting participant may withdraw the public outcome without
          changing the private case. Moderation removal also hides it. The linked
          PathForge project remains governed by its own publication, reporting,
          and removal authority.
        </p>
      </section>
    </RequestPolicyPage>
  )
}
