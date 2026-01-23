# Deployment Guide

> Deploy your application to Google Cloud Run with IAP (Identity-Aware Proxy) protection.

---

## 🔒 SECURITY: Always Use IAP Authentication

**Demos must NEVER be deployed with public access.**

- ❌ Never use `--allow-unauthenticated`
- ❌ Never use `--ingress=all` for production
- ❌ Never add `allUsers` to IAM bindings
- ✅ Always use IAP with `domain:elastic.co` access

IAP (Identity-Aware Proxy) provides:
- Google OAuth authentication before accessing the app
- Automatic user identity passed to your app via headers
- Audit logging of all access
- No code changes required in your app

**The deployment script automatically sets `ingress: internal-and-cloud-load-balancing`** which blocks direct access. You MUST set up IAP to access the deployed service.

---

## ⚠️ IMPORTANT: Use Sidecars, Not All-in-One

**Always use the sidecar deployment approach for Cloud Run.**

The all-in-one approach (single container with supervisor) has reliability issues:
- FastAPI may fail to start silently
- Supervisor reports success even when processes crash
- Debugging is much harder

The sidecar approach is:
- ✅ Battle-tested (used by search-otel-ubi and other production demos)
- ✅ Easier to debug (each container has separate logs)
- ✅ Includes OTel collector for full observability
- ✅ Better resource allocation per container

**TL;DR: Run `./deploy/deploy-cloudrun.sh` - don't use `cloudbuild.yaml`**

---

## Quick Start

### Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** running locally
4. **Elastic Cloud** credentials (ELASTICSEARCH_URL, ELASTIC_API_KEY)

### Set Up GCP

```bash
# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com

# Create Artifact Registry repo (one-time)
gcloud artifacts repositories create cloud-run-source-deploy \
    --repository-format=docker \
    --location=us-central1 \
    --description="Cloud Run deployments"
```

---

## Deployment Options

| Option | Containers | Best For |
|--------|------------|----------|
| **All-in-One** | 1 (Nginx + FastAPI) | Quick demos, simple deployments |
| **Sidecars** | 3 (Nginx, FastAPI, OTel) | Production with full observability |

---

## Option 1: All-in-One Deployment

Single container with both frontend and backend.

### Using Cloud Build

```bash
# Deploy with Cloud Build
gcloud builds submit . --config=cloudbuild.yaml \
    --substitutions=\
_SERVICE_NAME=my-demo,\
_BASE_PATH=/demo/,\
_ELASTICSEARCH_URL=https://your-cluster.es.cloud.com,\
_ELASTIC_API_KEY=your-api-key,\
_SEARCH_INDEX=products
```

### Manual Build & Deploy

```bash
# Build locally
docker build -f Dockerfile.cloudrun -t my-demo \
    --build-arg VITE_BASE_PATH=/demo/ \
    --platform linux/amd64 .

# Tag for Artifact Registry
docker tag my-demo us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/my-demo:latest

# Push
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/my-demo:latest

# Deploy
gcloud run deploy my-demo \
    --image us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/my-demo:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --set-env-vars "ELASTICSEARCH_URL=...,ELASTIC_API_KEY=..."
```

---

## Option 2: Sidecar Deployment (Recommended)

Three containers: Nginx (frontend), FastAPI (backend), OTel Collector.

### Using the Deployment Script

```bash
# Set environment variables
export ELASTICSEARCH_URL="https://your-cluster.es.cloud.com"
export ELASTIC_API_KEY="your-api-key"
export SERVICE_NAME="my-demo"
export BASE_PATH="/demo/"

# Optional: For observability
export OTEL_EXPORTER_OTLP_ENDPOINT="https://xxx.apm.us-central1.gcp.cloud.es.io:443"
export ELASTIC_APM_SECRET_TOKEN="your-apm-token"

# Deploy
./deploy/deploy-cloudrun.sh
```

### Using Cloud Build

```bash
gcloud builds submit . --config=cloudbuild-sidecar.yaml \
    --substitutions=\
_SERVICE_NAME=my-demo,\
_BASE_PATH=/demo/,\
_ELASTICSEARCH_URL=https://your-cluster.es.cloud.com,\
_ELASTIC_API_KEY=your-key,\
_OTEL_EXPORTER_OTLP_ENDPOINT=https://xxx.apm.cloud.es.io:443,\
_ELASTIC_APM_SECRET_TOKEN=your-token
```

---

## Adding IAP Protection (REQUIRED)

### Why IAP?

**IAP is REQUIRED for all demos.** It provides:
- Google OAuth authentication - users must sign in
- Automatic domain restriction - only @elastic.co users
- Audit logging - who accessed what and when
- No code changes required - works transparently
- User identity headers - your app knows who's logged in

### ⚠️ CRITICAL: Cloud Run Invoker Permission

**This is counter-intuitive but required:** You must add `allUsers` as a Cloud Run invoker even with IAP.

**Why?** The request flow is:
```
User → Load Balancer (IAP auth here) → Cloud Run
```

- IAP authenticates users at the **Load Balancer**
- The Load Balancer then calls Cloud Run **on behalf of the user**
- Cloud Run needs to accept requests from the Load Balancer
- `ingress: internal-and-cloud-load-balancing` + IAP = secure (direct access is blocked)

**Without this, you get 403 Forbidden even after IAP authentication.**

```bash
# REQUIRED: Allow Load Balancer to invoke Cloud Run
gcloud run services add-iam-policy-binding ${SERVICE_NAME} \
    --region=us-central1 \
    --project=${PROJECT} \
    --member="allUsers" \
    --role="roles/run.invoker"
```

This is NOT a security risk because:
- Direct access to Cloud Run is blocked by `ingress: internal-and-cloud-load-balancing`
- All traffic must go through the Load Balancer, which enforces IAP

### Setup Steps (After `./deploy/deploy-cloudrun.sh`)

After deploying your Cloud Run service, run these commands to set up IAP:

```bash
# Set your service name
SERVICE_NAME="my-demo"
PROJECT="elastic-sa"

# 1. Create Serverless NEG (Network Endpoint Group)
gcloud compute network-endpoint-groups create ${SERVICE_NAME}-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=${SERVICE_NAME} \
    --project=${PROJECT}

# 2. Create Backend Service with IAP enabled
gcloud compute backend-services create ${SERVICE_NAME}-backend \
    --global \
    --protocol=HTTP \
    --timeout=30s \
    --project=${PROJECT}

gcloud compute backend-services add-backend ${SERVICE_NAME}-backend \
    --global \
    --network-endpoint-group=${SERVICE_NAME}-neg \
    --network-endpoint-group-region=us-central1 \
    --project=${PROJECT}

gcloud compute backend-services update ${SERVICE_NAME}-backend \
    --global \
    --iap=enabled \
    --project=${PROJECT}

# 3. Grant access to elastic.co domain (REQUIRED!)
gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=${SERVICE_NAME}-backend \
    --member="domain:elastic.co" \
    --role="roles/iap.httpsResourceAccessor" \
    --project=${PROJECT}

# 4. Add to URL map (for demos.gcp.elasticsa.co)
# Export current config
gcloud compute url-maps export elastic-demos-gateway \
    --destination=/tmp/url-map.yaml \
    --project=${PROJECT}

# Edit /tmp/url-map.yaml to add your path rules:
#   - paths:
#     - /my-demo
#     - /my-demo/*
#     service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/my-demo-backend

# Import updated config
gcloud compute url-maps import elastic-demos-gateway \
    --source=/tmp/url-map.yaml \
    --project=${PROJECT} \
    --quiet
```

### Your Demo URL

After setup, your demo will be available at:
```
https://demos.gcp.elasticsa.co/my-demo/
```

Users will be redirected to Google OAuth, then to your app after authentication.

### Using IAP Headers in Your App

IAP automatically adds user info headers:

```python
# backend/app/routes/example.py
from fastapi import Header, Depends
from typing import Optional

async def get_current_user(
    x_goog_authenticated_user_email: Optional[str] = Header(None)
) -> Optional[str]:
    """Extract user from IAP header."""
    if x_goog_authenticated_user_email:
        # Format: accounts.google.com:user@domain.com
        return x_goog_authenticated_user_email.split(':')[-1]
    return None  # Local dev without IAP

@router.get("/api/whoami")
async def whoami(user: Optional[str] = Depends(get_current_user)):
    return {"user": user or "anonymous (local dev)"}
```

---

## Shared Gateway Pattern

For multiple demos on one domain (cost-effective):

```
https://demos.yourcompany.com/demo1/  → Cloud Run Service 1
https://demos.yourcompany.com/demo2/  → Cloud Run Service 2
https://demos.yourcompany.com/demo3/  → Cloud Run Service 3
```

**Benefits:**
- One Load Balancer (~$18/month) shared across all demos
- Single SSL certificate
- Unified IAP authentication

### ⚠️ CRITICAL: API URL Configuration for Shared Gateway

When deploying to a shared gateway, the **Load Balancer only routes your base path** to your service:

```yaml
# URL Map routes like this:
pathRules:
  - paths: ["/demo1", "/demo1/*"]
    service: demo1-backend
  - paths: ["/demo2", "/demo2/*"]  
    service: demo2-backend
# Default goes to landing page!
```

**Problem:** If your frontend makes API calls to `/api/...`, they DON'T match `/demo1/*` and go to the **default landing page**, which returns HTML instead of JSON!

**Solution:** The deploy script automatically sets `VITE_API_URL` to match your base path:
- `BASE_PATH=/demo1/` → `VITE_API_URL=/demo1`
- API calls go to `/demo1/api/...` → matches `/demo1/*` → correct backend

This is why the deploy script has:
```bash
API_URL_PREFIX="${BASE_PATH%/}"  # /demo1/ → /demo1
--build-arg VITE_API_URL="${API_URL_PREFIX}"
```

**If you see "Unexpected token '<'" errors:** Your API requests are returning HTML from the landing page. Check that `VITE_API_URL` is set correctly during the build.

See `hive-mind/patterns/deployment/CLOUDRUN_SIDECAR_DEPLOYMENT.md` for details.

---

## Customizing Your Deployment

### Base Path

Change the URL path where your app is served:

1. **Update `deploy/nginx-sidecar.conf`**: Replace `/demo/` with your path
2. **Build with correct arg**: `--build-arg VITE_BASE_PATH=/your-path/`
3. **Update Load Balancer URL map** if using path-based routing

### Service Naming

Update `deploy/service.yaml` with your:
- Service name
- Labels (team, owner, project)
- Environment variables

### Resource Allocation

Adjust in `deploy/service.yaml`:
```yaml
resources:
  limits:
    memory: 1Gi    # FastAPI needs at least 1Gi
    cpu: "1"       # 1 vCPU is usually sufficient
```

---

## Debugging

### View Logs

```bash
# Stream logs
gcloud run services logs tail my-demo --region=us-central1

# Read recent logs
gcloud run services logs read my-demo --region=us-central1 --limit=100
```

### Check Service Status

```bash
gcloud run services describe my-demo --region=us-central1
```

### Test Locally

```bash
# Build debug image (FastAPI only)
docker build -f Dockerfile.cloudrun.simple -t debug .

# Run with your credentials
docker run -p 8080:8080 \
    -e ELASTICSEARCH_URL="..." \
    -e ELASTIC_API_KEY="..." \
    debug

# Test health endpoint
curl http://localhost:8080/health
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **404 on assets** | VITE_BASE_PATH mismatch | Ensure build arg matches nginx config |
| **API calls fail** | Wrong proxy config | Check nginx-sidecar.conf proxy_pass |
| **502 Bad Gateway** | Container crash | Check logs, increase memory |
| **Slow cold starts** | Python imports | Consider `--min-instances=1` |
| **"You don't have access"** | IAP misconfigured | Grant `iap.httpsResourceAccessor` role |

---

## Cost Optimization

| Setting | Development | Production |
|---------|-------------|------------|
| `minScale` | 0 | 1 (avoid cold starts) |
| `maxScale` | 5 | 10+ |
| Memory | 1Gi | 1-2Gi |
| CPU | 1 | 1-2 |

---

## Related Documentation

- `hive-mind/patterns/deployment/CLOUDRUN_SIDECAR_DEPLOYMENT.md` - Detailed pattern guide
- `hive-mind/patterns/deployment/DYNAMIC_PORT_CONFIGURATION.md` - Local development
- `CLAUDE.md` - Project-wide conventions
