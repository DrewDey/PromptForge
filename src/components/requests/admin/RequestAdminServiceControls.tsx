import type { RequestPilotAdmissionCandidateV1 } from '@/lib/request-lifecycle'
import styles from './requestAdmin.module.css'

type FormAction = (formData: FormData) => void | Promise<void>

export function RequestAdminServiceControls({
  candidates,
  updateAdmission,
}: {
  candidates: readonly RequestPilotAdmissionCandidateV1[]
  updateAdmission: FormAction
}) {
  return (
    <div className={styles.detailStack}>
      <section className={styles.operationCard} aria-labelledby="request-pilot-admission">
        <div>
          <p className={styles.eyebrow}>Admin-only invited pilot</p>
          <h2 id="request-pilot-admission">Pilot admission</h2>
          <p>Choose one confirmed account from the safe directory. This does not send an email or create a public enrollment flow.</p>
        </div>
        <form action={updateAdmission} className={styles.form}>
          <label>
            Confirmed account
            <select name="accountId" required defaultValue="">
              <option value="" disabled>Select an account</option>
              {candidates.map((candidate) => (
                <option key={candidate.accountId} value={candidate.accountId}>
                  {candidate.displayName} · {candidate.admitted ? 'admitted' : 'not admitted'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select name="admissionAction" required defaultValue="invite">
              <option value="invite">Admit to pilot</option>
              <option value="revoke">Revoke admission</option>
            </select>
          </label>
          <label>
            Optional expiry (UTC)
            <input
              type="datetime-local"
              name="expiresAt"
              data-request-expiry-time-zone="UTC"
            />
          </label>
          <label>
            Bounded reason
            <textarea name="reason" minLength={1} maxLength={500} rows={3} required />
          </label>
          <button type="submit" className={styles.primaryButton}>
            Update pilot admission
          </button>
        </form>
      </section>
    </div>
  )
}
