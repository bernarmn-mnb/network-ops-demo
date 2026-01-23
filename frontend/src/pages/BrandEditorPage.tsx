import { useState, useEffect, useCallback } from 'react'
import {
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiFieldText,
  EuiFormRow,
  EuiCard,
  EuiIcon,
  EuiCallOut,
  EuiBadge,
  EuiHorizontalRule,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiLoadingSpinner,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../components/providers/BrandedThemeProvider'

/**
 * Brand Editor Page
 * 
 * Simple UI for creating and editing brand themes.
 * Stores brands in backend JSON file.
 * 
 * Features:
 * - List existing brands
 * - Create new brand with colors + logos
 * - Edit existing brands
 * - Live preview
 */

// ============================================================================
// Types (matching backend models)
// ============================================================================

interface BrandColors {
  primary: string
  accent: string
  background: string
  text: string
}

interface BrandLogo {
  url: string
  alt: string
}

interface Brand {
  id: string
  name: string
  colors: BrandColors
  logoLight: BrandLogo
  logoDark: BrandLogo
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch('/api/branding/')
  if (!response.ok) throw new Error('Failed to fetch brands')
  return response.json()
}

async function createBrand(brand: Omit<Brand, 'createdAt' | 'updatedAt'>): Promise<Brand> {
  const response = await fetch('/api/branding/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brand),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create brand')
  }
  return response.json()
}

async function updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
  const response = await fetch(`/api/branding/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brand),
  })
  if (!response.ok) throw new Error('Failed to update brand')
  return response.json()
}

async function deleteBrand(id: string): Promise<void> {
  const response = await fetch(`/api/branding/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete brand')
  }
}

// ============================================================================
// Brand Card Component
// ============================================================================

function BrandCard({ 
  brand, 
  onEdit, 
  onDelete,
  onPreview,
}: { 
  brand: Brand
  onEdit: () => void
  onDelete: () => void
  onPreview: () => void
}) {
  return (
    <EuiCard
      title={brand.name}
      titleSize="xs"
      footer={
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={onPreview}>
              Preview
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={onEdit}>
              Edit
            </EuiButtonEmpty>
          </EuiFlexItem>
          {brand.id !== 'default' && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" color="danger" onClick={onDelete}>
                Delete
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      paddingSize="m"
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: brand.colors.primary,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: brand.colors.accent,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {brand.id === 'default' && <EuiBadge color="hollow">Default</EuiBadge>}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  )
}

// ============================================================================
// Brand Editor Modal
// ============================================================================

function BrandEditorModal({
  brand,
  isNew,
  onSave,
  onClose,
}: {
  brand: Brand | null
  isNew: boolean
  onSave: (brand: Brand) => Promise<void>
  onClose: () => void
}) {
  const [formData, setFormData] = useState<Brand>(
    brand || {
      id: '',
      name: '',
      colors: {
        primary: '#0077CC',
        accent: '#00BFB3',
        background: '#FFFFFF',
        text: '#1A1C21',
      },
      logoLight: { url: '', alt: 'Logo' },
      logoDark: { url: '', alt: 'Logo' },
    }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      setError('ID and Name are required')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await onSave(formData)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isNew ? 'Create New Brand' : `Edit: ${brand?.name}`}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {error && (
          <>
            <EuiCallOut title={error} color="danger" iconType="alert" size="s" />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFormRow label="Brand ID" helpText="Lowercase, no spaces (e.g., my-brand)">
          <EuiFieldText
            value={formData.id}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              id: e.target.value.toLowerCase().replace(/\s/g, '-') 
            }))}
            disabled={!isNew}
            placeholder="my-brand"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label="Display Name">
          <EuiFieldText
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Brand"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="l" />
        
        <EuiTitle size="xs"><h4>Colors</h4></EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow label="Primary Color" helpText="Main brand color for buttons and links">
          <EuiFieldText
            value={formData.colors.primary}
            onChange={e => setFormData(prev => ({
              ...prev,
              colors: { ...prev.colors, primary: e.target.value }
            }))}
            placeholder="#0077CC"
            prepend={
              <div style={{ 
                width: 24, 
                height: 24, 
                backgroundColor: formData.colors.primary,
                borderRadius: 4,
                border: '1px solid #ccc'
              }} />
            }
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label="Accent Color" helpText="Secondary highlight color">
          <EuiFieldText
            value={formData.colors.accent}
            onChange={e => setFormData(prev => ({
              ...prev,
              colors: { ...prev.colors, accent: e.target.value }
            }))}
            placeholder="#00BFB3"
            prepend={
              <div style={{ 
                width: 24, 
                height: 24, 
                backgroundColor: formData.colors.accent,
                borderRadius: 4,
                border: '1px solid #ccc'
              }} />
            }
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label="Background Color">
          <EuiFieldText
            value={formData.colors.background}
            onChange={e => setFormData(prev => ({
              ...prev,
              colors: { ...prev.colors, background: e.target.value }
            }))}
            placeholder="#FFFFFF"
            prepend={
              <div style={{ 
                width: 24, 
                height: 24, 
                backgroundColor: formData.colors.background,
                borderRadius: 4,
                border: '1px solid #ccc'
              }} />
            }
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label="Text Color">
          <EuiFieldText
            value={formData.colors.text}
            onChange={e => setFormData(prev => ({
              ...prev,
              colors: { ...prev.colors, text: e.target.value }
            }))}
            placeholder="#1A1C21"
            prepend={
              <div style={{ 
                width: 24, 
                height: 24, 
                backgroundColor: formData.colors.text,
                borderRadius: 4,
                border: '1px solid #ccc'
              }} />
            }
          />
        </EuiFormRow>

        <EuiSpacer size="l" />
        
        {/* Live Preview */}
        <EuiPanel 
          paddingSize="m"
          style={{ 
            backgroundColor: formData.colors.background,
            border: `2px solid ${formData.colors.primary}`,
          }}
        >
          <EuiText size="s" style={{ color: formData.colors.text }}>
            <strong>{formData.name || 'Brand Name'}</strong>
            <p style={{ margin: '8px 0 0 0' }}>Preview of your brand colors</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton 
            size="s"
            style={{ 
              backgroundColor: formData.colors.primary,
              borderColor: formData.colors.primary,
              color: '#fff'
            }}
          >
            Primary
          </EuiButton>
          {' '}
          <EuiButton 
            size="s"
            style={{ 
              backgroundColor: formData.colors.accent,
              borderColor: formData.colors.accent,
              color: '#fff'
            }}
          >
            Accent
          </EuiButton>
        </EuiPanel>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton fill onClick={handleSave} isLoading={saving}>
          {isNew ? 'Create Brand' : 'Save Changes'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export function BrandEditorPage() {
  const navigate = useNavigate()
  const { refreshBrands: refreshGlobalBrands } = useBrand()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const loadBrands = useCallback(async () => {
    try {
      const data = await fetchBrands()
      setBrands(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brands')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  const handleSave = async (brand: Brand) => {
    if (isCreating) {
      await createBrand(brand)
    } else {
      await updateBrand(brand.id, brand)
    }
    await loadBrands()
    // Also refresh the global brand context so the switcher updates
    await refreshGlobalBrands()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete brand "${id}"? This cannot be undone.`)) return
    
    try {
      await deleteBrand(id)
      await loadBrands()
      // Also refresh the global brand context
      await refreshGlobalBrands()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const handlePreview = (brand: Brand) => {
    // Navigate to branded demo with this brand
    navigate(`/branded?brand=${brand.id}`)
  }

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate restrictWidth={1000} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Header */}
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="brush" size="xl" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="l">
                    <h1>Brand Editor</h1>
                  </EuiTitle>
                  <EuiText color="subdued">
                    <p>Create and manage brand themes</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <PageInfoButton {...PAGE_INFO.brands} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="plus"
                    onClick={() => {
                      setIsCreating(true)
                      setEditingBrand(null)
                    }}
                  >
                    New Brand
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Error display */}
          {error && (
            <>
              <EuiCallOut title={error} color="danger" iconType="error" />
              <EuiSpacer size="m" />
            </>
          )}

          {/* Loading state */}
          {loading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <>
              {/* Brand Cards Grid */}
              <EuiFlexGroup gutterSize="l" wrap>
                {brands.map(brand => (
                  <EuiFlexItem key={brand.id} grow={false} style={{ width: 280 }}>
                    <BrandCard
                      brand={brand}
                      onEdit={() => {
                        setIsCreating(false)
                        setEditingBrand(brand)
                      }}
                      onDelete={() => handleDelete(brand.id)}
                      onPreview={() => handlePreview(brand)}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>

              {brands.length === 0 && (
                <EuiPanel color="subdued" paddingSize="l">
                  <EuiText textAlign="center" color="subdued">
                    <p>No brands yet. Create your first brand to get started.</p>
                  </EuiText>
                </EuiPanel>
              )}
            </>
          )}

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Vibe coding tip */}
          <EuiCallOut 
            title="Pro tip: AI-powered branding" 
            iconType="sparkles"
            color="primary"
          >
            <EuiText size="s">
              <p>
                For more advanced branding (custom fonts, extracted from websites), 
                use vibe coding! Tell your AI assistant:
              </p>
              <EuiSpacer size="s" />
              <code>"Extract branding from [website URL] and create a theme file"</code>
              <EuiSpacer size="s" />
              <p>
                See <code>hive-mind/patterns/branding/</code> for patterns.
              </p>
            </EuiText>
          </EuiCallOut>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      {/* Editor Modal */}
      {(editingBrand || isCreating) && (
        <BrandEditorModal
          brand={editingBrand}
          isNew={isCreating}
          onSave={handleSave}
          onClose={() => {
            setEditingBrand(null)
            setIsCreating(false)
          }}
        />
      )}
    </>
  )
}

