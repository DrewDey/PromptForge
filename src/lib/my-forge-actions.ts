'use server'

import { revalidatePath } from 'next/cache'
import {
  getMyForgeRepairContext,
  markMyForgeForkStarted,
  markMyForgeModelUpdatesSeen,
  removeMyForgeProjectState,
  saveMyForgeResumeState,
} from '@/lib/data/my-forge'
import type { SaveMyForgeResumeStateInput } from '@/lib/my-forge-types'
import type { ProjectForkSource } from '@/lib/project-forks'

type MyForgeActionResult<T = undefined> = {
  success: boolean
  data?: T
  error?: string
}

export async function saveProjectResumeState(
  input: SaveMyForgeResumeStateInput,
): Promise<MyForgeActionResult> {
  try {
    await saveMyForgeResumeState(input)
    revalidatePath('/my-forge')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PathForge could not save your place.',
    }
  }
}

export async function markProjectModelUpdatesSeen(
  projectId: string,
  sourceRunId: string,
): Promise<MyForgeActionResult> {
  try {
    await markMyForgeModelUpdatesSeen(projectId, sourceRunId)
    revalidatePath('/my-forge')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PathForge could not update this path.',
    }
  }
}

export async function markProjectForkStarted(
  source: ProjectForkSource,
): Promise<MyForgeActionResult> {
  try {
    await markMyForgeForkStarted(source)
    revalidatePath('/my-forge')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PathForge could not save this fork activity.',
    }
  }
}

export async function clearProjectResumeState(
  projectId: string,
): Promise<MyForgeActionResult> {
  try {
    await removeMyForgeProjectState(projectId)
    revalidatePath('/my-forge')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PathForge could not clear this saved state.',
    }
  }
}

export async function loadMyForgeRepairContext(
  sourceRunId: string,
): Promise<MyForgeActionResult<Awaited<ReturnType<typeof getMyForgeRepairContext>>>> {
  try {
    const context = await getMyForgeRepairContext(sourceRunId)
    if (!context) return { success: false, error: 'That repair entry is unavailable.' }
    return { success: true, data: context }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PathForge could not load that repair entry.',
    }
  }
}
