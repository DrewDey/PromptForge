'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEventHandler,
} from 'react'
import Link from 'next/link'
import type {
  CreateRequestBriefInputV1,
  PathForgeRequestReference,
} from '@/lib/request-lifecycle'
import {
  AlertTriangle,
  ArrowLeft,
  FileCheck2,
  LockKeyhole,
  Minus,
  Plus,
  Send,
} from 'lucide-react'
import styles from './RequestIntakeForm.module.css'

export type RequestIntakeField =
  | 'title'
  | 'outcome'
  | 'intendedUser'
  | 'mustWorkScenario'
  | 'acceptanceChecks'
  | 'constraints'
  | 'pathforgeIdentifier'
  | 'form'

export type RequestIntakeError = {
  field: RequestIntakeField
  message: string
}

export type RequestIntakeValues = Omit<
  CreateRequestBriefInputV1,
  'acceptanceChecks' | 'pathforgeReference'
> & {
  acceptanceChecks: string[]
  pathforgeReference?: PathForgeRequestReference
}

export type RequestIntakeFormProps = {
  action?: string | ((formData: FormData) => void | Promise<void>)
  onSubmit?: FormEventHandler<HTMLFormElement>
  onIntakeStarted?: () => void
  idempotencyKey: string
  defaultValues?: Partial<RequestIntakeValues>
  errors?: RequestIntakeError[]
  pending?: boolean
  serviceError?:
    | 'auth_required'
    | 'not_admitted'
    | 'already_active'
    | 'controls_off'
    | 'capacity_full'
    | 'unavailable'
    | 'rate_limited'
    | 'duplicate'
    | 'stale_version'
    | 'forbidden_input'
    | 'invalid_reference'
    | 'unknown'
    | null
  backHref?: string
}

const fieldTargets: Record<RequestIntakeField, string> = {
  title: 'request-title',
  outcome: 'request-outcome',
  intendedUser: 'request-intended-user',
  mustWorkScenario: 'request-must-work-scenario',
  acceptanceChecks: 'request-acceptance-checks',
  constraints: 'request-constraints',
  pathforgeIdentifier: 'request-pathforge-identifier',
  form: 'request-intake-form',
}

const serviceErrorCopy: Record<Exclude<RequestIntakeFormProps['serviceError'], null | undefined>, string> = {
  auth_required: 'Your sign-in is no longer active. Sign in again before submitting; no private case was created.',
  not_admitted: 'This account is not in the current pilot. No private case was created.',
  already_active: 'This account already has an active private request. Continue it in My Forge before starting another.',
  controls_off: 'Request intake closed before this brief was recorded. Your text remains on this page.',
  capacity_full: 'Assignment capacity changed before this brief was recorded. This does not reveal pilot eligibility; your text remains on this page.',
  unavailable: 'The service could not validate this brief. Your text remains on this page; try again when the secure connection recovers.',
  rate_limited: 'Too many intake attempts were received. Wait before trying again; another submit now will not create a case.',
  duplicate: 'This submission conflicts with an existing active request or prior submission attempt. Check My Forge before retrying.',
  stale_version: 'The service state changed while this brief was open. Review the current availability and submit again.',
  forbidden_input: 'The service rejected prohibited or sensitive input. Remove secrets, private data, external links, or confidential terms and review the guidance.',
  invalid_reference: 'The PathForge reference could not be verified. Check the project, model variant, and response step identifiers.',
  unknown: 'PathForge could not verify whether this brief was recorded. Keep this page open and check your private request list before trying again.',
}

function fieldError(errors: RequestIntakeError[], field: RequestIntakeField) {
  return errors.find((error) => error.field === field)?.message
}

export function RequestIntakeForm({
  action,
  onSubmit,
  onIntakeStarted,
  idempotencyKey,
  defaultValues,
  errors = [],
  pending = false,
  serviceError = null,
  backHref = '/requests',
}: RequestIntakeFormProps) {
  const baseId = useId().replace(/:/g, '')
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const intakeStartedRef = useRef(false)
  const [acceptanceChecks, setAcceptanceChecks] = useState(() => {
    const supplied = defaultValues?.acceptanceChecks?.slice(0, 3)
    return supplied?.length ? supplied : ['']
  })
  const [referenceKind, setReferenceKind] = useState<'none' | 'project' | 'response'>(
    defaultValues?.pathforgeReference?.kind ?? 'none',
  )
  const visibleErrors = serviceError
    ? [{ field: 'form' as const, message: serviceErrorCopy[serviceError] }, ...errors]
    : errors
  const errorSignature = visibleErrors
    .map((error) => `${error.field}:${error.message}`)
    .join('|')

  useEffect(() => {
    if (visibleErrors.length > 0) errorSummaryRef.current?.focus()
  }, [errorSignature, visibleErrors.length])

  function announceIntakeStarted() {
    if (intakeStartedRef.current) return
    intakeStartedRef.current = true
    onIntakeStarted?.()
  }

  function addAcceptanceCheck() {
    setAcceptanceChecks((checks) => checks.length < 3 ? [...checks, ''] : checks)
  }

  function removeAcceptanceCheck(index: number) {
    setAcceptanceChecks((checks) => checks.length > 1
      ? checks.filter((_, checkIndex) => checkIndex !== index)
      : checks)
  }

  function updateAcceptanceCheck(index: number, value: string) {
    setAcceptanceChecks((checks) => checks.map((check, checkIndex) => (
      checkIndex === index ? value : check
    )))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={backHref} className={styles.backLink}>
          <ArrowLeft aria-hidden="true" />
          Request a Build
        </Link>
        <div className={styles.kicker}>
          <LockKeyhole aria-hidden="true" />
          Private structured intake
        </div>
        <h1>Describe the finish line.</h1>
        <p>
          Keep the brief finite and testable. A triager will first look for an
          existing PathForge resolution, repair, fork, or model rerun.
        </p>
      </header>

      <main className={styles.layout}>
        <form
          id="request-intake-form"
          action={action}
          onSubmit={onSubmit}
          onFocusCapture={announceIntakeStarted}
          onChangeCapture={announceIntakeStarted}
          className={styles.form}
          noValidate
        >
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {visibleErrors.length > 0 && (
            <div
              ref={errorSummaryRef}
              className={styles.errorSummary}
              role="alert"
              aria-labelledby={`${baseId}-error-heading`}
              tabIndex={-1}
            >
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2 id={`${baseId}-error-heading`}>Check this brief before submitting.</h2>
                <ul>
                  {visibleErrors.map((error, index) => (
                    <li key={`${error.field}-${index}`}>
                      {error.field === 'form'
                        ? error.message
                        : <a href={`#${fieldTargets[error.field]}`}>{error.message}</a>}
                    </li>
                  ))}
                </ul>
                {serviceError === 'already_active' || serviceError === 'duplicate' ? (
                  <Link href="/my-forge?tab=requests">
                    Open My Forge requests
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          <section aria-labelledby={`${baseId}-brief-heading`}>
            <div className={styles.sectionHeading}>
              <span>01</span>
              <div>
                <h2 id={`${baseId}-brief-heading`}>Outcome and user</h2>
                <p>Describe what should exist and who should be able to use it.</p>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="request-title">Short title</label>
              <p id="request-title-hint">A participant-safe label for finding this private case again.</p>
              <input
                id="request-title"
                name="title"
                required
                minLength={4}
                maxLength={120}
                defaultValue={defaultValues?.title}
                aria-describedby={`request-title-hint${fieldError(errors, 'title') ? ' request-title-error' : ''}`}
                aria-invalid={fieldError(errors, 'title') ? 'true' : undefined}
              />
              {fieldError(errors, 'title') && <span id="request-title-error" className={styles.fieldError}>{fieldError(errors, 'title')}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="request-outcome">Outcome</label>
              <p id="request-outcome-hint">One concrete result, stated as something a person can use or verify.</p>
              <textarea
                id="request-outcome"
                name="outcome"
                required
                minLength={20}
                maxLength={4000}
                rows={4}
                defaultValue={defaultValues?.outcome}
                aria-describedby={`request-outcome-hint${fieldError(errors, 'outcome') ? ' request-outcome-error' : ''}`}
                aria-invalid={fieldError(errors, 'outcome') ? 'true' : undefined}
              />
              {fieldError(errors, 'outcome') && <span id="request-outcome-error" className={styles.fieldError}>{fieldError(errors, 'outcome')}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="request-intended-user">Intended user</label>
              <p id="request-intended-user-hint">Name the person or role this result is meant to help.</p>
              <input
                id="request-intended-user"
                name="intendedUser"
                required
                minLength={2}
                maxLength={1000}
                defaultValue={defaultValues?.intendedUser}
                aria-describedby={`request-intended-user-hint${fieldError(errors, 'intendedUser') ? ' request-intended-user-error' : ''}`}
                aria-invalid={fieldError(errors, 'intendedUser') ? 'true' : undefined}
              />
              {fieldError(errors, 'intendedUser') && <span id="request-intended-user-error" className={styles.fieldError}>{fieldError(errors, 'intendedUser')}</span>}
            </div>
          </section>

          <section aria-labelledby={`${baseId}-checks-heading`}>
            <div className={styles.sectionHeading}>
              <span>02</span>
              <div>
                <h2 id={`${baseId}-checks-heading`}>Must-work scenario and checks</h2>
                <p>Define the moment that matters and how the reviewed result will be judged.</p>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="request-must-work-scenario">Must-work scenario</label>
              <p id="request-must-work-scenario-hint">Describe the real situation in which the result must work.</p>
              <textarea
                id="request-must-work-scenario"
                name="mustWorkScenario"
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                defaultValue={defaultValues?.mustWorkScenario}
                aria-describedby={`request-must-work-scenario-hint${fieldError(errors, 'mustWorkScenario') ? ' request-must-work-scenario-error' : ''}`}
                aria-invalid={fieldError(errors, 'mustWorkScenario') ? 'true' : undefined}
              />
              {fieldError(errors, 'mustWorkScenario') && <span id="request-must-work-scenario-error" className={styles.fieldError}>{fieldError(errors, 'mustWorkScenario')}</span>}
            </div>

            <fieldset
              id="request-acceptance-checks"
              className={styles.checks}
              aria-describedby={`request-acceptance-checks-hint${fieldError(errors, 'acceptanceChecks') ? ' request-acceptance-checks-error' : ''}`}
            >
              <legend>Acceptance checks <span>1–3 required</span></legend>
              <p id="request-acceptance-checks-hint">
                Make every check distinct from the others and from the must-work scenario.
              </p>
              {acceptanceChecks.map((check, index) => (
                <div className={styles.checkRow} key={`${baseId}-check-${index}`}>
                  <label htmlFor={`${baseId}-acceptance-${index}`}>
                    Check {index + 1}
                  </label>
                  <div>
                    <input
                      id={`${baseId}-acceptance-${index}`}
                      name="acceptanceChecks"
                      required
                      minLength={4}
                      maxLength={500}
                      value={check}
                      onChange={(event) => updateAcceptanceCheck(index, event.target.value)}
                      aria-invalid={fieldError(errors, 'acceptanceChecks') ? 'true' : undefined}
                    />
                    {acceptanceChecks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAcceptanceCheck(index)}
                        aria-label={`Remove acceptance check ${index + 1}`}
                      >
                        <Minus aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {fieldError(errors, 'acceptanceChecks') && <span id="request-acceptance-checks-error" className={styles.fieldError}>{fieldError(errors, 'acceptanceChecks')}</span>}
              {acceptanceChecks.length < 3 && (
                <button type="button" className={styles.addCheck} onClick={addAcceptanceCheck}>
                  <Plus aria-hidden="true" />
                  Add another check
                </button>
              )}
            </fieldset>
          </section>

          <section aria-labelledby={`${baseId}-context-heading`}>
            <div className={styles.sectionHeading}>
              <span>03</span>
              <div>
                <h2 id={`${baseId}-context-heading`}>Bounded context</h2>
                <p>Add constraints and, if useful, a typed PathForge project or response reference.</p>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="request-constraints">Constraints <span>Optional</span></label>
              <p id="request-constraints-hint">Include practical limits such as device, file format, accessibility, or offline use.</p>
              <textarea
                id="request-constraints"
                name="constraints"
                maxLength={2000}
                rows={4}
                defaultValue={defaultValues?.constraints}
                aria-describedby={`request-constraints-hint${fieldError(errors, 'constraints') ? ' request-constraints-error' : ''}`}
                aria-invalid={fieldError(errors, 'constraints') ? 'true' : undefined}
              />
              {fieldError(errors, 'constraints') && <span id="request-constraints-error" className={styles.fieldError}>{fieldError(errors, 'constraints')}</span>}
            </div>

            <div className={styles.identifier}>
              <div className={styles.field}>
                <label htmlFor="request-identifier-kind">Identifier type</label>
                <select
                  id="request-identifier-kind"
                  name="referenceKind"
                  value={referenceKind}
                  onChange={(event) => setReferenceKind(event.target.value as typeof referenceKind)}
                >
                  <option value="none">No PathForge reference</option>
                  <option value="project">PathForge project</option>
                  <option value="response">PathForge response</option>
                </select>
              </div>
              {referenceKind !== 'none' ? (
                <div className={styles.field}>
                  <label htmlFor="request-pathforge-identifier">Project identifier</label>
                  <p id="request-pathforge-identifier-hint">
                    Enter the project identifier, not a URL. The service verifies that the project exists.
                  </p>
                  <input
                    id="request-pathforge-identifier"
                    name="referenceProjectId"
                    required
                    maxLength={200}
                    inputMode="text"
                    autoComplete="off"
                    defaultValue={defaultValues?.pathforgeReference?.projectId}
                    aria-describedby={`request-pathforge-identifier-hint${fieldError(errors, 'pathforgeIdentifier') ? ' request-pathforge-identifier-error' : ''}`}
                    aria-invalid={fieldError(errors, 'pathforgeIdentifier') ? 'true' : undefined}
                  />
                  {fieldError(errors, 'pathforgeIdentifier') && <span id="request-pathforge-identifier-error" className={styles.fieldError}>{fieldError(errors, 'pathforgeIdentifier')}</span>}
                </div>
              ) : null}
              {referenceKind === 'response' ? (
                <>
                  <div className={styles.field}>
                    <label htmlFor="request-model-variant-identifier">Model variant identifier</label>
                    <p id="request-model-variant-identifier-hint">
                      The service verifies that this model variant belongs to the project.
                    </p>
                    <input
                      id="request-model-variant-identifier"
                      name="referenceModelVariantId"
                      required
                      maxLength={200}
                      inputMode="text"
                      autoComplete="off"
                      defaultValue={defaultValues?.pathforgeReference?.kind === 'response'
                        ? defaultValues.pathforgeReference.modelVariantId
                        : undefined}
                      aria-describedby="request-model-variant-identifier-hint"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="request-step-number">Response step number</label>
                    <p id="request-step-number-hint">
                      Use the numbered response step. The service verifies exact
                      published model-variant response evidence for this project.
                    </p>
                    <input
                      id="request-step-number"
                      name="referenceResponseStepNumber"
                      type="number"
                      required
                      min={1}
                      max={100}
                      inputMode="numeric"
                      defaultValue={defaultValues?.pathforgeReference?.kind === 'response'
                        ? defaultValues.pathforgeReference.responseStepNumber
                        : undefined}
                      aria-describedby="request-step-number-hint"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <div className={styles.submitArea}>
            <div>
              <FileCheck2 aria-hidden="true" />
              <p>
                Submitting creates a private durable receipt. It does not promise
                acceptance, assignment, a delivery date, or publication.
              </p>
            </div>
            <button type="submit" disabled={pending}>
              <Send aria-hidden="true" />
              {pending ? 'Validating brief…' : 'Submit private brief'}
            </button>
          </div>
        </form>

        <aside className={styles.guidance} aria-labelledby={`${baseId}-guidance-heading`}>
          <span>Before you submit</span>
          <h2 id={`${baseId}-guidance-heading`}>Keep private data out of the brief.</h2>
          <p>
            Intake is text-only. Service-side validation can reject prohibited or
            unsupported input even when the browser accepts the form.
          </p>
          <div className={styles.doNotInclude}>
            <h3>Do not include</h3>
            <ul>
              <li>Attachments or arbitrary URLs</li>
              <li>Passwords, API keys, or other secrets</li>
              <li>Customer, patient, employee, or identifying data</li>
              <li>Private repositories or provider-account links</li>
              <li>Confidential, exclusive, or work-for-hire material</li>
            </ul>
          </div>
          <div className={styles.rights}>
            <h3>Private service terms</h3>
            <p>
              The assigned builder remains the credited author. If delivered,
              you receive non-exclusive use and download rights. Public
              attribution and publication require separate future consent and
              are not available here.
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default RequestIntakeForm
