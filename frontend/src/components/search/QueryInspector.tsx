import { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiButtonGroup,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiCopy,
  EuiBadge,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { JsonTreeView } from '../common/JsonTreeView';

interface QueryInspectorProps {
  query: Record<string, unknown> | null;
  loading?: boolean;
  mode?: 'inline' | 'compact';
}

type ViewMode = 'raw' | 'tree';

export function QueryInspector({ query, loading = false, mode = 'inline' }: QueryInspectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const isRetrieverQuery = Boolean(query && 'retriever' in query);
  const viewModeButtons = [
    { id: 'tree', label: '🌳 Tree' },
    { id: 'raw', label: '📄 Raw' },
  ];

  const formattedQuery = query ? JSON.stringify(query, null, 2) : null;
  const querySize = formattedQuery ? formattedQuery.length : 0;
  const queryLines = formattedQuery ? formattedQuery.split('\n').length : 0;

  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  if (mode === 'inline') {
    return (
      <>
        <EuiPanel paddingSize="s" hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={isAccordionOpen ? 'arrowDown' : 'arrowRight'}
                aria-label="Toggle query inspector"
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="inspect" size="s" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs"><strong>Query Inspector</strong></EuiText>
            </EuiFlexItem>
            {query && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={isRetrieverQuery ? 'success' : 'hollow'}>
                  {isRetrieverQuery ? 'Retriever' : 'DSL'}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {loading && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">Loading…</EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow />
            {query && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={formattedQuery || ''}>
                    {(copy) => (
                      <EuiToolTip content="Copy query">
                        <EuiButtonIcon iconType="copy" aria-label="Copy query" onClick={copy} size="xs" />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content="Open full screen">
                    <EuiButtonIcon iconType="expand" aria-label="Open full screen" onClick={handleOpenModal} size="xs" />
                  </EuiToolTip>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>

          {isAccordionOpen && (
            <div style={{ marginTop: 8 }}>
              {query ? (
                <>
                  <EuiFlexGroup alignItems="center" gutterSize="s" style={{ marginBottom: 8 }}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {queryLines} lines • {(querySize / 1024).toFixed(1)} KB
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow />
                    <EuiFlexItem grow={false}>
                      <EuiButtonGroup
                        legend="View mode"
                        options={viewModeButtons}
                        idSelected={viewMode}
                        onChange={(id) => setViewMode(id as ViewMode)}
                        buttonSize="compressed"
                        isFullWidth={false}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {viewMode === 'tree' ? (
                    <JsonTreeView data={query} defaultExpandDepth={2} style={{ maxHeight: 250, overflow: 'auto' }} />
                  ) : (
                    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" overflowHeight={200} isCopyable={false}>
                      {formattedQuery}
                    </EuiCodeBlock>
                  )}
                </>
              ) : (
                <EuiText size="xs" color="subdued" style={{ padding: '8px 0' }}>
                  Run a search to inspect the Elasticsearch query
                </EuiText>
              )}
            </div>
          )}
        </EuiPanel>

        {isModalOpen && (
          <QueryInspectorModal
            query={query}
            formattedQuery={formattedQuery}
            queryLines={queryLines}
            querySize={querySize}
            isRetrieverQuery={isRetrieverQuery}
            loading={loading}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  return (
    <>
      <EuiPanel paddingSize="s" hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="inspect" size="m" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s"><strong>Query Inspector</strong></EuiText>
              </EuiFlexItem>
              {query && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={isRetrieverQuery ? 'success' : 'hollow'}>
                    {isRetrieverQuery ? 'Retriever API' : 'Query DSL'}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued">
              {query ? `${queryLines} lines • ${(querySize / 1024).toFixed(1)} KB` : 'Run a search to inspect the query'}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="document" onClick={handleOpenModal} isDisabled={!query} isLoading={loading}>
              View Query
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {isModalOpen && (
        <QueryInspectorModal
          query={query}
          formattedQuery={formattedQuery}
          queryLines={queryLines}
          querySize={querySize}
          isRetrieverQuery={isRetrieverQuery}
          loading={loading}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

interface QueryInspectorModalProps {
  query: Record<string, unknown> | null;
  formattedQuery: string | null;
  queryLines: number;
  querySize: number;
  isRetrieverQuery: boolean;
  loading: boolean;
  onClose: () => void;
}

function QueryInspectorModal({
  query, formattedQuery, queryLines, querySize, isRetrieverQuery, loading, onClose,
}: QueryInspectorModalProps) {
  const [modalViewMode, setModalViewMode] = useState<ViewMode>('tree');
  const viewModeButtons = [
    { id: 'tree', label: '🌳 Tree View' },
    { id: 'raw', label: '📄 Raw JSON' },
  ];

  return (
    <EuiModal onClose={onClose} style={{ width: '90vw', maxWidth: 1200 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}><EuiIcon type="inspect" size="l" /></EuiFlexItem>
            <EuiFlexItem>Elasticsearch Query Inspector</EuiFlexItem>
            {query && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={isRetrieverQuery ? 'success' : 'hollow'}>
                    {isRetrieverQuery ? 'Retriever API' : 'Query DSL'}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}><EuiBadge color="hollow">{queryLines} lines</EuiBadge></EuiFlexItem>
                <EuiFlexItem grow={false}><EuiBadge color="hollow">{(querySize / 1024).toFixed(1)} KB</EuiBadge></EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {loading ? (
          <EuiCallOut title="Loading…" color="primary" iconType="clock">
            <p>Waiting for search results…</p>
          </EuiCallOut>
        ) : query ? (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiCallOut title="Actual query sent to Elasticsearch" color="primary" iconType="info" size="s">
                  <p>
                    Changes to field boosts and search mode are reflected here. Use Tree View
                    to navigate with collapsible sections.
                  </p>
                </EuiCallOut>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="View mode"
                  options={viewModeButtons}
                  idSelected={modalViewMode}
                  onChange={(id) => setModalViewMode(id as ViewMode)}
                  buttonSize="compressed"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {modalViewMode === 'tree' ? (
              <JsonTreeView data={query} defaultExpandDepth={3} style={{ maxHeight: 500 }} />
            ) : (
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="m"
                overflowHeight={500}
                isCopyable
                isVirtualized={queryLines > 200}
              >
                {formattedQuery}
              </EuiCodeBlock>
            )}
          </>
        ) : (
          <EuiCallOut title="No query captured yet" color="warning" iconType="search">
            <p>Run a search to capture the Elasticsearch query.</p>
          </EuiCallOut>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {query && (
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={formattedQuery || ''}>
                    {(copy) => (
                      <EuiButtonEmpty iconType="copy" onClick={copy}>Copy Query</EuiButtonEmpty>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onClose} fill>Close</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

export default QueryInspector;
