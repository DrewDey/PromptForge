import PolicyPage from '@/components/PolicyPage'

export default function CopyrightPage() {
  return (
    <PolicyPage eyebrow="Copyright and content reports" title="Report material that should not be public" intro="Every community project has a structured report form. PathForge can suspend the database record and artifact immediately while a report is reviewed.">
      <section><h2>What to include</h2><p>Identify the project, describe the protected or harmful material, explain your relationship to it, and provide enough detail for PathForge to locate the issue. Use an email address where the review team can follow up.</p></section>
      <section><h2>What happens next</h2><p>PathForge records the report privately, may suspend the project immediately, and reviews the artifact, evidence, permissions, and relevant account history. The contributor may be asked to respond or repair the bundle. Reports and responses are not published automatically.</p></section>
      <section><h2>Response targets</h2><p>PathForge targets acknowledgment of privacy, malware, exploitation, credential, or imminent-harm reports within 4 hours, and other reports within 1 business day. The target for resolution or a documented escalation is 7 calendar days. These are pilot operating targets, not a guarantee of a particular decision.</p></section>
      <section><h2>Accuracy</h2><p>Submit reports in good faith. A misleading report can harm creators and delay urgent cases. This pilot page describes the product workflow; it is not a claim that PathForge has completed any jurisdiction-specific service-provider registration or legal safe-harbor process.</p></section>
    </PolicyPage>
  )
}
