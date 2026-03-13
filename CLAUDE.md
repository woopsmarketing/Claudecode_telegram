# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a Claude Code framework configuration package — a curated collection of specialized agents, reusable skills, and scripts for Next.js/React development. It is not a buildable application.

## Structure

```
.claude/
├── agents/          # 23 specialized agent definitions (Markdown)
├── skills/          # 6 reusable skill packages
│   ├── vercel-react-best-practices/
│   ├── skill-creator/
│   ├── hook-creator/
│   ├── slash-command-creator/
│   ├── subagent-creator/
│   └── youtube-collector/
├── scripts/         # Python/Bash automation scripts
└── settings.local.json
```

## Scripts (inside `.claude/scripts/`)

```bash
# Create a new skill scaffold
python scripts/init_skill.py <skill-name> --path <output-directory>

# Package a skill folder into a .skill file
python scripts/package_skill.py <path/to/skill-folder>

# Create a new slash command
python scripts/init_command.py <command-name> [--scope project|personal]

# Configure YouTube API key (for youtube-collector skill)
python scripts/setup_api_key.py [--api-key KEY | --show]
```

## Agent Architecture

Agents are Markdown files in `.claude/agents/` that follow a consistent pattern:
- **Frontmatter**: `name`, `description`, `tools` fields
- **Role & Expertise**: Domain-specific instructions
- **Task patterns**: Step-by-step workflows for common scenarios
- Most agent documentation is written in Korean

## Skill Architecture

Each skill in `.claude/skills/<name>/` contains:
- `SKILL.md` — Primary skill manifest with the `<skill-name>` XML tag triggers
- `HOOKS.md` (optional) — Pre/post execution hooks
- Python scripts (optional, e.g., youtube-collector)

Skills are triggered by their XML tag in user messages (e.g., `<vercel-react-best-practices>`).

## Permissions

`settings.local.json` sets `defaultMode: "bypassPermissions"` with `Bash(*)` allowed — all tool calls run without prompting.

## Focus Domain

All agents and skills target the **Next.js / React / TypeScript / Tailwind CSS / Vercel** stack. The `vercel-react-best-practices` skill encodes 58 performance rules across bundle optimization, async patterns, rendering strategies, and server/client component boundaries.
