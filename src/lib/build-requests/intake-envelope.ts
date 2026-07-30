export class RequestIntakeEnvelopeError extends Error {
  constructor() {
    super('Acceptance checks must contain one to three text values.')
    this.name = 'RequestIntakeEnvelopeError'
  }
}

export type RequestIntakeAcceptanceChecks =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]

export function readRequestIntakeAcceptanceChecks(
  formData: FormData,
): RequestIntakeAcceptanceChecks {
  const submitted = formData.getAll('acceptanceChecks')
  if (
    submitted.length < 1 ||
    submitted.length > 3 ||
    submitted.some((value) => typeof value !== 'string')
  ) {
    throw new RequestIntakeEnvelopeError()
  }
  return submitted as unknown as RequestIntakeAcceptanceChecks
}
