/**
 * Simplified Search Page for Starter Template
 * 
 * A clean, minimal search page with:
 * - Search bar with suggestions
 * - Results grid with product cards
 * - Faceted filter sidebar
 * - Pagination
 * - OTel click tracking
 * - Unconfigured index detection with warning banner
 * 
 * Removed features (see SearchPage.tsx for full version):
 * - Lab Mode / Ranking Pipeline
 * - Personalization UI
 * - Query Rules editing
 * - Demo Query Pills
 * - Position Delta tracking
 * - Resizable sidebar panel
 */

import type { ReactNode } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { recordClickEvent } from '../otel';
import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiPagination,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiTitle,
  EuiPanel,
  EuiFacetGroup,
  EuiFacetButton,
  EuiFieldSearch,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiAccordion,
  EuiLink,
  EuiSelect,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { SearchResultCard } from '../components/search/SearchResultCard';
import { useSearchSimple } from '../hooks/useSearchSimple';
import type { SearchHit } from '../hooks/useSearchSimple';
import { searchConfig } from '../config/searchConfig';
import type { SearchModeConfig, DemoPill } from '../config/searchConfig';

interface FieldsConfig {
  index: string;
  configured: boolean;
  fields: Array<{
    name: string;
    type: string;
    searchable: boolean;
    aggregatable: boolean;
    likely_purpose: string | null;
  }>;
  suggested_config: {
    searchFields: string[];
    display: Record<string, string>;
    facets: Array<{ field: string; label: string; size: number }>;
  } | null;
}

export interface SearchPageSimpleProps {
  /** Custom result card renderer. Replaces the default SearchResultCard. */
  renderResult?: (hit: SearchHit, options: { position: number; onClick: () => void; isConfigured: boolean }) => ReactNode;
  /** Custom detail view. When set, clicking a result opens this view. Return null to use default click behavior. */
  renderDetail?: (hit: SearchHit, onClose: () => void) => ReactNode;
  /** Custom empty state (before first search) */
  renderEmptyState?: () => ReactNode;
  /** Additional actions rendered in the header area (e.g., floating chat button) */
  headerActions?: ReactNode;
}

export function SearchPageSimple({
  renderResult,
  renderDetail,
  renderEmptyState,
  headerActions,
}: SearchPageSimpleProps = {}) {
  // Search mode state
  const searchModes = searchConfig.searchModes ?? [];
  const hasMultipleModes = searchModes.length > 1;
  const [activeMode, setActiveMode] = useState<string>(searchModes[0]?.id ?? 'keyword');
  const activeModeConfig = searchModes.find(m => m.id === activeMode) ?? searchModes[0];

  // Active pills
  const activePills: DemoPill[] = searchConfig.demoPills?.[activeMode] ?? [];

  // Sort state (derive from config)
  const sortOptions = searchConfig.sortOptions ?? [];

  // Detail view state
  const [detailHit, setDetailHit] = useState<SearchHit | null>(null);

  const {
    query,
    results,
    total,
    page,
    totalPages,
    loading,
    error,
    aggregations,
    tookMs,
    filters,
    setQuery,
    search,
    setPage,
    setFilter,
    setSort,
    sortBy,
    sortDir,
    clearFilters,
  } = useSearchSimple({
    pageSize: searchConfig.pageSize ?? 12,
    searchType: activeMode,
  });

  const [searchInput, setSearchInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState<FieldsConfig | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  // Fetch field configuration on mount
  useEffect(() => {
    const fetchFieldsConfig = async () => {
      try {
        const response = await fetch(`/api/search/fields`);
        if (response.ok) {
          const data = await response.json();
          setFieldsConfig(data);
        } else if (response.status === 400) {
          // SEARCH_INDEX not configured
          setFieldsError('Search index not configured');
        } else {
          setFieldsError(`Failed to load field config: ${response.status}`);
        }
      } catch (err) {
        setFieldsError('Could not connect to backend');
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchFieldsConfig();
  }, []);

  // Determine if search is properly configured
  const isConfigured = fieldsConfig?.configured ?? true;

  // Handle search submission (use overrides to avoid stale closure)
  const handleSearch = useCallback(() => {
    setQuery(searchInput);
    setHasSearched(true);
    search({ query: searchInput });
  }, [searchInput, setQuery, search]);

  // Mode switching — re-run search with new mode
  const handleModeChange = useCallback((modeId: string) => {
    setActiveMode(modeId);
    if (hasSearched) {
      search({ query: searchInput || query, searchType: modeId });
    }
  }, [hasSearched, searchInput, query, search]);

  // Demo pill click — set query and search
  const handlePillClick = useCallback((pill: DemoPill) => {
    setSearchInput(pill.query);
    setQuery(pill.query);
    setHasSearched(true);
    search({ query: pill.query });
  }, [setQuery, search]);

  // Sort change
  const selectedSort = sortBy ? `${sortBy}:${sortDir}` : '_score:desc';
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [field, dir] = value.split(':') as [string, 'asc' | 'desc'];
    const newSortBy = field === '_score' ? null : field;
    const newSortDir = dir ?? 'desc';
    setSort(newSortBy, newSortDir);
    search({ sortBy: newSortBy, sortDir: newSortDir });
  }, [setSort, search]);

  // Handle Enter key in search box
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Handle result click with OTel tracking and detail view support
  const handleResultClick = useCallback((
    resultId: string,
    position: number,
    hit?: SearchHit,
  ) => {
    recordClickEvent(resultId, position, query, undefined, {
      brand: hit?.source?.brand as string,
      category: hit?.source?.category as string,
      price: hit?.source?.price as number,
      name: (hit?.source?.title ?? hit?.source?.name) as string,
    });
    if (renderDetail && hit) {
      setDetailHit(hit);
    }
  }, [query, renderDetail]);

  // Render facet filters from aggregations
  const renderFacets = () => {
    // Don't show facets if not configured
    if (!isConfigured) return null;

    const facetConfigs = searchConfig.facets || [];
    
    return facetConfigs.map(facetConfig => {
      const buckets = aggregations[facetConfig.field] || [];
      if (buckets.length === 0) return null;

      const selectedValue = filters[facetConfig.field];

      return (
        <EuiPanel key={facetConfig.field} paddingSize="m" hasShadow={false} hasBorder>
          <EuiTitle size="xs">
            <h4>{facetConfig.label}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFacetGroup>
            {buckets.slice(0, 10).map(bucket => (
              <EuiFacetButton
                key={bucket.key}
                quantity={bucket.doc_count}
                isSelected={selectedValue === bucket.key}
                onClick={() => {
                  if (selectedValue === bucket.key) {
                    setFilter(facetConfig.field, null);
                  } else {
                    setFilter(facetConfig.field, bucket.key);
                  }
                  search();
                }}
              >
                {bucket.key}
              </EuiFacetButton>
            ))}
          </EuiFacetGroup>
        </EuiPanel>
      );
    });
  };

  // Render configuration warning banner
  const renderConfigWarning = () => {
    if (fieldsLoading || isConfigured) return null;

    return (
      <>
        <EuiCallOut
          title="Search needs configuration"
          color="warning"
          iconType="wrench"
        >
          <p>
            The search index <EuiCode>{fieldsConfig?.index || 'unknown'}</EuiCode> has fields 
            that don't match the expected structure. Results are shown in raw JSON format.
          </p>
          
          <EuiAccordion
            id="config-instructions"
            buttonContent="How to configure"
            paddingSize="m"
          >
            <EuiText size="s">
              <p><strong>Option 1: Use AI Assistant</strong></p>
              <p>
                Tell your AI coding assistant (Cursor/Claude Code):
              </p>
              <EuiCode>
                "Configure the search page for my index. Check /api/search/fields for the field mapping."
              </EuiCode>
              
              <EuiSpacer size="m" />
              
              <p><strong>Option 2: Manual Configuration</strong></p>
              <ol>
                <li>
                  Check available fields: <EuiLink href="/api/search/fields" target="_blank">
                    GET /api/search/fields
                  </EuiLink>
                </li>
                <li>
                  Edit <EuiCode>frontend/src/config/searchConfig.ts</EuiCode> to map your fields
                </li>
                <li>
                  Update <EuiCode>backend/app/routes/search_simple.py</EuiCode> search fields
                </li>
              </ol>

              {fieldsConfig?.suggested_config && (
                <>
                  <EuiSpacer size="m" />
                  <p><strong>Suggested Configuration:</strong></p>
                  <EuiCode language="json">
                    {JSON.stringify(fieldsConfig.suggested_config, null, 2)}
                  </EuiCode>
                </>
              )}
            </EuiText>
          </EuiAccordion>
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    );
  };

  // Render ES connection error
  const renderConnectionError = () => {
    if (!fieldsError) return null;

    return (
      <>
        <EuiCallOut
          title="Elasticsearch not connected"
          color="danger"
          iconType="alert"
        >
          <p>{fieldsError}</p>
          <p>
            Run <EuiCode>./setup.sh</EuiCode> to configure Elasticsearch connection, 
            or check that the backend server is running.
          </p>
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    );
  };

  // Render results grid
  const renderResults = () => {
    if (loading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      );
    }

    if (error) {
      return (
        <EuiCallOut title="Search Error" color="danger" iconType="error">
          {error}
        </EuiCallOut>
      );
    }

    if (!hasSearched) {
      if (renderEmptyState) {
        return renderEmptyState();
      }
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h2>Start Searching</h2>}
          body={<p>Enter a search term to find products</p>}
        />
      );
    }

    if (results.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h2>No Results</h2>}
          body={<p>Try a different search term or clear filters</p>}
          actions={
            <EuiButton onClick={clearFilters}>Clear Filters</EuiButton>
          }
        />
      );
    }

    const pageSizeVal = searchConfig.pageSize ?? 12;

    return (
      <>
        <EuiFlexGroup wrap gutterSize="l">
          {results.map((hit, index) => {
            const pos = index + 1 + (page - 1) * pageSizeVal;
            const onClickResult = () => handleResultClick(hit.id, pos, hit);

            if (renderResult) {
              return (
                <EuiFlexItem key={hit.id} grow={false} style={{ width: 280 }}>
                  {renderResult(hit, { position: pos, onClick: onClickResult, isConfigured })}
                </EuiFlexItem>
              );
            }

            return (
              <EuiFlexItem key={hit.id} grow={false} style={{ width: isConfigured ? 280 : 350 }}>
                <SearchResultCard
                  source={hit.source}
                  id={hit.id}
                  score={hit.score}
                  highlight={hit.highlight}
                  position={pos}
                  searchQuery={query}
                  forceGenericMode={!isConfigured}
                  onClick={() => onClickResult()}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
        
        {totalPages > 1 && (
          <>
            <EuiSpacer size="xl" />
            <EuiFlexGroup justifyContent="center">
              <EuiPagination
                pageCount={totalPages}
                activePage={page - 1}
                onPageClick={(pageIndex) => {
                  const newPage = pageIndex + 1;
                  setPage(newPage);
                  search({ page: newPage });
                }}
              />
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate restrictWidth={1400} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Page Title */}
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{searchConfig.pageTitle ?? 'Search'} {!isConfigured && '(Unconfigured)'}</h1>
              </EuiTitle>
            </EuiFlexItem>
            {headerActions && (
              <EuiFlexItem grow={false}>
                {headerActions}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="l" />

          {/* Connection Error */}
          {renderConnectionError()}

          {/* Configuration Warning */}
          {renderConfigWarning()}

          {/* Mode toolbar (only when multiple modes) */}
          {hasMultipleModes && (
            <>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {searchModes.map((mode: SearchModeConfig) => (
                  <EuiFlexItem key={mode.id} grow={false}>
                    <EuiToolTip content={mode.tooltip}>
                      <EuiButtonIcon
                        iconType={mode.icon}
                        aria-label={mode.label}
                        color={activeMode === mode.id ? 'primary' : 'text'}
                        display={activeMode === mode.id ? 'fill' : 'empty'}
                        onClick={() => handleModeChange(mode.id)}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}

          {/* Search Bar */}
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={activeModeConfig?.placeholder ?? 'Search...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                isClearable
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={handleSearch} isLoading={loading}>
                Search
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Demo pills */}
          {activePills.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="xs" wrap>
                {activePills.map((pill) => (
                  <EuiFlexItem key={pill.label} grow={false}>
                    <EuiBadge
                      color="hollow"
                      onClick={() => handlePillClick(pill)}
                      onClickAriaLabel={`Search: ${pill.query}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {pill.label}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}

          <EuiSpacer size="l" />

          {/* Results Header */}
          {hasSearched && !loading && !error && (
            <>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {total > 0 ? (
                      <p>
                        Found <strong>{total.toLocaleString()}</strong> results
                        {tookMs !== null && <> in {tookMs}ms</>}
                        {!isConfigured && <> (showing raw JSON)</>}
                      </p>
                    ) : (
                      <p>No results found</p>
                    )}
                  </EuiText>
                </EuiFlexItem>
                {sortOptions.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      compressed
                      value={selectedSort}
                      onChange={handleSortChange}
                      options={[
                        ...sortOptions.map((opt) => ({
                          value: `${opt.field}:${opt.direction}`,
                          text: opt.label,
                        })),
                      ]}
                      aria-label="Sort results"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}

          {/* Main Content: Sidebar + Results */}
          <EuiFlexGroup>
            {/* Filter Sidebar - only show if configured */}
            {isConfigured && (
              <EuiFlexItem grow={false} style={{ width: 250 }}>
                <EuiFlexGroup direction="column" gutterSize="m">
                  {renderFacets()}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {/* Results Grid */}
            <EuiFlexItem>
              {renderResults()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      {/* Detail overlay */}
      {detailHit && renderDetail && renderDetail(detailHit, () => setDetailHit(null))}
    </>
  );
}

export default SearchPageSimple;
