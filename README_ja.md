# safe-webfetch

Claude Code の権限プロンプトを、設定ベースのパターンマッチで自動制御するツール。

## なぜ必要か

Claude Code は外部リソース（URL など）にアクセスするたびに許可プロンプトを表示します。開発中に同じドメインへのアクセスを何度も手動で許可するのは煩わしく、作業の流れが途切れます。

safe-webfetch は Claude Code の [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) 機能を利用して、**事前に定義したルールに基づいて自動で allow を返す**ことで、この問題を解決します。

さらに **テンプレート学習** 機能により、一度許可した URL のドメインやパッケージ名を自動で学習し、同じパターンへのアクセスを次回以降は自動許可します。

## 仕組み

```
PreToolUse hook   → ルール照合 → allow / pass（該当なし）
PostToolUse hook  → テンプレート学習 → 新ルールを permission.json に追記
```

- **PreToolUse**: `config.json5` の手動ルールと `permission.json` の自動ルールを順に評価し、マッチすれば allow を返します。マッチしなければ Claude Code の通常の権限プロンプトが表示されます。
- **PostToolUse**: テンプレート定義に基づき、許可された URL からパターンを抽出して新しいルールを自動生成します。

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/shoppingjaws/safe-webfetch.git
cd safe-webfetch

# 依存関係のインストール
bun install

# ビルド（任意: コンパイル済みバイナリを生成）
bun run build   # → dist/safe-webfetch

# PATH の通った場所にリンクまたはコピー
bun link
# または
cp dist/safe-webfetch ~/.local/bin/
```

## セットアップ

```bash
safe-webfetch init
```

このコマンドは以下を行います:

1. `$XDG_CONFIG_HOME/safe-webfetch/config.json5` にデフォルト設定を作成
2. `~/.claude/settings.json` に PreToolUse / PostToolUse hooks を登録

## 設定

設定ファイルは `$XDG_CONFIG_HOME/safe-webfetch/`（デフォルト: `~/.config/safe-webfetch/`）に配置されます。

### config.json5 — 手動ルールとテンプレート

```json5
{
  // 手動ルール: glob パターンでマッチング（マッチした URL は自動許可）
  rules: [
    "https://docs.example.com/**",
  ],

  // テンプレート: PostToolUse で自動学習に使用
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

### permission.json — 自動生成ルール

PostToolUse hook がテンプレートに基づいて自動生成するファイルです。手動で編集する必要はありません。

```json
{
  "rules": [
    "https://github.com/anthropics/**",
    "https://raw.githubusercontent.com/anthropics/**"
  ]
}
```

## パターン記法

ルールのパターンは glob 形式です:

| パターン | 意味 |
|---------|------|
| `*` | `/` 以外の任意の文字列にマッチ |
| `**` | `/` を含む任意の文字列にマッチ（ディレクトリを跨ぐ） |
| `?` | `/` 以外の任意の1文字にマッチ |

テンプレートの `{placeholder}` はパスの1セグメント（`/` を含まない文字列）をキャプチャし、`generate` パターンに展開されます。

## ルール評価順序

1. `config.json5` の `rules`（手動定義）
2. `permission.json` の `rules`（自動生成）

ルールにマッチすれば自動許可されます。どのルールにもマッチしない場合は Claude Code の通常の権限プロンプトが表示されます。

## デフォルトテンプレート

`safe-webfetch init` で生成されるデフォルト設定には、以下のサイト向けテンプレートが含まれます:

- **GitHub** — `github.com/{org}/**` + `raw.githubusercontent.com/{org}/**`
- **docs.\* サイト** — `docs.{domain}/**`（AWS, Datadog, GCP などのドキュメント）
- **npm** — `npmjs.com/package/{pkg}/**` + `registry.npmjs.org/{pkg}/**`
- **npm (scoped)** — `npmjs.com/package/@{scope}/{pkg}/**`
- **PyPI** — `pypi.org/project/{pkg}/**`
- **crates.io** — `crates.io/crates/{crate}/**` + `docs.rs/{crate}/**`
- **pkg.go.dev** — `pkg.go.dev/{module}/**`

## コマンド

| コマンド | 説明 |
|---------|------|
| `safe-webfetch init` | 設定ファイル作成 + hooks 登録 |
| `safe-webfetch hook` | PreToolUse hook（stdin からツール入力を受け取り判定） |
| `safe-webfetch post-hook` | PostToolUse hook（テンプレート学習） |
| `safe-webfetch log show [-n N]` | ログ表示（直近 N 行） |

## 開発

```bash
bun test              # テスト実行
bun run typecheck     # 型チェック
bun run lint:check    # lint
bun run format:check  # フォーマットチェック
bun run format        # フォーマット適用
bun run build         # コンパイル
```

## ライセンス

MIT
