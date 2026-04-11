# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

Claude Code の権限プロンプトを設定ベースのパターンマッチで自動制御するツール。PreToolUse/PostToolUse hooks として動作する。

## Commands

```bash
bun test                  # integration tests (Bun subprocess で CLI を実行)
bun run typecheck         # tsc --noEmit
bun run lint:check        # biome lint
bun run format:check      # biome format check
bun run format            # biome format --write
bun run build             # compile to dist/safe-fetch
```

`bun run test` でローカル実行

## Architecture

```
cli.ts  ─┬─  hook      → hook.ts (runHook)      → PreToolUse: ルールマッチング → allow/deny/pass
          ├─  post-hook → hook.ts (runPostHook)  → PostToolUse: テンプレート学習 → permission.json に追記
          └─  init      → init.ts                → config初期化 + ~/.claude/settings.json にhook登録
```

### 設定ファイル (2ファイル構成)

`$XDG_CONFIG_HOME/safe-fetch/` 配下:

- **config.json5** — 手動定義のルール (`rules`) + テンプレート (`templates`)
- **permission.json** — PostToolUse で自動生成されるルール

PreToolUse 評価順: config.rules → permission.rules (先にマッチした方が勝つ)

### コアモジュール

- **config.ts** — Config/Rule/Template 型定義、ファイル読み書き、`loadAllRules()` で両ファイルをマージ
- **matcher.ts** — glob パターン (`*`, `**`) を正規表現に変換してマッチング
- **learn.ts** — テンプレートの `{placeholder}` を正規表現の名前付きキャプチャで抽出し、generate パターンに展開。既存ルールとの重複チェック付き

### テスト

`src/test-helpers.ts` に `createTestContext()` があり、一時ディレクトリに XDG_CONFIG_HOME を向けて `Bun.spawn` で CLI プロセスを実行する。テストは `src/integration.test.ts` に集約。
