#!/bin/bash
# =============================================================================
# Deploy Network Operations Center Demo to Cloud Run
#
# Usage:
#   ./deploy/deploy-network-ops.sh
#
# Prerequisites:
#   gcloud auth login && gcloud auth configure-docker us-central1-docker.pkg.dev
# =============================================================================

set -e

# ── Configuration ─────────────────────────────────────────────────────────────

PROJECT_ID="${GCP_PROJECT_ID:-elastic-sa}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-mnb-noc-demo}"
BASE_PATH="${BASE_PATH:-/noc/}"
REPO="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy"

# Load credentials from backend/.env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/backend/.env"

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-}"
ELASTIC_API_KEY="${ELASTIC_API_KEY:-}"
KIBANA_URL="${KIBANA_URL:-}"
AGENT_ID="${AGENT_ID:-}"

# ── Validation ────────────────────────────────────────────────────────────────

echo "=========================================="
echo "  Network Operations Center Demo Deploy"
echo "  Service: $SERVICE_NAME"
echo "  Path:    $BASE_PATH"
echo "  Project: $PROJECT_ID  Region: $REGION"
echo "=========================================="

missing=()
[ -z "$ELASTICSEARCH_URL" ] && missing+=("ELASTICSEARCH_URL")
[ -z "$ELASTIC_API_KEY" ]   && missing+=("ELASTIC_API_KEY")
[ -z "$KIBANA_URL" ]        && missing+=("KIBANA_URL")
[ -z "$AGENT_ID" ]          && missing+=("AGENT_ID")

if [ ${#missing[@]} -gt 0 ]; then
    echo "❌ Missing in backend/.env:"
    for v in "${missing[@]}"; do echo "   - $v"; done
    exit 1
fi

TAG=$(date +%Y%m%d-%H%M%S)
API_URL_PREFIX="${BASE_PATH%/}"   # strip trailing slash for VITE_API_URL

echo ""
echo "  Tag: $TAG"
echo "  ES:  ${ELASTICSEARCH_URL:0:50}..."
echo ""

# ── Build Docker images ───────────────────────────────────────────────────────

cd "$ROOT_DIR"

echo ">>> [1/2] Building frontend (nginx)..."
docker build \
    -f deploy/Dockerfile.nginx \
    --platform linux/amd64 \
    --build-arg VITE_BASE_PATH="${BASE_PATH}" \
    --build-arg VITE_OTEL_ENDPOINT="${BASE_PATH}v1/traces" \
    --build-arg VITE_API_URL="${API_URL_PREFIX}" \
    -t "${REPO}/${SERVICE_NAME}-nginx:${TAG}" \
    .

echo ">>> [2/2] Building backend (fastapi)..."
docker build \
    -f deploy/Dockerfile.fastapi \
    --platform linux/amd64 \
    -t "${REPO}/${SERVICE_NAME}-fastapi:${TAG}" \
    .

# ── Push to Artifact Registry ─────────────────────────────────────────────────

echo ""
echo ">>> Pushing images..."
docker push "${REPO}/${SERVICE_NAME}-nginx:${TAG}"
docker push "${REPO}/${SERVICE_NAME}-fastapi:${TAG}"

# ── Generate service.yaml ─────────────────────────────────────────────────────

echo ""
echo ">>> Generating Cloud Run service config..."

SERVICE_YAML=$(mktemp /tmp/service-noc-XXXX.yaml)

sed \
    -e "s|YOUR_SERVICE_NAME|${SERVICE_NAME}|g" \
    -e "s|YOUR_PROJECT_ID|${PROJECT_ID}|g" \
    -e "s|YOUR_TEAM|search-specialist|g" \
    -e "s|YOUR_EMAIL|mark-bernard|g" \
    -e "s|YOUR_PROJECT|${SERVICE_NAME}|g" \
    -e "s|${SERVICE_NAME}-nginx:PLACEHOLDER|${SERVICE_NAME}-nginx:${TAG}|g" \
    -e "s|${SERVICE_NAME}-fastapi:PLACEHOLDER|${SERVICE_NAME}-fastapi:${TAG}|g" \
    -e "s|${SERVICE_NAME}-otel:PLACEHOLDER|${SERVICE_NAME}-otel:${TAG}|g" \
    -e "s|ELASTICSEARCH_URL_PLACEHOLDER|${ELASTICSEARCH_URL}|g" \
    -e "s|ELASTIC_API_KEY_PLACEHOLDER|${ELASTIC_API_KEY}|g" \
    -e "s|KIBANA_URL_PLACEHOLDER|${KIBANA_URL}|g" \
    -e "s|AGENT_ID_PLACEHOLDER|${AGENT_ID}|g" \
    -e "s|MONITORING_ELASTICSEARCH_URL_PLACEHOLDER|${ELASTICSEARCH_URL}|g" \
    -e "s|MONITORING_ELASTIC_API_KEY_PLACEHOLDER|${ELASTIC_API_KEY}|g" \
    -e "s|OTEL_ENDPOINT_PLACEHOLDER||g" \
    -e "s|APM_TOKEN_PLACEHOLDER||g" \
    deploy/service.yaml > "$SERVICE_YAML"

echo "  Written: $SERVICE_YAML"

# ── Deploy ────────────────────────────────────────────────────────────────────

echo ""
echo ">>> Deploying to Cloud Run..."

gcloud run services replace "$SERVICE_YAML" \
    --region="${REGION}" \
    --project="${PROJECT_ID}"

rm -f "$SERVICE_YAML"

# ── Re-apply env vars (gcloud run services replace resets them) ───────────────
# KIBANA_URL and AGENT_ID are required for Agent Builder and Workflows.
# services replace always overwrites envs from the YAML — re-apply them here.

echo ""
echo ">>> Re-applying credentials to fastapi container..."

FASTAPI_ENV=$(mktemp /tmp/fastapi-env-XXXX.yaml)
cat > "$FASTAPI_ENV" << ENVYAML
ELASTICSEARCH_URL: "${ELASTICSEARCH_URL}"
ELASTIC_API_KEY: "${ELASTIC_API_KEY}"
KIBANA_URL: "${KIBANA_URL}"
AGENT_ID: "${AGENT_ID}"
OTEL_ENABLED: "false"
ENVYAML

gcloud run services update "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --container=fastapi \
    --env-vars-file="$FASTAPI_ENV"

rm -f "$FASTAPI_ENV"

# ── IAP invoker binding ───────────────────────────────────────────────────────

echo ""
echo ">>> Setting invoker permission (required for load balancer + IAP)..."
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet 2>/dev/null || echo "  (Permission already exists)"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "✅ Deployed!"
echo ""
echo "  URL: https://demos.gcp.elasticsa.co${BASE_PATH}"
echo ""
echo "Next — wire into the load balancer (if not already):"
echo ""
echo "  gcloud compute network-endpoint-groups create ${SERVICE_NAME}-neg \\"
echo "      --region=${REGION} --network-endpoint-type=serverless \\"
echo "      --cloud-run-service=${SERVICE_NAME} --project=${PROJECT_ID}"
echo ""
echo "  gcloud compute backend-services create ${SERVICE_NAME}-backend \\"
echo "      --global --protocol=HTTP --project=${PROJECT_ID}"
echo ""
echo "  gcloud compute backend-services add-backend ${SERVICE_NAME}-backend \\"
echo "      --global --network-endpoint-group=${SERVICE_NAME}-neg \\"
echo "      --network-endpoint-group-region=${REGION} --project=${PROJECT_ID}"
echo ""
echo "  gcloud compute backend-services update ${SERVICE_NAME}-backend \\"
echo "      --global --iap=enabled --project=${PROJECT_ID}"
echo "=========================================="
