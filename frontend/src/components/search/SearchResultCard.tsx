/**
 * Simplified Search Result Card for Starter Template
 * 
 * A clean, minimal product card with:
 * - Product image
 * - Title and description
 * - Price and brand
 * - Click tracking
 * 
 * For the full-featured version with ranking explanation,
 * query rules, variants, etc., see the search-otel-ubi branch.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiSpacer,
  EuiImage,
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
}

export function SearchResultCard({
  source,
  id,
  score,
  highlight,
  position,
  onClick,
}: SearchResultCardProps) {
  // Extract common product fields (adjust based on your index mapping)
  const title = (source.title || source.name || 'Untitled') as string;
  const description = (source.description || '') as string;
  const imageUrl = (source.image_url || source.imageUrl || source.image || '') as string;
  const price = source.price as number | undefined;
  const brand = (source.brand || '') as string;
  const category = (source.category || '') as string;

  // Get highlighted title if available
  const displayTitle = highlight?.title?.[0] || highlight?.name?.[0] || title;

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(id, position);
    }
  };

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
