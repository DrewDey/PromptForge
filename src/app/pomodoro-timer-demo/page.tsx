import fs from 'node:fs'
import path from 'node:path'
import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POMODORO_TIMER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import type { SourceRunPackage } from '@/lib/source-run-package'

const project = POMODORO_TIMER_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

function readArtifact(fileName: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public/artifacts', fileName), 'utf8')
  } catch {
    return `Artifact capture ${fileName} is unavailable.`
  }
}

function sourceRunPackage(): SourceRunPackage {
  const finalArtifactPath = 'public/artifacts/pomodoro-focus-timer-gpt55-instant.html'
  return {
    title: project.title,
    provider: 'ChatGPT',
    model: project.modelUsed,
    model_settings: 'ChatGPT web; Instant mode visible',
    source_url: project.sourceUrl,
    source_run_id: project.sourceRunId,
    prompt_count: project.steps.length,
    final_artifact_path: finalArtifactPath,
    steps: project.steps.map((step) => {
      const artifactPath = `public/artifacts/pomodoro-step-${step.stepNumber}.html`
      return {
        step_number: step.stepNumber,
        prompt_exact: step.content,
        response_exact: readArtifact(`pomodoro-step-${step.stepNumber}.html`),
        artifact_version_path: artifactPath,
        generated_files: step.stepNumber === project.steps.at(-1)?.stepNumber
          ? [artifactPath, finalArtifactPath]
          : [artifactPath],
      }
    }),
  }
}

export default function PomodoroTimerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={sourceRunPackage()}
      capturedAt="June 2, 2026"
    />
  )
}
