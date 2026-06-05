#!/usr/bin/env bash
# Bromog post-create setup
# Runs once when the devcontainer is first created.

set -euo pipefail

echo "──────────────────────────────────────────────"
echo " Bromog — post-create setup"
echo "──────────────────────────────────────────────"

# ── Shell paths ───────────────────────────────────────────────────────
mkdir -p "$HOME/.local/bin"
mkdir -p "$HOME/.local/npm-global/bin"

npm config set prefix "$HOME/.local/npm-global" >/dev/null

if ! grep -q ".local/npm-global/bin" "$HOME/.bashrc" 2>/dev/null; then
  {
    echo ""
    echo "# Bromog devcontainer tools"
    echo "export PATH=\"\$HOME/.local/bin:\$HOME/.local/npm-global/bin:\$PATH\""
    echo "export NPM_CONFIG_PREFIX=\"\$HOME/.local/npm-global\""
  } >> "$HOME/.bashrc"
fi

export PATH="$HOME/.local/bin:$HOME/.local/npm-global/bin:$PATH"
export NPM_CONFIG_PREFIX="$HOME/.local/npm-global"

# ── Python dependencies ───────────────────────────────────────────────
if [ -f "requirements.txt" ]; then
  echo "→ Installing Python dependencies..."
  python -m pip install --upgrade pip --quiet
  pip install -r requirements.txt --quiet
  echo "  ✓ Python dependencies installed"
else
  echo "  ! No requirements.txt found, skipping Python dependency install"
fi

if [ -f "requirements-dev.txt" ]; then
  echo "→ Installing Python dev dependencies..."
  pip install -r requirements-dev.txt --quiet
  echo "  ✓ Python dev dependencies installed"
fi

# ── Codex CLI ─────────────────────────────────────────────────────────
if ! command -v codex >/dev/null 2>&1; then
  echo "→ Installing Codex CLI..."
  npm install -g @openai/codex@latest --include=optional
  echo "  ✓ Codex CLI installed"
else
  echo "  ✓ Codex CLI already available"
fi

# ── Claude CLI ────────────────────────────────────────────────────────
if ! command -v claude >/dev/null 2>&1; then
  echo "→ Installing Claude CLI..."
  curl -fsSL https://claude.ai/install.sh | bash || true
else
  echo "  ✓ Claude CLI already available"
fi

echo ""
echo "──────────────────────────────────────────────"
echo " Versions"
echo "──────────────────────────────────────────────"
python --version
node --version
npm --version
codex --version || true
claude --version || true

echo ""
echo "──────────────────────────────────────────────"
echo " Setup complete. Quick start:"
echo ""
echo "  App:    python app.py"
echo "  Claude: claude"
echo "  Codex:  codex"
echo "──────────────────────────────────────────────"