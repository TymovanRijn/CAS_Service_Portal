#!/usr/bin/env bash
set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:-sac.cas-nl.com}"
PROJECT_ROOT="${PROJECT_ROOT:-/home/klaas/CAS_Service_Portal}"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

DEPLOY_BACKEND_DIR="${DEPLOY_BACKEND_DIR:-/var/www/cas-api}"
DEPLOY_FRONTEND_DIR="${DEPLOY_FRONTEND_DIR:-/var/www/html/sac}"
SERVICE_NAME="${SERVICE_NAME:-cas-service-portal.service}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-apache2}"

timestamp="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="/var/www/backups/cas"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

ensure_env_value() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "${BACKEND_DIR}/.env" | sed -E "s/^${key}=//" || true)"

  if [ -z "$value" ]; then
    echo "Missing required env value: ${key}"
    exit 1
  fi
}

reject_placeholder_env() {
  local key="$1"
  local bad="$2"
  local value
  value="$(grep -E "^${key}=" "${BACKEND_DIR}/.env" | sed -E "s/^${key}=//" || true)"

  if [ "$value" = "$bad" ]; then
    echo "Refusing deploy: ${key} is still placeholder value '${bad}'"
    echo "Edit ${BACKEND_DIR}/.env first."
    exit 1
  fi
}

HAS_RSYNC=0
if command -v rsync >/dev/null 2>&1; then
  HAS_RSYNC=1
fi

sync_copy() {
  local src="$1"
  local dst="$2"
  shift 2
  local excludes=("$@")

  if [ "$HAS_RSYNC" -eq 1 ]; then
    local rsync_args=(-a --delete)
    local pattern
    for pattern in "${excludes[@]}"; do
      rsync_args+=(--exclude "$pattern")
    done
    sudo rsync "${rsync_args[@]}" "$src" "$dst"
    return
  fi

  # Fallback when rsync is unavailable:
  # 1) remove current target contents
  # 2) copy new files while honoring exclude patterns
  sudo mkdir -p "$dst"
  sudo find "$dst" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

  if [ "${#excludes[@]}" -eq 0 ]; then
    sudo cp -a "${src%/}/." "$dst"
    return
  fi

  local tar_excludes=()
  local ex
  for ex in "${excludes[@]}"; do
    tar_excludes+=(--exclude="$ex")
  done

  (cd "${src%/}" && tar "${tar_excludes[@]}" -cf - .) | sudo tar -xf - -C "$dst"
}

echo "==> Validating required commands"
for cmd in node npm curl sudo tar find; do
  require_command "$cmd"
done

if [ "$HAS_RSYNC" -eq 1 ]; then
  echo "==> Using rsync for sync operations"
else
  echo "==> rsync not found, using tar/cp fallback sync"
fi

echo "==> Checking project directories"
for dir in "$PROJECT_ROOT" "$BACKEND_DIR" "$FRONTEND_DIR"; do
  if [ ! -d "$dir" ]; then
    echo "Directory not found: $dir"
    exit 1
  fi
done

if [ ! -f "${BACKEND_DIR}/.env" ]; then
  echo "Missing ${BACKEND_DIR}/.env"
  echo "Create it first: cp ${BACKEND_DIR}/.env.example ${BACKEND_DIR}/.env"
  exit 1
fi

if [ ! -f "${FRONTEND_DIR}/.env.production" ]; then
  echo "Missing ${FRONTEND_DIR}/.env.production"
  echo "Create it first with: REACT_APP_BACKEND_URL=https://${APP_DOMAIN}"
  exit 1
fi

echo "==> Validating backend env values"
ensure_env_value "JWT_SECRET"
ensure_env_value "DB_HOST"
ensure_env_value "DB_PORT"
ensure_env_value "DB_NAME"
ensure_env_value "DB_USER"
ensure_env_value "DB_PASSWORD"
reject_placeholder_env "JWT_SECRET" "replace_with_a_long_random_secret"
reject_placeholder_env "DB_PASSWORD" "replace_with_db_password"

echo "==> Building frontend production assets"
npm --prefix "$FRONTEND_DIR" install
npm --prefix "$FRONTEND_DIR" run build

if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "==> Deploying from git $(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?') ($(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?'))"
  if ! git -C "$PROJECT_ROOT" diff-index --quiet HEAD -- 2>/dev/null; then
    echo "WARNING: project has uncommitted changes; build uses working tree as-is (not last commit only)."
  fi
fi
echo "==> Frontend build fingerprint (verify after deploy)"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${FRONTEND_DIR}/build/index.html" "${FRONTEND_DIR}/build/sw.js" "${FRONTEND_DIR}/build/manifest.json" 2>/dev/null || true
else
  wc -c "${FRONTEND_DIR}/build/index.html" "${FRONTEND_DIR}/build/sw.js" "${FRONTEND_DIR}/build/manifest.json" 2>/dev/null || true
fi

echo "==> Installing backend dependencies"
npm --prefix "$BACKEND_DIR" install --omit=dev

echo "==> Creating backup folders"
sudo mkdir -p "$BACKUP_ROOT/frontend" "$BACKUP_ROOT/backend"

echo "==> Backing up current live deployment"
if [ -d "$DEPLOY_FRONTEND_DIR" ]; then
  sudo mkdir -p "${BACKUP_ROOT}/frontend/${timestamp}"
  if [ "$HAS_RSYNC" -eq 1 ]; then
    sudo rsync -a "$DEPLOY_FRONTEND_DIR/" "${BACKUP_ROOT}/frontend/${timestamp}/"
  else
    sudo cp -a "${DEPLOY_FRONTEND_DIR%/}/." "${BACKUP_ROOT}/frontend/${timestamp}/"
  fi
fi
if [ -d "$DEPLOY_BACKEND_DIR" ]; then
  sudo mkdir -p "${BACKUP_ROOT}/backend/${timestamp}"
  if [ "$HAS_RSYNC" -eq 1 ]; then
    sudo rsync -a "$DEPLOY_BACKEND_DIR/" "${BACKUP_ROOT}/backend/${timestamp}/"
  else
    sudo cp -a "${DEPLOY_BACKEND_DIR%/}/." "${BACKUP_ROOT}/backend/${timestamp}/"
  fi
fi

echo "==> Deploying frontend"
sudo mkdir -p "$DEPLOY_FRONTEND_DIR"
sync_copy "${FRONTEND_DIR}/build/" "${DEPLOY_FRONTEND_DIR}/"

echo "==> Deploying backend"
sudo mkdir -p "$DEPLOY_BACKEND_DIR"
sync_copy "${BACKEND_DIR}/" "${DEPLOY_BACKEND_DIR}/" "node_modules" "uploads" ".env"

echo "==> Installing backend runtime dependencies in live directory"
sudo npm --prefix "$DEPLOY_BACKEND_DIR" install --omit=dev

echo "==> Copying backend runtime env"
sudo cp "${BACKEND_DIR}/.env" "${DEPLOY_BACKEND_DIR}/.env"

echo "==> Setting ownership"
sudo chown -R www-data:www-data "$DEPLOY_FRONTEND_DIR" "$DEPLOY_BACKEND_DIR"

echo "==> Restarting services"
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl restart "$WEB_SERVICE_NAME"

echo "==> Running production checks"
curl -fsS "https://${APP_DOMAIN}/" >/dev/null
curl -fsS "https://${APP_DOMAIN}/api/" >/dev/null || true
sudo systemctl --no-pager --full status "$SERVICE_NAME" | sed -n '1,20p'

echo "Deployment finished."
echo "Frontend: https://${APP_DOMAIN}"
echo "API:      https://${APP_DOMAIN}/api/"
echo "Backups:  ${BACKUP_ROOT}/frontend/${timestamp} and ${BACKUP_ROOT}/backend/${timestamp}"
