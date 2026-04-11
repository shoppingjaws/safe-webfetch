# cc-permission

Rule-based auto-control for Claude Code permission prompts via pattern matching.

[日本語](README_ja.md)

## Why

Claude Code shows a permission prompt every time it accesses an external resource (URLs, etc.). Manually approving the same domains over and over interrupts your flow.

cc-permission uses Claude Code's [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to **automatically allow or deny based on predefined rules**, eliminating repetitive prompts.

It also features **template learning** — once you approve a URL, the tool extracts the domain or package name and auto-generates rules so future requests to the same pattern are allowed automatically.

## How it works

```
PreToolUse hook   → match rules → allow / deny / pass (no match)
PostToolUse hook  → template learning → append new rules to permission.json
```

- **PreToolUse**: Evaluates rules from `config.json5` (manual) then `permission.json` (auto-generated). The first matching rule wins.
- **PostToolUse**: Extracts placeholders from approved URLs using template definitions and generates new allow rules.

## Installation

```bash
git clone https://github.com/shoppingjaws/cc-permission.git
cd cc-permission
bun install

# Build a standalone binary (optional)
bun run build   # → dist/cc-permission

# Make it available on PATH
bun link
# or
cp dist/cc-permission ~/.local/bin/
```

## Setup

```bash
cc-permission init
```

This will:

1. Create `$XDG_CONFIG_HOME/cc-permission/config.json5` with default templates
2. Register PreToolUse / PostToolUse hooks in `~/.claude/settings.json`

## Configuration

Config files live in `$XDG_CONFIG_HOME/cc-permission/` (defaults to `~/.config/cc-permission/`).

### config.json5 — Manual rules and templates

```json5
{
  // Manual rules: glob pattern matching
  rules: [
    { pattern: "https://docs.example.com/**", action: "allow" },
    { pattern: "https://malicious.example.com/**", action: "deny", reason: "blocked" },
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

First match wins. If no rule matches, Claude Code shows its normal permission prompt.

## Default templates

`cc-permission init` generates templates for:

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
| `cc-permission init` | Create config + register hooks |
| `cc-permission hook` | PreToolUse hook (reads tool input from stdin) |
| `cc-permission post-hook` | PostToolUse hook (template learning) |
| `cc-permission log show [-n N]` | Show recent log entries |

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
