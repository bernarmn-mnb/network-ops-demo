/**
 * Product Detail Modal — generic product details for search and visual search.
 * Shows image, title, price, description, and optional link to product page.
 */

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';

export interface ProductDetailConfig {
  /** Locale for number formatting (default: 'en-US') */
  locale?: string
  /** Currency code (default: 'USD') */
  currency?: string
  /** Link text for external product URL (default: 'View product') */
  productLinkText?: string
  /** Custom sections rendered after the standard fields */
  customSections?: Array<{
    id: string
    title: string
    render: (source: Record<string, unknown>) => React.ReactNode | null
  }>
}

interface ProductDetailModalProps {
  source: Record<string, unknown>;
  highlight?: Record<string, string[]> | null;
  onClose: () => void;
  config?: ProductDetailConfig;
}

function extractField(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = source[key];
    if (typeof val === 'string' && val) return val;
  }
  return '';
}

function extractCategory(source: Record<string, unknown>): string[] {
  const raw = source.category;
  if (!raw || typeof raw !== 'object') {
    return raw ? [String(raw)] : [];
  }
  const cat = raw as Record<string, string | null>;
  return [cat.l1, cat.l2, cat.l3, cat.l4].filter((v): v is string => !!v);
}

function formatCurrency(value: unknown, locale = 'en-US', currency = 'USD'): string | null {
  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }
  if (typeof value === 'string' && value) return value;
  return null;
}

export function ProductDetailModal({ source, highlight, onClose, config }: ProductDetailModalProps) {
  const name = extractField(source, 'name', 'title', 'product_name');
  const description = extractField(source, 'description', 'desc', 'summary');
  const brand = extractField(source, 'brand', 'manufacturer', 'vendor');
  const imageUrl = extractField(source, 'image_url', 'imageUrl', 'image', 'thumbnail');
  const url = extractField(source, 'url', 'link', 'product_url');
  const categories = extractCategory(source);

  const price = formatCurrency(
    source.price_usd ?? source.price_gbp ?? source.price,
    config?.locale,
    config?.currency,
  );
  const displayName = highlight?.name?.[0] || highlight?.title?.[0] || name || 'Product Details';

  const detailItems: Array<{ title: NonNullable<React.ReactNode>; description: NonNullable<React.ReactNode> }> = [];
  if (brand) detailItems.push({ title: 'Brand', description: brand });

  return (
    <EuiModal onClose={onClose} style={{ maxWidth: 800, width: '90vw' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <span dangerouslySetInnerHTML={{ __html: displayName }} />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup gutterSize="l" responsive>
          {imageUrl && (
            <EuiFlexItem grow={false} style={{ minWidth: 280, maxWidth: 340 }}>
              <div
                style={{
                  background: 'var(--euiColorLightestShade)',
                  borderRadius: 'var(--euiBorderRadiusMedium, 6px)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EuiImage
                  src={imageUrl}
                  alt={name}
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
                />
              </div>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            {price && (
              <>
                <EuiText>
                  <span
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--euiColorPrimary)',
                    }}
                  >
                    {price}
                  </span>
                </EuiText>
                <EuiSpacer size="s" />
              </>
            )}

            {detailItems.length > 0 && (
              <>
                <EuiDescriptionList
                  type="column"
                  listItems={detailItems}
                  compressed
                  style={{ maxWidth: 320 }}
                />
                <EuiSpacer size="s" />
              </>
            )}

            {categories.length > 0 && (
              <>
                <EuiFlexGroup gutterSize="xs" wrap alignItems="center">
                  {categories.map((cat) => (
                    <EuiFlexItem key={cat} grow={false}>
                      <EuiBadge color="hollow">{cat}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </>
            )}

            {description && (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiText size="s">
                  <p>{description}</p>
                </EuiText>
              </>
            )}

            {config?.customSections?.map((section) => {
              const content = section.render(source);
              if (!content) return null;
              return (
                <div key={section.id}>
                  <EuiHorizontalRule margin="s" />
                  <EuiTitle size="xxs"><h4>{section.title}</h4></EuiTitle>
                  <EuiSpacer size="s" />
                  {content}
                </div>
              );
            })}

            {url && (
              <>
                <EuiSpacer size="m" />
                <EuiLink href={url} target="_blank" external>
                  {config?.productLinkText || 'View product'}
                </EuiLink>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
}

export default ProductDetailModal;
