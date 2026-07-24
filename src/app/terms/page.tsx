import PolicyPage from '@/components/PolicyPage'

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Pilot policy · effective July 22, 2026" title="Project submission terms" intro="These terms describe the invitation-only PathForge community project pilot. The pilot accepts reviewed evidence bundles; it is not an automatic hosting or publication service.">
      <section><h2>What you submit</h2><p>You submit one HTML artifact, project information, selected or reconstructed build evidence, and optional public provider-source evidence. You choose how complete the evidence is and whether a checked source link may become public.</p></section>
      <section><h2>Your permission and responsibility</h2><p>You must be the person who built the submitted project and have the rights needed to provide every submitted item. The pilot does not accept representative or third-party submissions. You must remove credentials, secrets, personal information, confidential material, and content you are not allowed to share. Do not submit unlawful, malicious, deceptive, exploitative, or privacy-invasive material.</p></section>
      <section><h2>License to PathForge</h2><p>You grant PathForge a nonexclusive, worldwide license to store, scan, review, reproduce, and publicly display an approved bundle for operation of the service. Public display permission ends when withdrawal disables access. Limited handling permission continues only for the documented cleanup, investigation, legal-hold, and retention periods described in the Privacy Notice; copies already made lawfully by others may remain outside PathForge.</p></section>
      <section><h2>Reuse choice</h2><p>Display permission is separate from reuse permission. “View only” grants visitors no reuse license. “Allow PathForge remixes” permits PathForge members to adapt the project within PathForge with attribution. PathForge does not promise that technical copying can be prevented.</p></section>
      <section><h2>Review, refusal, and removal</h2><p>Nothing publishes automatically. PathForge may request changes, decline, suspend, or remove a project. Contributors may withdraw before publication or unpublish afterward. Removal turns off PathForge access immediately; external caches or lawful copies outside PathForge may not disappear at the same moment.</p></section>
      <section><h2>No proof or warranty</h2><p>Artifact hashing proves only that PathForge served the reviewed bytes. Builder-reported provider and model labels are not independent model or authorship verification. The pilot is provided as available and may change or end while its safety and value are evaluated.</p></section>
    </PolicyPage>
  )
}
