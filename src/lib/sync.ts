import { supabase } from './supabase'
import type { ArcalistState } from '../types'

export async function pushToCloud(
  userId: string,
  state: ArcalistState
): Promise<void> {
  const { error } = await supabase
    .from('arcalist-workspaces')
    .upsert({
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  )
  if (error) {
    console.error('[Arcalist] Cloud push failed:', error.message)
  }
}

export async function pullFromCloud(
  userId: string
): Promise<ArcalistState | null> {
  const { data, error } = await supabase
    .from('arcalist_workspaces')
    .select('state, updated_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.state as ArcalistState
}

// Resolve conflicts
export function resolveConflict(
  local: ArcalistState,
  cloud: ArcalistState
): ArcalistState {
  const localTime = local.updatedAt ?? 0
  const remoteTime = cloud.updatedAt ?? 0
  return remoteTime > localTime ? cloud : local
}
