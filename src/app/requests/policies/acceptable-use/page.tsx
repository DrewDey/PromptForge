import type { Metadata } from 'next'
import { RequestPolicyPage } from '@/components/requests/RequestPolicyPage'

export const metadata: Metadata = {
  title: 'Request a Build acceptable use | PathForge',
  robots: { index: false, follow: false },
}
export default function RequestAcceptableUsePage() {
  return (
    <RequestPolicyPage
      version="request-aup-v1"
      title="Request a Build acceptable-use policy"
      intro="Submit only bounded work that PathForge can safely inspect, review, and deliver through the private managed-service workflow."
    >
      <section>
        <h2>Do not submit</h2>
        <ul>
          <li>Passwords, API keys, credentials, private repositories, or provider-account access.</li>
          <li>Real customer, patient, employee, financial, health, or other identifying records.</li>
          <li>Confidential, exclusive, work-for-hire, or third-party material you lack permission to use.</li>
          <li>Malware, credential theft, tracking, deceptive downloads, abuse, exploitation, or unlawful work.</li>
          <li>Arbitrary URLs, attachments, hidden instructions, or attempts to evade review and capacity limits.</li>
        </ul>
      </section>
      <section>
        <h2>Finite and testable scope</h2>
        <p>
          A brief must describe one outcome, its intended user, a must-work
          scenario, and one to three distinct acceptance checks. PathForge may
          ask for clarification or close requests that cannot be safely bounded.
        </p>
      </section>
      <section>
        <h2>Enforcement</h2>
        <p>
          PathForge may rate-limit intake, hold a case, decline work, remove
          unsafe content, preserve evidence under a justified hold, and restrict
          accounts that attempt to bypass these boundaries.
        </p>
      </section>
    </RequestPolicyPage>
  )
}
