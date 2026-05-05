import { useState, useCallback, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';

interface JsonTreeViewProps {
  data: unknown;
  defaultExpandDepth?: number;
  startCollapsed?: boolean;
  style?: React.CSSProperties;
}

interface TreeNodeProps {
  keyName: string | null;
  value: unknown;
  depth: number;
  defaultExpandDepth: number;
  isLast: boolean;
  globalExpanded: boolean | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getPreview(value: unknown, maxLength = 60): string {
  if (isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.slice(0, 3).map(v => {
      if (typeof v === 'string') return `"${v}"`;
      if (isObject(v) || isArray(v)) return isArray(v) ? '[...]' : '{...}';
      return String(v);
    });
    const preview = `[${items.join(', ')}${value.length > 3 ? ', ...' : ''}]`;
    return preview.length > maxLength ? preview.slice(0, maxLength) + '...' : preview;
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const preview = `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''} }`;
    return preview.length > maxLength ? preview.slice(0, maxLength) + '...' : preview;
  }
  return String(value);
}

function TreeNode({ keyName, value, depth, defaultExpandDepth, isLast, globalExpanded }: TreeNodeProps) {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(() =>
    globalExpanded !== null ? globalExpanded : depth < defaultExpandDepth
  );

  // Sync local expand state with the parent's global expand-all/collapse-all
  // signal. We use useEffect (not useMemo) so the state update happens after
  // render and doesn't cause "setState during render" warnings or render loops.
  useEffect(() => {
    if (globalExpanded !== null) setIsExpanded(globalExpanded);
  }, [globalExpanded]);

  const isExpandable = isObject(value) || isArray(value);
  const isEmpty = isExpandable && (isArray(value) ? value.length === 0 : Object.keys(value as object).length === 0);

  const toggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

  const keyStyle: React.CSSProperties = { color: euiTheme.colors.primary, fontWeight: 500 };
  const stringStyle: React.CSSProperties = { color: euiTheme.colors.success };
  const numberStyle: React.CSSProperties = { color: euiTheme.colors.accent };
  const boolNullStyle: React.CSSProperties = { color: euiTheme.colors.warning, fontStyle: 'italic' };
  const bracketStyle: React.CSSProperties = { color: euiTheme.colors.subduedText };
  const previewStyle: React.CSSProperties = { color: euiTheme.colors.subduedText, fontStyle: 'italic', marginLeft: 8 };
  const indent = depth * 16;

  const renderValue = (val: unknown): JSX.Element => {
    if (val === null) return <span style={boolNullStyle}>null</span>;
    if (val === undefined) return <span style={boolNullStyle}>undefined</span>;
    if (typeof val === 'boolean') return <span style={boolNullStyle}>{String(val)}</span>;
    if (typeof val === 'number') return <span style={numberStyle}>{val}</span>;
    if (typeof val === 'string') return <span style={stringStyle}>"{val}"</span>;
    return <span>{String(val)}</span>;
  };

  if (!isExpandable) {
    return (
      <div style={{ paddingLeft: indent, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
        {keyName !== null && (
          <><span style={keyStyle}>"{keyName}"</span><span style={bracketStyle}>: </span></>
        )}
        {renderValue(value)}
        {!isLast && <span style={bracketStyle}>,</span>}
      </div>
    );
  }

  const entries = isArray(value)
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  const openBracket = isArray(value) ? '[' : '{';
  const closeBracket = isArray(value) ? ']' : '}';

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center' }}>
        {!isEmpty && (
          <EuiButtonIcon
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={toggleExpand}
            size="xs"
            color="text"
            style={{ marginRight: 4, marginLeft: -20 }}
          />
        )}
        {keyName !== null && (
          <><span style={keyStyle}>"{keyName}"</span><span style={bracketStyle}>: </span></>
        )}
        <span style={bracketStyle}>{openBracket}</span>
        {!isExpanded && !isEmpty && (
          <EuiToolTip content={`${entries.length} ${isArray(value) ? 'items' : 'properties'}`}>
            <span style={previewStyle} onClick={toggleExpand}>{getPreview(value)}</span>
          </EuiToolTip>
        )}
        {!isExpanded && !isEmpty && <span style={bracketStyle}>{closeBracket}</span>}
        {isEmpty && <span style={bracketStyle}>{closeBracket}</span>}
        {!isExpanded && !isLast && <span style={bracketStyle}>,</span>}
      </div>

      {isExpanded && !isEmpty && (
        <>
          {entries.map(([k, v], index) => (
            <TreeNode
              key={k}
              keyName={isArray(value) ? null : k}
              value={v}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
              isLast={index === entries.length - 1}
              globalExpanded={globalExpanded}
            />
          ))}
          <div style={{ paddingLeft: indent }}>
            <span style={bracketStyle}>{closeBracket}</span>
            {!isLast && <span style={bracketStyle}>,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonTreeView({ data, defaultExpandDepth = 2, startCollapsed = false, style }: JsonTreeViewProps) {
  const { euiTheme } = useEuiTheme();
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);

  const expandAll = useCallback(() => {
    setGlobalExpanded(true);
    setTimeout(() => setGlobalExpanded(null), 0);
  }, []);

  const collapseAll = useCallback(() => setGlobalExpanded(false), []);

  return (
    <div style={style}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" style={{ marginBottom: 8 }}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Expand all">
            <EuiButtonIcon iconType="expand" aria-label="Expand all" onClick={expandAll} size="xs" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Collapse all">
            <EuiButtonIcon iconType="minimize" aria-label="Collapse all" onClick={collapseAll} size="xs" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">Click arrows to expand/collapse</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div style={{
        backgroundColor: euiTheme.colors.body,
        border: `1px solid ${euiTheme.border.color}`,
        borderRadius: euiTheme.border.radius.medium,
        padding: 12,
        paddingLeft: 28,
        overflow: 'auto',
        maxHeight: 400,
      }}>
        <TreeNode
          keyName={null}
          value={data}
          depth={0}
          defaultExpandDepth={startCollapsed ? 0 : defaultExpandDepth}
          isLast={true}
          globalExpanded={globalExpanded}
        />
      </div>
    </div>
  );
}

export default JsonTreeView;
