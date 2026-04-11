# cc-permission

Claude Code の権限プロンプトを、設定ベースのパターンマッチで自動制御するツール。

## 背景

Claude Code は `WebFetch` や `Bash` などのツール実行時にユーザーへ許可を求める。
例えば `https://github.com/shoppingjaws/some-repo` への Fetch が発生するたびに毎回確認が必要になる。

`github.com/shoppingjaws/` 配下のURLはすべて許可する、といったパターンベースの自動制御を実現したい。

## 仕組み

Claude Code の [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) 機能を利用する。

- `PreToolUse` フックとして動作
- フックはツール呼び出しの内容を stdin から JSON で受け取る
- 設定ファイルのルールとマッチングし、結果を stdout に JSON で返す
  - `{"decision": "allow"}` — 許可
  - `{"decision": "deny", "reason": "..."}` — 拒否
  - `{}` — 判定しない（デフォルトの挙動に委ねる）

## 設定ファイル

`$XDG_CONFIG_HOME/cc-permission/`（`XDG_CONFIG_HOME` 未設定時は `~/.config/cc-permission/`）配下に2つのファイルを配置する。

### `config.json5` — 手動設定

templates テンプレートと手動ルールを定義する。

```json5
{
  templates: [
    {
      tool: "WebFetch",
      field: "url",
      match: "https://github.com/{org}/**",
      generate: [
        "https://github.com/{org}/**",
        "https://raw.githubusercontent.com/{org}/**",
      ],
    },
  ],
  rules: [
    // 手動で定義するルール
    {
      tool: "WebFetch",
      match: {
        field: "url",
        pattern: "https://docs.anthropic.com/**",
      },
      action: "allow",
    },
    {
      tool: "WebFetch",
      match: {
        field: "url",
        pattern: "https://evil.example.com/**",
      },
      action: "deny",
      reason: "このドメインへのアクセスは禁止されています",
    },
  ],
}
```

### `permission.json` — 自動学習ルール

templates により自動生成・追加される。手動編集も可能。

```json
{
  "rules": []
}
```

### ルール評価順序

- `config.json5` の rules → `permission.json` の rules の順に評価
- 上から順に評価し、最初にマッチしたルールを適用する
- どのルールにもマッチしない場合は `{}` を返し、Claude Code のデフォルト挙動に委ねる

### テンプレート (templates)

`PostToolUse` フックを利用し、ユーザーが許可したツール呼び出しから自動的にルールを学習する。

- `match`: プレースホルダー付きテンプレート。`{name}` は1つのパスセグメントをキャプチャ
- `generate`: キャプチャした値を使って生成するglobパターンの配列
- 生成されたルールは `permission.json` に自動追加される（重複はスキップ）

例: `https://github.com/xxx/yyy/zzz` への Fetch を許可すると、以下のルールが `permission.json` に自動生成される:
- `https://github.com/xxx/**`
- `https://raw.githubusercontent.com/xxx/**`

## CLI

```
cc-permission hook        # PreToolUse フックとして実行
cc-permission post-hook   # PostToolUse フック（自動学習）として実行
cc-permission init        # 設定ファイルの初期化 & Claude Code hooks への登録
```

### `cc-permission init`

以下を行う:

1. `$XDG_CONFIG_HOME/cc-permission/config.json5` が存在しなければ空のルールで作成
2. Claude Code の設定 (`~/.claude/settings.json`) に PreToolUse / PostToolUse フックを登録:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "command": "cc-permission hook"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "command": "cc-permission post-hook"
      }
    ]
  }
}
```

## フック入力（stdin）

Claude Code から渡される JSON:

```json
{
  "tool_name": "WebFetch",
  "tool_input": {
    "url": "https://github.com/shoppingjaws/cc-permission/blob/main/README.md"
  }
}
```

## パターンマッチ

- glob パターン（`*`, `**`）をサポート
- `*` — パスセグメント内の任意の文字列
- `**` — 任意の深さのパス

## 技術スタック

- Bun (TypeScript)
- 外部依存は最小限にする

## 将来の拡張候補

- ルールの有効期限（TTL）
- プロジェクト単位の設定ファイル（`.claude/cc-permission.json5`）
- ログ出力（どのルールで許可/拒否したか）
