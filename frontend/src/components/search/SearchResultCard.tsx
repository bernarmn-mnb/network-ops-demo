/**
 * Search Result Card for Starter Template
 * 
 * Supports two modes:
 * 1. Configured mode: Shows product card with title, image, price, etc.
 * 2. Generic mode: Shows raw JSON when fields don't match expected structure
 * 
 * The card automatically detects if expected fields exist and falls back
 * to generic mode if the index hasn't been configured yet.
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

interface SearchResultCardProps {
  /** Raw document from Elasticsearch */
  source: Record<string, unknown>;
  /** Document ID */
  id: string;
  /** Relevance score */
  score?: number | null;
  /** Highlighted fields */
  highlight?: Record<string, string[]> | null;
  /** Position in results (1-indexed) */
  position: number;
  /** Current search query (for analytics attribution) */
  searchQuery?: string;
  /** Click handler */
  onClick?: (id: string, position: number) => void;
  /** Force generic mode (for unconfigured indexes) */
  forceGenericMode?: boolean;
}

/**
 * Check if the source has recognizable product fields
 */
function hasKnownFields(source: Record<string, unknown>): boolean {
  // Check for common title fields
  const hasTitleField = !!(
    source.title || 
    source.name || 
    source.product_name || 
    source.item_name ||
    source.headline
  );
  
  // If we have at least a title-like field, consider it configured
  return hasTitleField;
}

/**
 * Extract the best available title from the source
 */
function extractTitle(source: Record<string, unknown>): string {
  return (
    source.title ||
    source.name ||
    source.product_name ||
    source.item_name ||
    source.headline ||
    source.label ||
    ''
  ) as string;
}

/**
 * Extract the best available description
 */
function extractDescription(source: Record<string, unknown>): string {
  return (
    source.description ||
    source.desc ||
    source.summary ||
    source.body ||
    source.content ||
    source.text ||
    ''
  ) as string;
}

/**
 * Extract the best available image URL
 */
function extractImageUrl(source: Record<string, unknown>): string {
  return (
    source.image_url ||
    source.imageUrl ||
    source.image ||
    source.img ||
    source.photo ||
    source.thumbnail ||
    source.picture ||
    ''
  ) as string;
}

export function SearchResultCard({
  source,
  id,
  score,
  highlight,
  position,
  onClick,
  forceGenericMode = false,
}: SearchResultCardProps) {
  // Determine if we should use generic mode
  const useGenericMode = forceGenericMode || !hasKnownFields(source);

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(id, position);
    }
  };

  // Generic mode: Show raw JSON
  if (useGenericMode) {
    // Get first few meaningful fields for preview
    const previewFields = Object.entries(source)
      .filter(([key]) => !key.startsWith('_'))
      .slice(0, 4);

    return (
      <EuiCard
        title=""
        onClick={handleClick}
        paddingSize="s"
        hasBorder
        style={{ height: '100%', cursor: 'pointer' }}
      >
        {/* Document ID */}
        <EuiToolTip content={`Document ID: ${id}`}>
          <EuiBadge color="hollow" style={{ marginBottom: 8 }}>
            #{position}
          </EuiBadge>
        </EuiToolTip>

        {/* Preview fields */}
        {previewFields.map(([key, value]) => (
          <div key={key} style={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued">
              <strong>{key}:</strong>
            </EuiText>
            <EuiText size="xs">
              {typeof value === 'string' 
                ? value.length > 100 ? value.substring(0, 100) + '...' : value
                : JSON.stringify(value)?.substring(0, 100)}
            </EuiText>
          </div>
        ))}

        <EuiSpacer size="s" />

        {/* Full JSON (collapsed) */}
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="s"
          overflowHeight={120}
          isCopyable
        >
          {JSON.stringify(source, null, 2)}
        </EuiCodeBlock>

        {/* Score */}
        {score !== undefined && score !== null && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              Score: {score.toFixed(2)}
            </EuiText>
          </>
        )}
      </EuiCard>
    );
  }

  // Configured mode: Show product card
  const title = extractTitle(source);
  const description = extractDescription(source);
  const imageUrl = extractImageUrl(source);
  const price = source.price as number | undefined;
  const brand = (source.brand || source.manufacturer || source.vendor || '') as string;
  const category = (source.category || source.type || source.department || '') as string;

  // Get highlighted title if available
  const displayTitle = highlight?.title?.[0] || highlight?.name?.[0] || title || 'Untitled';

  // Format price
  const formatPrice = (value: number | undefined) => {
    if (value === undefined || value === null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <EuiCard
      title=""
      onClick={handleClick}
      paddingSize="s"
      hasBorder
      style={{ height: '100%', cursor: 'pointer' }}
    >
      {/* Product Image */}
      {imageUrl && (
        <>
          <EuiImage
            src={imageUrl}
            alt={title}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'contain',
              backgroundColor: '#f5f5f5',
              borderRadius: 4,
            }}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {/* Brand Badge */}
      {brand && (
        <>
          <EuiBadge color="hollow">{brand}</EuiBadge>
          <EuiSpacer size="xs" />
        </>
      )}

      {/* Title */}
      <EuiText size="s">
        <strong dangerouslySetInnerHTML={{ __html: displayTitle }} />
      </EuiText>

      {/* Description (truncated) */}
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              margin: 0,
            }}>
              {description}
            </p>
          </EuiText>
        </>
      )}

      <EuiSpacer size="s" />

      {/* Price and Category */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          {price !== undefined && (
            <EuiText size="m">
              <strong>{formatPrice(price)}</strong>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {category && (
            <EuiBadge color="default">{category}</EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Score (for debugging - can be removed in production) */}
      {score !== undefined && score !== null && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            Score: {score.toFixed(2)}
          </EuiText>
        </>
      )}
    </EuiCard>
  );
}

export default SearchResultCard;
