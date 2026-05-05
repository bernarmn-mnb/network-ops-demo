import { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiToolTip,
  EuiHorizontalRule,
  EuiBadge,
} from '@elastic/eui';

// =============================================================================
// Types
// =============================================================================

export interface FieldBoostConfig {
  field: string;
  label: string;
  defaultBoost: number;
}

export interface QueryTuningState {
  fieldBoosts: Record<string, number>;
  semanticWeight: number;
}

interface QueryTuningPanelProps {
  fields: FieldBoostConfig[];
  state: QueryTuningState;
  searchMode: string;
  onChange: (state: QueryTuningState) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function buildDefaultState(fields: FieldBoostConfig[]): QueryTuningState {
  return {
    fieldBoosts: Object.fromEntries(fields.map(f => [f.field, f.defaultBoost])),
    semanticWeight: 50,
  };
}

export function makeDefaultTuningState(fields: FieldBoostConfig[]): QueryTuningState {
  return buildDefaultState(fields);
}

function hasChanges(state: QueryTuningState, fields: FieldBoostConfig[]): boolean {
  const defaults = buildDefaultState(fields);
  const boostChanged = fields.some(f => state.fieldBoosts[f.field] !== defaults.fieldBoosts[f.field]);
  const weightChanged = state.semanticWeight !== defaults.semanticWeight;
  return boostChanged || weightChanged;
}

// =============================================================================
// Component
// =============================================================================

export function QueryTuningPanel({ fields, state, searchMode, onChange }: QueryTuningPanelProps) {
  const isHybrid = searchMode === 'hybrid';
  const changed = hasChanges(state, fields);

  const handleBoostChange = useCallback((field: string, value: number) => {
    onChange({ ...state, fieldBoosts: { ...state.fieldBoosts, [field]: value } });
  }, [state, onChange]);

  const handleSemanticWeightChange = useCallback((value: number) => {
    onChange({ ...state, semanticWeight: value });
  }, [state, onChange]);

  const handleReset = useCallback(() => {
    onChange(buildDefaultState(fields));
  }, [fields, onChange]);

  return (
    <EuiPanel paddingSize="m" hasBorder>
      {/* Header */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>Query Tuning</h4>
          </EuiTitle>
        </EuiFlexItem>
        {changed && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" iconType="refresh" onClick={handleReset}>
              Reset
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Field Boosts — hidden in pure semantic mode */}
      {searchMode === 'semantic' ? (
        <EuiText size="xs" color="subdued">
          <p style={{ margin: 0 }}>Field weights apply to keyword matching only and are not used in semantic mode.</p>
        </EuiText>
      ) : (
        <>
          <EuiText size="xs" color="subdued">
            <strong>Field Weights</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" style={{ marginBottom: 8 }}>
            Higher = more influence on ranking
          </EuiText>
        </>
      )}

      {searchMode !== 'semantic' && fields.map(f => {
        const value = state.fieldBoosts[f.field] ?? f.defaultBoost;
        const isDefault = value === f.defaultBoost;
        return (
          <div key={f.field} style={{ marginBottom: 14 }}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>{f.label}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={isDefault ? 'Default' : 'Modified'}>
                  <EuiBadge color={isDefault ? 'hollow' : 'primary'}>
                    {value.toFixed(1)}×
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiRange
              min={0}
              max={5}
              step={0.5}
              value={value}
              onChange={(e) => handleBoostChange(f.field, Number(e.currentTarget.value))}
              showInput={false}
              showLabels={false}
              fullWidth
              compressed
              aria-label={`${f.label} field weight`}
            />
          </div>
        );
      })}

      {/* Hybrid weight — only in hybrid mode */}
      {isHybrid && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs" color="subdued">
            <strong>Hybrid Balance</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" style={{ marginBottom: 8 }}>
            Text (BM25) ←→ Semantic
          </EuiText>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} style={{ marginBottom: 4 }}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">Text</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiRange
                min={0}
                max={100}
                step={5}
                value={state.semanticWeight}
                onChange={(e) => handleSemanticWeightChange(Number(e.currentTarget.value))}
                showInput={false}
                showLabels={false}
                fullWidth
                compressed
                aria-label="Hybrid semantic weight"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">Semantic</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" style={{ textAlign: 'center' }}>
            {state.semanticWeight === 50
              ? 'Balanced (50/50)'
              : state.semanticWeight > 50
              ? `Semantic-leaning (${state.semanticWeight}%)`
              : `Text-leaning (${100 - state.semanticWeight}%)`}
          </EuiText>
        </>
      )}

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p style={{ margin: 0 }}>
          Each slider change re-runs the search automatically. Use Query Inspector below to see the effect on the ES query.
        </p>
      </EuiText>
    </EuiPanel>
  );
}

export default QueryTuningPanel;
