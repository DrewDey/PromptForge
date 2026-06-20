const SOURCE_RUN_FORK_COLUMNS = [
  'fork_source_project_id',
  'fork_source_project_title',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_parent_submission_id',
  'prompt_family_id',
  'fork_depth',
  'fork_branch_index',
]

function errorMentionsAnyColumn(error: { message?: string } | null, columnNames: string[]) {
  const message = error?.message?.toLowerCase() ?? ''
  return columnNames.some((columnName) => message.includes(columnName))
}

function columnMissingError(error: { code?: string; message?: string } | null, columnNames: string[]) {
  return Boolean(
    error &&
    (
      error.code === '42703' ||
      error.code === 'PGRST204'
    ) &&
    errorMentionsAnyColumn(error, columnNames)
  )
}

export function sourceRunForkColumnsMissing(error: { code?: string; message?: string } | null) {
  return columnMissingError(error, SOURCE_RUN_FORK_COLUMNS)
}

export function forkColumnsMissing(error: { code?: string; message?: string } | null) {
  return sourceRunForkColumnsMissing(error)
}

export function omitForkFields<T extends Record<string, unknown>>(payload: T) {
  const {
    fork_source_project_id: _forkSourceProjectId,
    fork_source_project_title: _forkSourceProjectTitle,
    fork_source_step_id: _forkSourceStepId,
    fork_source_step_number: _forkSourceStepNumber,
    fork_parent_submission_id: _forkParentSubmissionId,
    prompt_family_id: _promptFamilyId,
    fork_depth: _forkDepth,
    fork_branch_index: _forkBranchIndex,
    ...rest
  } = payload
  return rest
}
