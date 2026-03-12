/**
 * Search Result Card — Config-Driven
 *
 * Renders a product card using field mappings from searchConfig.display.
 * Falls back to raw JSON mode for unconfigured indexes.
 *
 * Demos can override rendering entirely via the `renderResult` prop
 * on SearchPageSimple, or customize field mapping via `displayConfig` prop.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiSpacer,
  EuiImage,
  EuiCodeBlock,
  EuiToolTip,
} from '@elastic/eui';
import { searchConfig, formatPrice } from '../../config/searchConfig';
import type { DisplayFieldsConfig } from '../../config/searchConfig';

export interface SearchResultCardProps {
  /** Raw document from Elasticsearch */
  source: Record<string, unknown>;
  /** Document ID */
  id: string;
  /** Relevance score */
  score?: number | null;
  /** Highlighted fields from ES */
  highlight?: Record<string, string[]> | null;
  /** Position in results (1-indexed) */
  position: number;
  /** Current search query (for analytics) */
  searchQuery?: string;
  /** Click handler */
  onClick?: (id: string, position: number) => void;
  /** Force generic mode (for unconfigured indexes) */
  forceGenericMode?: boolean;
  /** Override the global display field mapping */
  displayConfig?: DisplayFieldsConfig;
}

/** Resolve a potentially nested field path (e.g., "category.l1") from source */
export function resolveField(source: Record<string, unknown>, fieldPath: string): unknown {
  const parts = fieldPath.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Get a string value from source using the display config field name, with highlight support */
export function getDisplayValue(
  source: Record<string, unknown>,
  fieldName: string | undefined,
  highlight?: Record<string, string[]> | null,
): string {
  if (!fieldName) return '';
  const highlighted = highlight?.[fieldName]?.[0];
  if (highlighted) return highlighted;
  const raw = resolveField(source, fieldName);
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  return '';
}

export function SearchResultCard({
  source,
  id,
  score,
  highlight,
  position,
  onClick,
  forceGenericMode = false,
  displayConfig,
}: SearchResultCardProps) {
  const display = displayConfig ?? searchConfig.display;
  const isGeneric = forceGenericMode || !resolveField(source, display.title);

  const handleClick = () => onClick?.(id, position);

  // Generic mode: raw JSON preview
  if (isGeneric) {
    const previewFields = Object.entries(source)
      .filter(([key]) => !key.startsWith('_'))
      .slice(0, 4);

    return (
      <EuiCard title="" onClick={handleClick} paddingSize="s" hasBorder style={{ height: '100%', cursor: 'pointer' }}>
        <EuiToolTip content={`Document ID: ${id}`}>
          <EuiBadge color="hollow" style={{ marginBottom: 8 }}>#{position}</EuiBadge>
        </EuiToolTip>
        {previewFields.map(([key, value]) => (
          <div key={key} style={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued"><strong>{key}:</strong></EuiText>
            <EuiText size="xs">
              {typeof value === 'string'
                ? value.length > 100 ? value.substring(0, 100) + '...' : value
                : JSON.stringify(value)?.substring(0, 100)}
            </EuiText>
          </div>
        ))}
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" overflowHeight={120} isCopyable>
          {JSON.stringify(source, null, 2)}
        </EuiCodeBlock>
        {score != null && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">Score: {score.toFixed(2)}</EuiText>
          </>
        )}
      </EuiCard>
    );
  }

  // Config-driven mode
  const title = getDisplayValue(source, display.title, highlight);
  const subtitle = getDisplayValue(source, display.subtitle);
  const description = getDisplayValue(source, display.description);
  const imageUrl = getDisplayValue(source, display.image);
  const priceRaw = display.price ? resolveField(source, display.price) : undefined;
  const priceFormatted = typeof priceRaw === 'number' ? formatPrice(priceRaw) : typeof priceRaw === 'string' ? priceRaw : null;
  const badges = (display.badges ?? [])
    .map(f => {
      const v = resolveField(source, f);
      return typeof v === 'string' ? v : null;
    })
    .filter(Boolean) as string[];

  return (
    <EuiCard title="" onClick={handleClick} paddingSize="s" hasBorder style={{ height: '100%', cursor: 'pointer' }}>
      {imageUrl && (
        <>
          <EuiImage
            src={imageUrl}
            alt={title || 'Product image'}
            style={{ width: '100%', height: 180, objectFit: 'contain', backgroundColor: '#f5f5f5', borderRadius: 4 }}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {subtitle && (
        <>
          <EuiBadge color="hollow">{subtitle}</EuiBadge>
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiText size="s">
        <strong dangerouslySetInnerHTML={{ __html: title || 'Untitled' }} />
      </EuiText>
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>
              {description}
            </p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          {priceFormatted && (
            <EuiText size="m"><strong>{priceFormatted}</strong></EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" wrap>
            {badges.map(badge => (
              <EuiFlexItem key={badge} grow={false}>
                <EuiBadge color="default">{badge}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {score != null && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">Score: {score.toFixed(2)}</EuiText>
        </>
      )}
    </EuiCard>
  );
}

export default SearchResultCard;
