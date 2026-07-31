import type { Metadata } from 'next'
import { RequestPolicyPage } from '@/components/requests/RequestPolicyPage'

export const metadata: Metadata = {
  title: 'Request a Build privacy notice | PathForge',
  robots: { index: false, follow: false },
}

export default function RequestPrivacyPage() {
  return (
    <RequestPolicyPage
      version="request-privacy-v1"
      title="Request a Build privacy and retention notice"
      intro="The service keeps raw demand and delivery evidence private, exposes only participant-scoped records, and separates any later public summary from the private case."
    >
      <section>
        <h2>Data used to operate a case</h2>
        <ul>
          <li>Account identity, participant role, and historical attribution.</li>
          <li>The structured brief, clarification answers, and acceptance checks.</li>
          <li>Assignments, lifecycle events, moderation actions, and reports.</li>
          <li>Private delivery artifacts, hashes, review evidence, and outcomes.</li>
          <li>Exact policy acknowledgements and optional publication consents.</li>
        </ul>
      </section>
      <section>
        <h2>Abuse prevention</h2>
        <p>
          For broad signed-in intake, the application converts the trusted
          request address into a keyed one-way digest before it reaches the
          database. The raw address, user-agent text, brief, URLs, and account
          identifiers are not placed in product analytics. The keyed network
          digest is deleted after 30 days; the case retains only that screening
          passed, its opaque receipt identifier, when it passed, and which
          screening version was used.
        </p>
      </section>
      <section>
        <h2>Access and notifications</h2>
        <p>
          Private case data is restricted to current authorized participants
          and administrators. Transactional email, when separately enabled and
          chosen, contains only a bounded status message and private case link;
          the in-app event record remains authoritative.
        </p>
      </section>
      <section>
        <h2>Retention and account deletion</h2>
        <p>
          PathForge targets removal of raw brief and clarification text 90 days
          after terminal closure unless a valid hold applies. A deidentified
          audit tombstone may remain for roughly 400 days. Account deletion
          removes live identity links while preserving bounded history needed
          for integrity, cleanup, dispute handling, and legal obligations.
        </p>
      </section>
    </RequestPolicyPage>
  )
}
