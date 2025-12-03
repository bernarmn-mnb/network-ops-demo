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
  EuiColorPicker,
  EuiFilePicker,
  EuiCard,
  EuiIcon,
  EuiCallOut,
  EuiImage,
  EuiBadge,
  EuiHorizontalRule,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { useNavigate } from 'react-router-dom'

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
// Helper: Convert file to base64 data URL
// ============================================================================

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  
  const modalTitleId = useGeneratedHtmlId()

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

  const handleLogoUpload = async (files: FileList | null, mode: 'light' | 'dark') => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    try {
      const dataUrl = await fileToDataUrl(file)
      setFormData(prev => ({
        ...prev,
        [mode === 'light' ? 'logoLight' : 'logoDark']: {
          url: dataUrl,
          alt: prev.name || 'Logo',
        },
      }))
    } catch {
      setError('Failed to read logo file')
    }
  }

  return (
    <EuiModal onClose={onClose} style={{ width: 600 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {isNew ? 'Create New Brand' : `Edit: ${brand?.name}`}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {error && (
          <>
            <EuiCallOut title={error} color="danger" iconType="error" size="s" />
            <EuiSpacer size="m" />
          </>
        )}

        {/* Basic Info */}
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow label="Brand ID" helpText="Lowercase, no spaces">
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
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Display Name">
              <EuiFieldText
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Brand"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="l" />

        {/* Colors */}
        <EuiTitle size="xs"><h4>Colors</h4></EuiTitle>
        <EuiSpacer size="m" />
        
        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem grow={false} style={{ width: 140 }}>
            <EuiFormRow label="Primary">
              <EuiColorPicker
                color={formData.colors.primary}
                onChange={color => setFormData(prev => ({
                  ...prev,
                  colors: { ...prev.colors, primary: color }
                }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 140 }}>
            <EuiFormRow label="Accent">
              <EuiColorPicker
                color={formData.colors.accent}
                onChange={color => setFormData(prev => ({
                  ...prev,
                  colors: { ...prev.colors, accent: color }
                }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 140 }}>
            <EuiFormRow label="Background">
              <EuiColorPicker
                color={formData.colors.background}
                onChange={color => setFormData(prev => ({
                  ...prev,
                  colors: { ...prev.colors, background: color }
                }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 140 }}>
            <EuiFormRow label="Text">
              <EuiColorPicker
                color={formData.colors.text}
                onChange={color => setFormData(prev => ({
                  ...prev,
                  colors: { ...prev.colors, text: color }
                }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="l" />

        {/* Logos */}
        <EuiTitle size="xs"><h4>Logos</h4></EuiTitle>
        <EuiSpacer size="m" />
        
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiFormRow label="Light Mode Logo" helpText="For light backgrounds">
              <EuiFilePicker
                accept="image/*"
                onChange={files => handleLogoUpload(files, 'light')}
                display="default"
              />
            </EuiFormRow>
            {formData.logoLight.url && (
              <div style={{ marginTop: 8, padding: 16, backgroundColor: '#fff', borderRadius: 4 }}>
                <EuiImage src={formData.logoLight.url} alt="Light logo preview" style={{ maxHeight: 40 }} />
              </div>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Dark Mode Logo" helpText="For dark backgrounds">
              <EuiFilePicker
                accept="image/*"
                onChange={files => handleLogoUpload(files, 'dark')}
                display="default"
              />
            </EuiFormRow>
            {formData.logoDark.url && (
              <div style={{ marginTop: 8, padding: 16, backgroundColor: '#1D1E24', borderRadius: 4 }}>
                <EuiImage src={formData.logoDark.url} alt="Dark logo preview" style={{ maxHeight: 40 }} />
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="l" />

        {/* Preview */}
        <EuiTitle size="xs"><h4>Preview</h4></EuiTitle>
        <EuiSpacer size="m" />
        
        <EuiPanel 
          style={{ 
            backgroundColor: formData.colors.background,
            border: `1px solid ${formData.colors.primary}20`,
          }}
          paddingSize="l"
        >
          <EuiFlexGroup alignItems="center" gutterSize="m">
            {formData.logoLight.url && (
              <EuiFlexItem grow={false}>
                <EuiImage src={formData.logoLight.url} alt="Logo" style={{ height: 32 }} />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText style={{ color: formData.colors.text }}>
                <strong>{formData.name || 'Brand Name'}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                style={{ 
                  backgroundColor: formData.colors.primary,
                  borderColor: formData.colors.primary,
                }}
              >
                Primary Button
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                style={{ 
                  backgroundColor: formData.colors.accent,
                  borderColor: formData.colors.accent,
                  color: '#fff',
                }}
              >
                Accent Button
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
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
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete brand "${id}"? This cannot be undone.`)) return
    
    try {
      await deleteBrand(id)
      await loadBrands()
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

