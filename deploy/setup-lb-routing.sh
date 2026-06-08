#!/bin/bash
# Patches elastic-demos-gateway URL map to add /noc and /mizuho-aml routes
set -e

PROJECT=elastic-sa

echo "=== Fetching latest fingerprint ==="
gcloud compute url-maps export elastic-demos-gateway \
  --project=$PROJECT --global > /tmp/urlmap-latest.yaml
FINGERPRINT=$(grep "^fingerprint:" /tmp/urlmap-latest.yaml | awk '{print $2}')
echo "Fingerprint: $FINGERPRINT"

echo "=== Writing patched URL map ==="
cat > /tmp/urlmap-patched.yaml << YAML
defaultService: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/demos-landing-backend
fingerprint: $FINGERPRINT
hostRules:
- hosts:
  - '*'
  pathMatcher: demos-paths
name: elastic-demos-gateway
pathMatchers:
- defaultService: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/demos-landing-backend
  name: demos-paths
  pathRules:
  - paths:
    - /crawler
    - /crawler/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/elastic-crawler-control-backend
  - paths:
    - /ecommerce
    - /ecommerce/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/search-otel-ubi-backend
  - paths:
    - /template
    - /template/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/elastic-agent-template-backend
  - paths:
    - /horizon
    - /horizon/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/horizon-demo-backend
  - paths:
    - /noc
    - /noc/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/mnb-noc-demo-backend
  - paths:
    - /mizuho-aml
    - /mizuho-aml/*
    service: https://www.googleapis.com/compute/v1/projects/elastic-sa/global/backendServices/mizuho-aml-backend
YAML

echo "=== Importing patched URL map ==="
gcloud compute url-maps import elastic-demos-gateway \
  --project=$PROJECT --global \
  --source=/tmp/urlmap-patched.yaml \
  --quiet

echo ""
echo "=== Routes active ==="
echo "  NOC demo:    https://demos.gcp.elasticsa.co/noc/"
echo "  Mizuho demo: https://demos.gcp.elasticsa.co/mizuho-aml/"
echo "Allow 1-2 min to propagate."
