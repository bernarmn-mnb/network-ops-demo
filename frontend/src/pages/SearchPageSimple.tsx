/**
 * Simplified Search Page for Starter Template
 * 
 * A clean, minimal search page (~280 lines) with:
 * - Search bar with suggestions
 * - Results grid with product cards
 * - Faceted filter sidebar
 * - Pagination
 * - OTel click tracking
 * 
 * Removed features (see SearchPage.tsx for full version):
 * - Lab Mode / Ranking Pipeline
 * - Personalization UI
 * - Query Rules editing
 * - Demo Query Pills
 * - Position Delta tracking
 * - Resizable sidebar panel
 */

import { useCallback, useState } from 'react';
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
} from '@elastic/eui';
import { AppHeader } from '../components/layout/AppHeader';
import { SearchResultCard } from '../components/search/SearchResultCard';
import { useSearchSimple } from '../hooks/useSearchSimple';
import { searchConfig } from '../config/searchConfig';

export function SearchPageSimple() {
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
    clearFilters,
  } = useSearchSimple({ pageSize: 12 });

  const [searchInput, setSearchInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Handle search submission
  const handleSearch = useCallback(() => {
    setQuery(searchInput);
    setHasSearched(true);
    search();
  }, [searchInput, setQuery, search]);

  // Handle Enter key in search box
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Handle result click with OTel tracking
  const handleResultClick = useCallback((
    resultId: string, 
    position: number,
    productData?: { brand?: string; category?: string; price?: number; name?: string }
  ) => {
    recordClickEvent(resultId, position, query, undefined, productData);
  }, [query]);

  // Render facet filters from aggregations
  const renderFacets = () => {
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

    return (
      <>
        <EuiFlexGroup wrap gutterSize="l">
          {results.map((hit, index) => (
            <EuiFlexItem key={hit.id} grow={false} style={{ width: 280 }}>
              <SearchResultCard
                source={hit.source}
                id={hit.id}
                score={hit.score}
                highlight={hit.highlight}
                position={index + 1 + (page - 1) * 12}
                searchQuery={query}
                onClick={() => handleResultClick(
                  hit.id,
                  index + 1 + (page - 1) * 12,
                  {
                    brand: hit.source.brand as string,
                    category: hit.source.category as string,
                    price: hit.source.price as number,
                    name: hit.source.title as string,
                  }
                )}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        
        {totalPages > 1 && (
          <>
            <EuiSpacer size="xl" />
            <EuiFlexGroup justifyContent="center">
              <EuiPagination
                pageCount={totalPages}
                activePage={page - 1}
                onPageClick={(pageIndex) => {
                  setPage(pageIndex + 1);
                  search();
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
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate restrictWidth={1400} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Page Title */}
          <EuiTitle size="l">
            <h1>Search Products</h1>
          </EuiTitle>
          <EuiSpacer size="l" />

          {/* Search Bar */}
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder="Search products..."
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

          <EuiSpacer size="l" />

          {/* Results Header */}
          {hasSearched && !loading && !error && (
            <>
              <EuiText size="s" color="subdued">
                {total > 0 ? (
                  <p>
                    Found <strong>{total.toLocaleString()}</strong> results
                    {tookMs !== null && <> in {tookMs}ms</>}
                  </p>
                ) : (
                  <p>No results found</p>
                )}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          )}

          {/* Main Content: Sidebar + Results */}
          <EuiFlexGroup>
            {/* Filter Sidebar */}
            <EuiFlexItem grow={false} style={{ width: 250 }}>
              <EuiFlexGroup direction="column" gutterSize="m">
                {renderFacets()}
              </EuiFlexGroup>
            </EuiFlexItem>

            {/* Results Grid */}
            <EuiFlexItem>
              {renderResults()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
}

export default SearchPageSimple;

