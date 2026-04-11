# safe-webfetch

Rule-based auto-control for Claude Code permission prompts via pattern matching.

[日本語](README_ja.md)

## Why

Claude Code shows a permission prompt every time it accesses an external resource (URLs, etc.). Manually approving the same domains over and over interrupts your flow.

safe-webfetch uses Claude Code's [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to **automatically allow or deny based on predefined rules**, eliminating repetitive prompts.

It also features **template learning** — once you approve a URL, the tool extracts the domain or package name and auto-generates rules so future requests to the same pattern are allowed automatically.

## How it works

```
PreToolUse hook   → match rules → allow / pass (no match)
PostToolUse hook  → template learning → append new rules to permission.json
```

- **PreToolUse**: Evaluates rules from `config.json5` (manual) then `permission.json` (auto-generated). If a rule matches, the request is allowed. If no rule matches, Claude Code shows its normal permission prompt.
- **PostToolUse**: Extracts placeholders from approved URLs using template definitions and generates new allow rules.

## Installation

```bash
git clone https://github.com/shoppingjaws/safe-webfetch.git
cd safe-webfetch
bun install

# Build a standalone binary (optional)
bun run build   # → dist/safe-webfetch

# Make it available on PATH
bun link
# or
cp dist/safe-webfetch ~/.local/bin/
```

## Setup

```bash
safe-webfetch init
```

This will:

1. Create `$XDG_CONFIG_HOME/safe-webfetch/config.json5` with default templates
2. Register PreToolUse / PostToolUse hooks in `~/.claude/settings.json`

## Configuration

Config files live in `$XDG_CONFIG_HOME/safe-webfetch/` (defaults to `~/.config/safe-webfetch/`).

### config.json5 — Manual rules and templates

```json5
{
  // Manual rules: glob pattern matching (matched URLs are auto-allowed)
  rules: [
    "https://docs.example.com/**",
  ],

  // Templates: used for auto-learning in PostToolUse
  templates: [
    {
      match: "https://github.com/{org}/**",
      generate: [
        "https://github.com/{org}/**",
        "https://raw.githubusercontent.com/{org}/**",
      ],
    },
  ],
}
```

### permission.json — Auto-generated rules

Generated automatically by the PostToolUse hook based on templates. No manual editing required.

```json
{
  "rules": [
    "https://github.com/anthropics/**",
    "https://raw.githubusercontent.com/anthropics/**"
  ]
}
```

## Pattern syntax

Rule patterns use glob syntax:

| Pattern | Meaning |
|---------|---------|
| `*` | Matches any string except `/` |
| `**` | Matches any string including `/` (crosses directories) |
| `?` | Matches any single character except `/` |

Template `{placeholder}` captures a single path segment (no `/`) and expands it into `generate` patterns.

## Rule evaluation order

1. `config.json5` `rules` (manual)
2. `permission.json` `rules` (auto-generated)

If a rule matches, the request is allowed. If no rule matches, Claude Code shows its normal permission prompt.

## Default templates

`safe-webfetch init` generates templates for:

- **GitHub** — `github.com/{org}/**` + `raw.githubusercontent.com/{org}/**`
- **docs.\* sites** — `docs.{domain}/**` (AWS, Datadog, GCP, etc.)
- **npm** — `npmjs.com/package/{pkg}/**` + `registry.npmjs.org/{pkg}/**`
- **npm (scoped)** — `npmjs.com/package/@{scope}/{pkg}/**`
- **PyPI** — `pypi.org/project/{pkg}/**`
- **crates.io** — `crates.io/crates/{crate}/**` + `docs.rs/{crate}/**`
- **pkg.go.dev** — `pkg.go.dev/{module}/**`

## Commands

| Command | Description |
|---------|-------------|
| `safe-webfetch init` | Create config + register hooks |
| `safe-webfetch hook` | PreToolUse hook (reads tool input from stdin) |
| `safe-webfetch post-hook` | PostToolUse hook (template learning) |
| `safe-webfetch log show [-n N]` | Show recent log entries |

## Development

```bash
bun test              # Run tests
bun run typecheck     # Type check
bun run lint:check    # Lint
bun run format:check  # Format check
bun run format        # Apply formatting
bun run build         # Compile
```

## License

MIT
