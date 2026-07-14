'use client'

import { useEffect } from 'react'
import { trackActivationEvent } from '@/lib/activation/track'

export default function ProjectActivationTracker({
  projectId,
  projectTitle,
  sourceRunId,
}: {
  projectId: string
  projectTitle: string
  sourceRunId?: string | null
}) {
  useEffect(() => {
    void trackActivationEvent({
      eventName: 'project_opened',
      surface: 'project',
      projectId,
      projectTitle,
      sourceRunId: sourceRunId ?? undefined,
    })
  }, [projectId, projectTitle, sourceRunId])

  useEffect(() => {
    const buildPath = document.getElementById('source-run-path')
    if (!buildPath) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      void trackActivationEvent({
        eventName: 'build_path_reached',
        surface: 'project',
        projectId,
        projectTitle,
        sourceRunId: sourceRunId ?? undefined,
      })
      observer.disconnect()
    }, { threshold: 0.12 })
    observer.observe(buildPath)
    return () => observer.disconnect()
  }, [projectId, projectTitle, sourceRunId])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      if (target.closest('[data-response-fork-top-action], [data-fork-continuation-fork]')) {
        void trackActivationEvent({
          eventName: 'builder_action_started',
          surface: 'project',
          action: 'fork',
          projectId,
          projectTitle,
          sourceRunId: sourceRunId ?? undefined,
        })
        return
      }

      if (target.closest('[data-model-variant-compare]')) {
        void trackActivationEvent({
          eventName: 'model_run_compared',
          surface: 'project',
          action: 'model_compare',
          projectId,
          projectTitle,
          sourceRunId: sourceRunId ?? undefined,
        })
        return
      }

      if (target.closest('[data-artifact-package-select], [data-artifact-version-select], [data-fork-display-artifact], a[href*="/artifact-viewer"]')) {
        void trackActivationEvent({
          eventName: 'artifact_opened',
          surface: 'project',
          action: 'artifact',
          projectId,
          projectTitle,
          sourceRunId: sourceRunId ?? undefined,
        })
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [projectId, projectTitle, sourceRunId])

  return null
}
