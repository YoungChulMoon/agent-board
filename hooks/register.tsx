// agent-board — 서브에이전트 진행 패널.
// 무엇을(설명·종류), 어디까지(상태·경과·도구 호출 수), 지금 뭘 하는지(최근 도구와 대상)를 채팅 옆에 보여 준다.
// 출처: tool.call 의 agentId(서브에이전트 안 호출) + $.agent.list()(설명·상태, 2초마다).
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'agent-board'
const TITLE = '에이전트'
const rows = atom({ plugin: 'agent-board', key: 'rows' } as const, [], { shape: 'rows-1' })
const now = atom({ plugin: 'agent-board', key: 'now' } as const, 0)

const DONE = new Set(['completed', 'failed', 'killed'])
const LABEL: Record<string, string> = {
  pending: '대기', running: '진행', waiting: '기다림', idle: '쉼',
  completed: '완료', failed: '실패', killed: '중단',
}
const MARK: Record<string, string> = {
  pending: '○', running: '●', waiting: '◐', idle: '◌', completed: '✓', failed: '✗', killed: '■',
}

/** 도구 인자에서 「무엇에」 한 조각만 뽑는다(파일 이름·패턴·명령 앞부분). 긴 값·비밀이 될 만한 건 자른다. */
function detailOf(e: Record<string, unknown>): string {
  const pick = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : undefined)
  const path = pick('file_path') ?? pick('path') ?? pick('notebook_path')
  if (path) return path.split(/[\\/]/).slice(-2).join('/')
  const v = pick('pattern') ?? pick('description') ?? pick('command') ?? pick('query') ?? pick('url') ?? pick('skill')
  if (!v) return ''
  const one = v.replace(/\s+/g, ' ').trim()
  return one.length > 48 ? one.slice(0, 47) + '…' : one
}

/** 밀리초 → 「3분 05초」 / 「12초」 */
function dur(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}분 ${String(s % 60).padStart(2, '0')}초` : `${s}초`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agent-board', description: '에이전트 진행 패널 열기' })
    void $.ui.open({ id: PANE, title: TITLE })

    // 2초마다: 목록(설명·상태)을 맞추고 시각을 올려 경과 시간을 다시 그린다.
    $.clock.every(2000, () => {
      void (async () => {
        const t = await $.clock.now()
        const list = await $.agent.list()
        await update($, rows, (old) => {
          const byId = new Map(old.map((r) => [r.id, r]))
          for (const a of list) {
            const r = byId.get(a.id)
            if (r) {
              const ended = DONE.has(a.status) && !DONE.has(r.status)
              byId.set(a.id, { ...r, description: a.description || r.description, type: a.type, status: a.status, endedAt: ended ? t : r.endedAt })
            } else {
              byId.set(a.id, { id: a.id, description: a.description, type: a.type, status: a.status, startedAt: t, tools: 0, endedAt: DONE.has(a.status) ? t : undefined })
            }
          }
          // 목록에서 사라진 진행 중 항목은 끝난 것으로 본다(엔진이 끝난 작업을 지운다).
          const seen = new Set(list.map((a) => a.id))
          for (const r of byId.values()) {
            if (!seen.has(r.id) && !DONE.has(r.status)) byId.set(r.id, { ...r, status: 'completed', endedAt: r.endedAt ?? t })
          }
          return [...byId.values()].slice(-30)
        })
        await update($, now, () => t)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'agent-board' }, async ($) => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: '에이전트 패널을 열었어요.' }
  })

  // 서브에이전트 안의 도구 호출만 센다(agentId 가 있을 때).
  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      const t = await $.clock.now()
      const detail = detailOf(e as unknown as Record<string, unknown>)
      await update($, rows, (old) => {
        const has = old.some((r) => r.id === id)
        const base: AgentRow[] = has ? old : [...old, { id, description: '', type: '', status: 'running', startedAt: t, tools: 0 }]
        return base.map((r) => (r.id === id ? { ...r, tools: r.tools + 1, lastTool: e.tool, lastDetail: detail, lastAt: t } : r))
      })
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, rows)
    const t = (await read($, now)) || (await $.clock.now())
    const active = list.filter((r) => !DONE.has(r.status))
    const finished = list.filter((r) => DONE.has(r.status)).slice(-5).reverse()

    const row = (r: AgentRow) => (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold={!DONE.has(r.status)} dimColor={DONE.has(r.status)}>
          {MARK[r.status] ?? '·'} {r.type || '에이전트'} — {r.description || '(설명 없음)'}
        </Text>
        <Text dimColor>
          {'  '}{LABEL[r.status] ?? r.status} · {dur((r.endedAt ?? t) - r.startedAt)} · 도구 {r.tools}회
        </Text>
        {r.lastTool && (
          <Text dimColor={DONE.has(r.status)}>
            {'  '}최근: {r.lastTool}{r.lastDetail ? ` ${r.lastDetail}` : ''}{r.lastAt ? ` (${dur(t - r.lastAt)} 전)` : ''}
          </Text>
        )}
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Text bold>진행 중 {active.length}</Text>
        {active.length === 0 && <Text dimColor>지금 실행 중인 에이전트가 없어요.</Text>}
        {active.map(row)}
        {finished.length > 0 && <Text bold>최근 끝남</Text>}
        {finished.map(row)}
      </Box>
    )
  })
}
