# agent-board

Claude Code 모드 — 실행 중인 서브에이전트 목록(무엇을, 어디까지, 최근 도구 호출).

- **프롬프트 위 줄**: 다른 플러그인 줄(token-weather-usage · ponytail 등) 맨 아래에 「에이전트 진행 N」과 진행 중 최대 3개를 한 줄씩 보여 줘요. 패널을 띄우지 못하는 화면(VS Code 등)에서도 보여요.
- **패널**: `/agent-board` — 진행 중 전부와 최근 끝난 5개를 자세히.
- 업데이트: `/plugin update agent-board` (0.2.0 부터 프롬프트 위 줄)

## 설치

터미널 세션의 프롬프트에서:

```
/plugin install agent-board --marketplace YoungChulMoon/agent-board
```

`Add marketplace?` 에 `y`, 범위(scope)를 고르면 바로 켜져요.

셸에서:

```
claude plugin install agent-board --marketplace YoungChulMoon/agent-board
```

데스크톱 앱(`/plugin` 이 안 될 때): 프롬프트 옆 **+** → **Plugins** → **Add marketplace** 에 `YoungChulMoon/agent-board` → **Add plugin**.
