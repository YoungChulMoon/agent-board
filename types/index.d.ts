// 패널이 기억하는 에이전트 한 줄
export type AgentRow = {
  id: string
  description: string
  type: string
  status: string
  startedAt: number
  endedAt?: number
  tools: number
  lastTool?: string
  lastDetail?: string
  lastAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-board': { rows: Shaped<AgentRow[]>; now: number }
  }
}
