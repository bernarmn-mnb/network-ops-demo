# Shared Serverless Project

> **Status**: Ready to Use
> **Last Updated**: 2026-01-28

## Overview

This project provides a shared Elastic Cloud Serverless project pre-loaded with demo datasets using Elastic Inference Service (EIS). This enables users to get started quickly without provisioning their own cluster or managing ML infrastructure.

**Key Features**:
- Zero ML nodes required - all inference runs on EIS
- ELSER + jina-embeddings-v3 for semantic search
- Geo search support for store locations
- Ready-to-use datasets for common demo scenarios

## Quick Start

### 1. Configure Your Environment

**Option A: Automatic (Recommended)**

If you have the GitHub CLI (`gh`) installed and authenticated:

```bash
./dev use-ootb
```

This fetches credentials from GitHub repository variables and configures `backend/.env` automatically.

**Option B: Manual**

Add to your `backend/.env`:

```bash
ELASTICSEARCH_URL=https://demo-starter-ootb-data-c601a1.es.us-east4.gcp.elastic.cloud:443
ELASTIC_API_KEY=<get from ./dev use-ootb or ask project maintainer>
KIBANA_URL=https://demo-starter-ootb-data-c601a1.kb.us-east4.gcp.elastic.cloud/
```

> **Note**: This is a read-only API key. You can search indices and chat with agents, but cannot write data or modify agents.

### 2. Verify Connection

```bash
./dev verify
```

### 3. Choose Your Index

| Use Case | Index | Semantic Field |
|----------|-------|----------------|
| Product search | `ootb-products` | `semantic_content` (ELSER) or `semantic_jina` |
| RAG / Q&A | `ootb-knowledge` | `semantic_content` (ELSER) or `semantic_jina` |
| Support analytics | `ootb-support` | `semantic_content` (ELSER) or `semantic_jina` |
| Store finder | `ootb-stores` | `semantic_content` (ELSER) or `semantic_jina` + `location` (geo) |

> **All indices now support both ELSER and jina-v3** for semantic search comparison demos.

## Available Datasets

### ootb-products (E-Commerce)

**200 products** across Electronics, Clothing, and Home categories.

| Field | Type | Description |
|-------|------|-------------|
| `id` | keyword | Product ID |
| `title` | text | Product name |
| `brand` | keyword | Manufacturer |
| `description` | text | Product description |
| `price` | float | Price in USD |
| `categories` | keyword[] | Category hierarchy |
| `attrs` | flattened | Product attributes |
| `rating` | float | Average rating (0-5) |
| `in_stock` | boolean | Availability |
| `semantic_content` | semantic_text | ELSER embeddings |
| `semantic_jina` | semantic_text | jina-v3 embeddings (1024 dims) |

**Example Query (ELSER)**:
```json
{
  "query": {
    "semantic": {
      "field": "semantic_content",
      "query": "laptop computer for work"
    }
  }
}
```

**Example Query (jina-v3)**:
```json
{
  "query": {
    "semantic": {
      "field": "semantic_jina",
      "query": "portable device for mobile work"
    }
  }
}
```

---

### ootb-knowledge (Documentation)

**150 articles** - mix of FAQs and documentation articles.

| Field | Type | Description |
|-------|------|-------------|
| `id` | keyword | Document ID |
| `type` | keyword | `faq` or `article` |
| `question` | text | FAQ question |
| `answer` | text | FAQ answer |
| `title` | text | Article title |
| `content` | text | Article body |
| `category` | keyword | Topic category |
| `tags` | keyword[] | Content tags |
| `difficulty` | keyword | beginner/intermediate/advanced |
| `semantic_content` | semantic_text | ELSER embeddings |
| `semantic_jina` | semantic_text | jina-v3 embeddings (1024 dims) |

**Example Query (ELSER)**:
```json
{
  "query": {
    "semantic": {
      "field": "semantic_content",
      "query": "how do I configure settings?"
    }
  }
}
```

**Example Query (jina-v3)**:
```json
{
  "query": {
    "semantic": {
      "field": "semantic_jina",
      "query": "configuration best practices"
    }
  }
}
```

---

### ootb-support (Support Tickets)

**150 tickets** with conversation threads and sentiment.

| Field | Type | Description |
|-------|------|-------------|
| `id` | keyword | Ticket ID |
| `subject` | text | Ticket subject |
| `description` | text | Initial description |
| `product` | keyword | Product name |
| `status` | keyword | open/in_progress/resolved/closed |
| `priority` | keyword | low/medium/high/critical |
| `sentiment` | keyword | positive/neutral/negative/frustrated |
| `conversation` | nested | Message thread |
| `created_at` | date | Creation timestamp |
| `semantic_content` | semantic_text | ELSER embeddings |
| `semantic_jina` | semantic_text | jina-v3 embeddings (1024 dims) |

**Example Query (Semantic + Filter)**:
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "semantic": {
            "field": "semantic_content",
            "query": "application crashes on startup"
          }
        }
      ],
      "filter": [
        { "term": { "priority": "high" } }
      ]
    }
  }
}
```

**Example Query (jina-v3)**:
```json
{
  "query": {
    "semantic": {
      "field": "semantic_jina",
      "query": "performance degradation issue"
    }
  }
}
```

---

### ootb-stores (Store Locations)

**100 stores** across 25 US cities with geo coordinates.

| Field | Type | Description |
|-------|------|-------------|
| `id` | keyword | Store ID |
| `name` | text | Store name |
| `type` | keyword | Flagship/Mall/Outlet/Express/Warehouse |
| `location` | geo_point | Lat/lon coordinates |
| `city` | keyword | City name |
| `state` | keyword | State code |
| `features` | keyword[] | Available features |
| `services` | keyword[] | Available services |
| `rating` | float | Store rating |
| `semantic_content` | semantic_text | ELSER embeddings |
| `semantic_jina` | semantic_text | jina-v3 embeddings |

**Example Query (Geo Distance)**:
```json
{
  "query": {
    "geo_distance": {
      "distance": "50km",
      "location": { "lat": 37.77, "lon": -122.41 }
    }
  },
  "sort": [
    {
      "_geo_distance": {
        "location": { "lat": 37.77, "lon": -122.41 },
        "order": "asc"
      }
    }
  ]
}
```

**Example Query (Geo + Features)**:
```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "geo_distance": {
            "distance": "25km",
            "location": { "lat": 40.71, "lon": -74.00 }
          }
        },
        { "term": { "features": "curbside_pickup" } }
      ]
    }
  }
}
```

---

## Pre-Built Agents

Four agents are ready to use in Agent Builder:

| Agent ID | Name | Index | Try Asking |
|----------|------|-------|------------|
| `ootb-product-search` | Product Search Assistant | ootb-products | "Find laptops under $500" |
| `ootb-knowledge-base` | Knowledge Base Assistant | ootb-knowledge | "How do I configure settings?" |
| `ootb-support-analyst` | Support Ticket Analyst | ootb-support | "Show critical priority tickets" |
| `ootb-store-finder` | Store Finder Assistant | ootb-stores | "Find stores in San Francisco" |

### Using an Agent

1. Set `AGENT_ID` in your `backend/.env`:
   ```bash
   AGENT_ID=ootb-product-search
   ```

2. Run `./dev start` to launch the demo

3. Visit `/chat` to interact with the agent

---

## EIS Endpoints Used

| Endpoint | Task | Model |
|----------|------|-------|
| `.elser-2-elastic` | Sparse embedding | ELSER v2 |
| `.jina-embeddings-v3` | Dense embedding | jina-embeddings-v3 (1024 dims) |

Both endpoints run on Elastic Inference Service - no ML nodes required.

---

## Comparing ELSER vs jina-v3

**All four indices** now have both embedding types, enabling side-by-side comparison:

```json
// ELSER (sparse, English-optimised)
{ "query": { "semantic": { "field": "semantic_content", "query": "..." } } }

// jina-v3 (dense, multilingual)  
{ "query": { "semantic": { "field": "semantic_jina", "query": "..." } } }
```

**When to use which**:
- **ELSER**: English content, RAG, Q&A, documentation - excellent for natural language
- **jina-v3**: Multilingual content, cross-language search, numeric/entity-heavy queries, shorter text

---

## Limitations

### Read-Only API Key

The shared API key provides **read access** to all indices, Agent Builder, and cluster monitoring:

- ✅ Search any index (`*`) including custom indices
- ✅ Run semantic queries (ELSER + jina-v3)
- ✅ Chat with pre-built agents
- ✅ List available agents and tools
- ✅ Cluster monitoring (`es.info()`, `_cluster/health`, etc.)
- ✅ Inference endpoint monitoring
- ❌ Write to indices
- ❌ Create/modify/delete agents
- ❌ Create/modify mappings

**Role Descriptor** (for reference if creating new keys):

```json
{
  "ootb-readonly": {
    "cluster": ["monitor", "monitor_inference"],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["feature_agentBuilder.read", "feature_actions.read"],
        "resources": ["*"]
      }
    ]
  }
}
```

See [Agent Builder Permissions](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions) for details.

### When to Use Your Own Cluster

Use the shared project for:
- Quick demos and prototypes
- Learning semantic search
- Testing queries before production

Use your own cluster when:
- You need custom datasets
- You need to create agents
- You need write access
- You need production reliability

---

## Reloading Data

If you have admin access and need to reload the data:

```bash
cd backend
source venv/bin/activate

# Reload all datasets
python -m scripts.load_serverless_ootb \
  --es-url "https://demo-starter-ootb-data-c601a1.es.us-east4.gcp.elastic.cloud:443" \
  --api-key "YOUR_ADMIN_API_KEY" \
  --recreate

# Load specific datasets with custom counts
python -m scripts.load_serverless_ootb \
  --datasets products stores \
  --products 500 \
  --stores 200
```

---

## Cluster Details

| Field | Value |
|-------|-------|
| **Project Name** | demo-starter-ootb-data |
| **Cloud Provider** | GCP |
| **Region** | us-east4 |
| **Elasticsearch URL** | `https://demo-starter-ootb-data-c601a1.es.us-east4.gcp.elastic.cloud:443` |
| **Kibana URL** | `https://demo-starter-ootb-data-c601a1.kb.us-east4.gcp.elastic.cloud/` |

---

## Demo Ideas

| Demo | Index | Query Type | Highlights |
|------|-------|------------|------------|
| **Product Search** | ootb-products | Semantic | ELSER vs jina comparison |
| **RAG Chatbot** | ootb-knowledge | Semantic | FAQ retrieval for Agent Builder |
| **Support Dashboard** | ootb-support | Semantic + Filters | Priority filtering, sentiment |
| **Store Finder** | ootb-stores | Geo + Semantic | Distance sorting, feature filters |
| **Hybrid Search** | Any | BM25 + Semantic | Compare retrieval methods |

---

## Troubleshooting

### "Unauthorised" errors

The API key is read-only. Use your own cluster for write operations.

### "Index not found" errors

Verify the index name matches exactly (uses `_resolve/index` which works with the read-only key):
```bash
curl -X GET "$ELASTICSEARCH_URL/_resolve/index/ootb-*" \
  -H "Authorization: ApiKey $ELASTIC_API_KEY"
```

> **Note**: `_cat/indices` requires the `monitor` index privilege which the read-only key does not have. Use `_resolve/index` or `_count` instead.

### Semantic search returns no results

Ensure you're using the correct field:
- `semantic_content` for ELSER (all indices)
- `semantic_jina` for jina-v3 (all indices)

---

## Requesting New Data or Agents

Want to add a new dataset or agent to the shared project?

1. **Open an issue** using the [OOTB Data Request template](../.github/ISSUE_TEMPLATE/ootb_data_request.md)
2. **Describe your use case** - what demo scenario does this enable?
3. **Specify the data** - fields, record count, semantic search needs
4. **Contribute if you can** - generator scripts, sample data, testing

### What Makes a Good Addition

- **Demonstrates EIS capabilities** (ELSER or jina-v3)
- **Fills a gap** in current demo scenarios
- **Has broad appeal** across multiple demo types
- **Uses the generators** in `backend/scripts/generators/`

---

## Related Documentation

- [Elastic Inference Service](../hive-mind/patterns/search/ELASTIC_INFERENCE_SERVICE.md)
- [Dataset Registry](../hive-mind/patterns/data/DATASET_REGISTRY.md)
- [Agent Builder Integration](../hive-mind/patterns/agent-builder/AGENT_BUILDER_INTEGRATION.md)
- [Agent Builder API Management](../hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md)
