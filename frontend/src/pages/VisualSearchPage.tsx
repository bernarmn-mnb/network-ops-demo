/**
 * Visual Search Page — text-to-image and image-to-image kNN search
 *
 * Uses Jina CLIP v2 + Elasticsearch kNN. Features:
 * - Text-to-image: describe a product visually
 * - Image-to-image: paste a URL to find similar products
 * - Visual diversity toggle (MMR) for result diversification
 * - "Find similar" on each card to chain image-to-image searches
 * - "Under the hood" tech panel for engineering audiences
 * - Deep-link support: ?query=X or ?image_url=X
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiBadge,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiAccordion,
  EuiIcon,
  EuiToolTip,
  EuiSwitch,
  EuiRange,
  EuiPanel,
  EuiPageTemplate,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { SearchResultCard } from '../components/search/SearchResultCard';
import { ProductDetailModal, type ProductDetailConfig } from '../components/search/ProductDetailModal';
import { defaultVisualSearchConfig, type VisualSearchConfig } from '../config/visualSearchConfig';

interface VisualHit {
  id: string;
  score: number;
  source: Record<string, unknown>;
}

interface VisualSearchResponse {
  hits: VisualHit[];
  total: number;
  took_ms: number;
}

type SearchMode = 'text' | 'image';

const MODE_OPTIONS = [
  { id: 'text' as const, label: 'Describe a style', iconType: 'search' },
  { id: 'image' as const, label: 'Paste an image URL', iconType: 'image' },
];

interface VisualSearchPageProps {
  config?: VisualSearchConfig
  /** Config passed through to ProductDetailModal (locale, currency, custom sections) */
  productDetailConfig?: ProductDetailConfig
}

export function VisualSearchPage({ config, productDetailConfig }: VisualSearchPageProps) {
  const cfg = config || defaultVisualSearchConfig;
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<SearchMode>('text');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<VisualHit[]>([]);
  const [total, setTotal] = useState(0);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [searchedImageUrl, setSearchedImageUrl] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<VisualHit | null>(null);
  const [mmrEnabled, setMmrEnabled] = useState(false);
  const [mmrLambda, setMmrLambda] = useState(0.5);
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    fetch('/api/visual-search/health')
      .then((r) => r.json())
      .then((d) => setAvailable(d.jina_configured !== false))
      .catch(() => setAvailable(false));
  }, []);

  const executeSearch = useCallback((searchMode: SearchMode, value: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    if (searchMode === 'image') {
      setSearchedImageUrl(value);
      setSearchedQuery(null);
    } else {
      setSearchedQuery(value);
      setSearchedImageUrl(null);
    }

    const endpoint =
      searchMode === 'text' ? '/api/visual-search/text' : '/api/visual-search/image';
    const body =
      searchMode === 'text'
        ? { query: value, size: 24 }
        : { image_url: value, size: 24 };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.detail || `Request failed (${resp.status})`);
        }
        return resp.json();
      })
      .then((data: VisualSearchResponse) => {
        setResults(data.hits);
        setTotal(data.total);
        setTookMs(data.took_ms);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    if (available === null) return;

    const imageUrl = searchParams.get('image_url');
    const query = searchParams.get('query');
    const source = searchParams.get('source');

    if (imageUrl) {
      deepLinkHandled.current = true;
      setMode('image');
      setInput(imageUrl);
      setSearchParams(source ? { source } : {}, { replace: true });
      executeSearch('image', imageUrl);
    } else if (query) {
      deepLinkHandled.current = true;
      setMode('text');
      setInput(query);
      setSearchParams(source ? { source } : {}, { replace: true });
      executeSearch('text', query);
    }
  }, [available, searchParams, executeSearch, setSearchParams]);

  const handleSearch = useCallback(() => {
    if (!input.trim()) return;
    executeSearch(mode, input.trim());
  }, [input, mode, executeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleFindSimilar = useCallback(
    (imageUrl: string) => {
      setMode('image');
      setInput(imageUrl);
      executeSearch('image', imageUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [executeSearch],
  );

  const handleResultClick = useCallback((hit: VisualHit) => {
    setSelectedProduct(hit);
  }, []);

  const handleModeChange = (id: string) => {
    setMode(id as SearchMode);
    setInput('');
    setResults([]);
    setHasSearched(false);
    setSearchedImageUrl(null);
    setSearchedQuery(null);
  };

  const emptyPrompt = (
    iconType: string,
    title: string,
    body: string,
    actions?: React.ReactNode,
  ) => (
    <EuiEmptyPrompt
      iconType={iconType}
      title={<h2>{title}</h2>}
      body={<p>{body}</p>}
      actions={actions}
    />
  );

  return (
    <>
      <EuiSpacer size="xxl" />

      {/* Hero header */}
      <div
        style={{
          background: 'var(--brand-gradient-primary, linear-gradient(135deg, var(--euiColorPrimary) 0%, var(--euiColorPrimaryDark) 100%))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {cfg.heroImageUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${cfg.heroImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
              mixBlendMode: 'overlay',
            }}
            aria-hidden
          />
        )}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px', position: 'relative' }}>
          <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h1 style={{ color: '#FFFFFF', margin: 0, whiteSpace: 'nowrap' }}>
                  {cfg.title}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Search mode"
                options={MODE_OPTIONS}
                idSelected={mode}
                onChange={handleModeChange}
                buttonSize="m"
                color="text"
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ maxWidth: 600 }}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    placeholder={cfg.placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    fullWidth
                    icon={mode === 'text' ? 'search' : 'image'}
                    disabled={available === false}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleSearch}
                    isLoading={loading}
                    disabled={!input.trim() || available === false}
                    style={{
                      backgroundColor: 'var(--brand-accent, rgba(255,255,255,0.25))',
                      borderColor: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    Search
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap
            style={{ marginTop: 8 }}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>{mode === 'text' ? 'Popular:' : 'Try with:'}</span>
              </EuiText>
            </EuiFlexItem>
            {mode === 'text'
              ? cfg.textSuggestions.map((pill) => (
                  <EuiFlexItem key={pill.query} grow={false}>
                    <EuiBadge
                      color="hollow"
                      onClick={() => {
                        setInput(pill.query);
                        executeSearch('text', pill.query);
                      }}
                      onClickAriaLabel={`Search for ${pill.label}`}
                      style={{
                        cursor: 'pointer',
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      {pill.label}
                    </EuiBadge>
                  </EuiFlexItem>
                ))
              : cfg.imageSuggestions.map((pill) => (
                  <EuiFlexItem key={pill.label} grow={false}>
                    <EuiBadge
                      color="hollow"
                      onClick={() => {
                        setInput(pill.url);
                        executeSearch('image', pill.url);
                      }}
                      onClickAriaLabel={`Search for ${pill.label}`}
                      style={{
                        cursor: 'pointer',
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <img
                        src={pill.thumb}
                        alt=""
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                          objectFit: 'cover',
                        }}
                      />
                      {pill.label}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
          </EuiFlexGroup>
        </div>
      </div>

      {available === false && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px 0' }}>
          <EuiCallOut
            title="Visual search is currently unavailable"
            color="warning"
            iconType="warning"
          >
            <p>
              This feature requires the <code>JINA_API_KEY</code> to be configured in the backend.
            </p>
          </EuiCallOut>
        </div>
      )}

      <EuiPageTemplate restrictWidth={1400} panelled={false} style={{ paddingTop: 0 }}>
        <EuiPageTemplate.Section paddingSize="s">
          {hasSearched && !loading && !error && (
            <>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                    {searchedImageUrl && (
                      <EuiFlexItem grow={false}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '2px solid var(--euiColorLightShade)',
                            flexShrink: 0,
                          }}
                        >
                          <EuiImage
                            src={searchedImageUrl}
                            alt="Your image"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {total > 0 ? (
                          <p style={{ margin: 0 }}>
                            {searchedQuery ? (
                              <>
                                Found <strong>{total}</strong> products matching &ldquo;
                                {searchedQuery}&rdquo;
                              </>
                            ) : (
                              <>
                                <strong>{total}</strong> visually similar products
                              </>
                            )}
                            {tookMs != null && <> &middot; {tookMs}ms</>}
                            {mmrEnabled && (
                              <EuiBadge color="accent" style={{ marginLeft: 8 }}>
                                diversity active
                              </EuiBadge>
                            )}
                          </p>
                        ) : (
                          <p style={{ margin: 0 }}>No results found</p>
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content="Use MMR (Maximum Marginal Relevance) on image embeddings to reduce visually redundant results."
                        position="left"
                      >
                        <EuiSwitch
                          label={
                            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <EuiIcon type="image" size="s" />
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <span>Visual Diversity</span>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          }
                          checked={mmrEnabled}
                          onChange={(e) => setMmrEnabled(e.target.checked)}
                          compressed
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    {mmrEnabled && (
                      <EuiFlexItem grow={false} style={{ width: 180 }}>
                        <EuiToolTip
                          content={`Lambda: ${mmrLambda.toFixed(2)} — 1.0 = pure relevance, 0.0 = maximum diversity`}
                          position="bottom"
                        >
                          <EuiRange
                            min={0}
                            max={1}
                            step={0.1}
                            value={mmrLambda}
                            onChange={(e) => setMmrLambda(parseFloat(e.currentTarget.value))}
                            showInput={false}
                            compressed
                            prepend={
                              <EuiText size="xs">
                                <span>Relevance</span>
                              </EuiText>
                            }
                            append={
                              <EuiText size="xs">
                                <span>Diversity</span>
                              </EuiText>
                            }
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}

          {loading && (
            <EuiFlexGroup justifyContent="center" alignItems="center" direction="column" style={{ minHeight: 300 }}>
              <EuiLoadingSpinner size="xl" />
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>Finding visually similar products...</p>
              </EuiText>
            </EuiFlexGroup>
          )}

          {error && (
            <EuiCallOut title="Something went wrong" color="danger" iconType="error">
              {error}
            </EuiCallOut>
          )}

          {!hasSearched && !loading && emptyPrompt(
            mode === 'text' ? 'search' : 'image',
            mode === 'text'
              ? 'Search by describing a style'
              : 'Search by pasting an image URL',
            mode === 'text'
              ? 'Try "red velvet cushion" or "modern wooden table" — we match products by how they look, not just their name.'
              : "Paste a product image URL from any website and we'll find visually similar products.",
          )}

          {hasSearched && !loading && !error && results.length === 0 &&
            emptyPrompt(
              'search',
              'No matching products found',
              mode === 'text'
                ? 'Try describing the product differently — colours, materials, or shapes work well.'
                : 'Try a different image URL. The image needs to be publicly accessible.',
              <EuiButton
                onClick={() => {
                  setHasSearched(false);
                  setInput('');
                  setResults([]);
                }}
                fill
              >
                Start over
              </EuiButton>,
            )}

          {results.length > 0 && (
            <>
              <style>{`
                .vs-card-wrapper:hover .vs-find-similar {
                  opacity: 1 !important;
                }
              `}</style>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                {results.map((hit, index) => {
                  const imageUrl = (hit.source.image_url || hit.source.imageUrl || '') as string;
                  return (
                    <div key={hit.id} className="vs-card-wrapper" style={{ position: 'relative' }}>
                      <SearchResultCard
                        source={hit.source}
                        id={hit.id}
                        score={hit.score}
                        position={index + 1}
                        onClick={() => handleResultClick(hit)}
                      />
                      {imageUrl && (
                        <EuiToolTip content="Find visually similar" position="top">
                          <button
                            className="vs-find-similar"
                            aria-label="Find similar products"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFindSimilar(imageUrl);
                            }}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 3,
                              background: 'rgba(255,255,255,0.92)',
                              border: 'none',
                              borderRadius: '50%',
                              width: 30,
                              height: 30,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              opacity: 0,
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            <EuiIcon type="image" size="s" />
                          </button>
                        </EuiToolTip>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <EuiSpacer size="xxl" />
          <EuiAccordion
            id="under-the-hood"
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="wrench" size="s" color="subdued" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <strong>Under the hood</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            paddingSize="l"
            arrowDisplay="right"
          >
            <EuiPanel color="subdued" paddingSize="l">
              <EuiFlexGroup gutterSize="xl" responsive>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h4>How it works</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>
                      Product images are embedded into a <strong>1024-dimensional vector</strong>{' '}
                      using <strong>Jina CLIP v2</strong>, then stored as a <code>dense_vector</code>{' '}
                      field in Elasticsearch.
                    </p>
                    <p>
                      When you search, your input (text or image) is embedded by the same model.
                      Elasticsearch performs approximate <strong>kNN</strong> search to find the most
                      visually similar products.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h4>Text mode = visual matching</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>
                      When you type a phrase, we're <strong>not</strong> doing keyword search. Jina
                      CLIP v2 converts the text into a <strong>visual embedding</strong> — a vector
                      representing what that phrase <em>looks like</em>.
                    </p>
                    <p>
                      Products are matched by image similarity, even if the words don't appear in
                      their name.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h4>Stack</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <ul>
                      <li>
                        <strong>Embeddings:</strong> Jina CLIP v2 (1024 dims, multimodal)
                      </li>
                      <li>
                        <strong>Storage:</strong> Elasticsearch <code>dense_vector</code> with HNSW
                        index
                      </li>
                      <li>
                        <strong>Search:</strong> Approximate kNN with cosine similarity
                      </li>
                      {cfg.techPanelNotes?.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiAccordion>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      {selectedProduct && (
        <ProductDetailModal
          source={selectedProduct.source}
          onClose={() => setSelectedProduct(null)}
          config={productDetailConfig}
        />
      )}
    </>
  );
}

export default VisualSearchPage;
