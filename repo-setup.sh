#!/bin/bash
set -euo pipefail

# リポジトリシークレットの設定
# op referenceは適宜埋めてください
gh secret set GHAPP_REPO_FILE_SYNC_APP_ID --body "$(op read 'op://Dev/github-shoppingjaws/GHAPP_REPO_FILE_SYNC_APP_ID')"
gh secret set GHAPP_REPO_FILE_SYNC_PRIVATE_KEY --body "$(op read 'op://Dev/github-shoppingjaws/GHAPP_REPO_FILE_SYNC_PRIVATE_KEY')"

gh variable set NPM_REGISTORY_NAME --body $NPM_REGISTORY_NAME

# release環境の作成（mainブランチのみアクセス可）
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
gh api --method PUT "repos/${REPO}/environments/release" \
  --field "deployment_branch_policy[protected_branches]=false" \
  --field "deployment_branch_policy[custom_branch_policies]=true"
gh api --method POST "repos/${REPO}/environments/release/deployment-branch-policies" \
  --field "name=main" --field "type=branch"

# GitHub Actionsによるプルリクエスト作成・承認を許可
gh api --method PUT "repos/${REPO}/actions/permissions/workflow" \
  --field "can_approve_pull_request_reviews=true" \
  --field "default_workflow_permissions=write"
