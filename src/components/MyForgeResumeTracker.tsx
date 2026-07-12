'use client'

import { useEffect, useRef } from 'react'
import {
  markProjectModelUpdatesSeen,
  saveProjectResumeState,
} from '@/lib/my-forge-actions'

async function retryServerAction(
  action: () => Promise<{ success: boolean }>,
  attempts = 3,
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await action()
      if (result.success) return true
    } catch {
      // A later retry handles transient navigation or network failures.
    }
    if (attempt < attempts - 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 350 * (2 ** attempt))
      })
    }
  }
  return false
}

const projectResumeQueues = new Map<string, Promise<void>>()

function enqueueProjectResumeSave(
  projectId: string,
  action: () => Promise<boolean>,
) {
  const previous = projectResumeQueues.get(projectId) ?? Promise.resolve()
  const current = previous
    .catch(() => undefined)
    .then(action)
  const tail = current.then(() => undefined, () => undefined)
  projectResumeQueues.set(projectId, tail)
  void tail.then(() => {
    if (projectResumeQueues.get(projectId) === tail) {
      projectResumeQueues.delete(projectId)
    }
  })
  return current
}

export default function MyForgeResumeTracker({
  enabled,
  projectId,
  sourceRunId,
  stepId,
  stepNumber,
  artifactPath,
  artifactSha256,
  acknowledgeModelUpdates = false,
}: {
  enabled: boolean
  projectId: string
  sourceRunId?: string | null
  stepId?: string | null
  stepNumber?: number | null
  artifactPath?: string | null
  artifactSha256?: string | null
  acknowledgeModelUpdates?: boolean
}) {
  const lastSavedRef = useRef('')
  const lastQueuedRef = useRef('')
  const acknowledgedRunRef = useRef('')

  useEffect(() => {
    if (!enabled || !acknowledgeModelUpdates || !sourceRunId) return
    const acknowledgementKey = `${projectId}|${sourceRunId}`
    if (acknowledgedRunRef.current === acknowledgementKey) return
    acknowledgedRunRef.current = acknowledgementKey
    void retryServerAction(() => markProjectModelUpdatesSeen(projectId, sourceRunId)).then((success) => {
      if (!success && acknowledgedRunRef.current === acknowledgementKey) {
        acknowledgedRunRef.current = ''
      }
    })
  }, [acknowledgeModelUpdates, enabled, projectId, sourceRunId])

  useEffect(() => {
    if (!enabled || !sourceRunId || !stepId || !stepNumber || !artifactPath || !artifactSha256) return

    const normalizedArtifactPath = artifactPath.startsWith('/artifacts/')
      ? `public${artifactPath}`
      : artifactPath
    const stateKey = [
      projectId,
      sourceRunId,
      stepId,
      String(stepNumber),
      normalizedArtifactPath,
      artifactSha256,
    ].join('|')
    if (lastSavedRef.current === stateKey || lastQueuedRef.current === stateKey) return

    const timeout = window.setTimeout(() => {
      lastQueuedRef.current = stateKey
      void enqueueProjectResumeSave(
        projectId,
        () => retryServerAction(() => saveProjectResumeState({
          projectId,
          sourceRunId,
          stepId,
          stepNumber,
          artifactPath: normalizedArtifactPath,
          artifactSha256,
        })),
      )
        .then((success) => {
          if (success) {
            lastSavedRef.current = stateKey
          } else if (lastQueuedRef.current === stateKey) {
            lastQueuedRef.current = ''
          }
        })
        .catch(() => {
          if (lastQueuedRef.current === stateKey) {
            lastQueuedRef.current = ''
          }
        })
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [
    artifactPath,
    artifactSha256,
    enabled,
    projectId,
    sourceRunId,
    stepId,
    stepNumber,
  ])

  return null
}
