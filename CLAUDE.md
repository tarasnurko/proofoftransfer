# Skill Usage - MANDATORY

## Before ANY response, check skills AND agents

1. **Read system-reminder** - lists available agents for Task tool
2. **Check skills list** - shown at session start
3. **Agents use Task tool** with `subagent_type="agent-name"`
4. **Skills use Skill tool** with `skill="skill-name"`

### Agent vs Skill Decision

```
User request matches something in system-reminder "Available agents"?
├─ YES → Task tool with subagent_type
│  Examples: commit-msg, architect, reviewer, explore
│
└─ NO → Check skills list
   └─ Match found → Skill tool
      Examples: /plan, /evolve, /feature-dev
```

### Common Agents (Task tool)

- `commit-msg` - generate commit messages
- `architect` - design architecture
- `reviewer` - code review
- `explore` - codebase analysis
- `developer` - TDD implementation

### Common Skills (Skill tool)

- `/plan` - implementation planning
- `/evolve` - improve toolkit from corrections
- `/feature-dev` - feature implementation workflow

## Rule

1. ALWAYS read system-reminder for available agents
2. DO NOT try Skill tool for agents - it will fail
3. DO NOT start work without checking if skill/agent applies
4. Invoke, don't just mention
