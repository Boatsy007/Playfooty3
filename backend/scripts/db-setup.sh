#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CNCA Rankings — Database Setup Script
# Run this once after filling in backend/.env with your Supabase credentials.
#
# Usage:  cd backend && bash scripts/db-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        CNCA Rankings — Database Initialisation           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Load .env ─────────────────────────────────────────────────────────────
ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "       Copy .env.example → .env and fill in your Supabase credentials."
  exit 1
fi

# Export vars from .env (skip comments and blank lines)
set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

# ── 2. Validate required vars ─────────────────────────────────────────────────
MISSING=()
[ -z "${DATABASE_URL:-}" ] && MISSING+=("DATABASE_URL")
[ -z "${DIRECT_URL:-}"   ] && MISSING+=("DIRECT_URL")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: The following required variables are not set in .env:"
  for v in "${MISSING[@]}"; do
    echo "       • $v"
  done
  echo ""
  echo "Fill them in at: backend/.env"
  echo "Find the values at: Supabase Dashboard → Project Settings → Database → Connection string"
  exit 1
fi

echo "✓ Environment variables loaded"

# ── 3. Install dependencies ───────────────────────────────────────────────────
echo ""
echo "── Installing dependencies ──────────────────────────────────"
cd "$BACKEND_DIR"
npm ci --silent
echo "✓ Dependencies installed"

# ── 4. Generate Prisma client ─────────────────────────────────────────────────
echo ""
echo "── Generating Prisma client ─────────────────────────────────"
npx prisma generate
echo "✓ Prisma client generated"

# ── 5. Create + apply migration ───────────────────────────────────────────────
echo ""
echo "── Applying database migrations ─────────────────────────────"
MIGRATIONS_DIR="$BACKEND_DIR/prisma/migrations"

if [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "  No migrations found — creating initial migration..."
  npx prisma migrate dev --name init --skip-seed
else
  echo "  Existing migrations found — deploying..."
  npx prisma migrate deploy
fi

echo "✓ Migrations applied"

# ── 6. Verify tables ─────────────────────────────────────────────────────────
echo ""
echo "── Verifying tables ─────────────────────────────────────────"

TABLES=$(npx prisma db execute --stdin <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
SQL
)

if [ -z "$TABLES" ]; then
  echo "ERROR: No tables found in the public schema after migration."
  echo "       Check that DATABASE_URL points to the correct Supabase project."
  exit 1
fi

echo ""
echo "Tables created in Supabase (public schema):"
echo "─────────────────────────────────────────────"
echo "$TABLES"
echo ""

TABLE_COUNT=$(echo "$TABLES" | grep -c '|' || true)
echo "✓ $TABLE_COUNT tables verified"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Database setup complete. Your backend is ready.         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  • Set DATABASE_URL, DIRECT_URL, ADMIN_API_KEY as GitHub Secrets"
echo "    for the weekly GitHub Actions cron to work."
echo "  • Deploy the API to Vercel with the same env vars."
echo "  • Trigger a manual ranking update: POST /admin/trigger"
echo ""
