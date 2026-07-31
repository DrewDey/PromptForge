import type { Metadata } from 'next'
import { RequestPolicyPage } from '@/components/requests/RequestPolicyPage'

export const metadata: Metadata = {
  title: 'Request a Build requester rights | PathForge',
  robots: { index: false, follow: false },
}
export default function RequesterRightsPage() {
  return (
    <RequestPolicyPage
      version="request-rights-v1"
      title="Requester use and delivery rights"
      intro="The requester receives practical use of an approved private delivery while the assigned builder remains its credited author."
    >
      <section>
        <h2>Requester permission</h2>
        <p>
          After reviewed delivery, the requester receives a non-exclusive right
          to access, download, use, and adapt the delivered result for lawful
          purposes, subject to any clearly identified third-party components and
          the case record.
        </p>
      </section>
      <section>
        <h2>Builder authorship</h2>
        <p>
          The assigned builder remains the attributed author of the delivery.
          Request a Build does not create exclusivity, assignment of ownership,
          employment, agency, or a work-for-hire relationship.
        </p>
      </section>
      <section>
        <h2>Separate public permission</h2>
        <p>
          Private-use rights do not authorize PathForge to publish the brief,
          delivery, requester identity, or a public outcome. Any public-safe
          summary requires separate, versioned requester and builder decisions.
        </p>
      </section>
      <section>
        <h2>Third-party rights</h2>
        <p>
          No participant may grant rights they do not have. A rights concern can
          be reported privately and may place the case or public projection on
          hold while it is reviewed.
        </p>
      </section>
    </RequestPolicyPage>
  )
}
