import Link from 'next/link'
import { ArrowRight, CheckCircle2, CopyCheck } from 'lucide-react'
import styles from './RequestServiceOverview.module.css'

export type RequestSubmissionReceiptView = {
  commandId: string
  requestId: string
  version: number
  eventId: string
  occurredAt: string
  lifecycle: string
  moderation: string
  publication: string
  replayed: boolean
}

export type RequestSubmissionReceiptProps = {
  receipt: RequestSubmissionReceiptView
  requestHref: string
}

function formatReceiptTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function RequestSubmissionReceipt({
  receipt,
  requestHref,
}: RequestSubmissionReceiptProps) {
  return (
    <section className={styles.receipt} aria-labelledby="request-receipt-heading">
      <div className={styles.receiptStatus} role="status">
        {receipt.replayed ? <CopyCheck aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <div>
          <span>{receipt.replayed ? 'Verified replay' : 'Durable receipt'}</span>
          <h2 id="request-receipt-heading">
            {receipt.replayed ? 'This submission was already recorded.' : 'Your private brief was recorded.'}
          </h2>
          <p>
            {receipt.replayed
              ? 'PathForge returned the original durable result instead of creating a duplicate case.'
              : 'The case now has a durable identity and can be continued from its private page.'}
          </p>
        </div>
      </div>

      <dl className={styles.receiptDetails}>
        <div>
          <dt>Request</dt>
          <dd>{receipt.requestId}</dd>
        </div>
        <div>
          <dt>Command</dt>
          <dd>{receipt.commandId}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{receipt.version}</dd>
        </div>
        <div>
          <dt>Recorded</dt>
          <dd>{formatReceiptTime(receipt.occurredAt)}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd>{receipt.lifecycle}</dd>
        </div>
        <div>
          <dt>Moderation</dt>
          <dd>{receipt.moderation}</dd>
        </div>
        <div>
          <dt>Publication</dt>
          <dd>{receipt.publication}</dd>
        </div>
        <div className={styles.receiptEvent}>
          <dt>Event reference</dt>
          <dd>{receipt.eventId}</dd>
        </div>
      </dl>

      <Link href={requestHref} className={styles.primaryAction}>
        Open private request
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  )
}

export default RequestSubmissionReceipt
