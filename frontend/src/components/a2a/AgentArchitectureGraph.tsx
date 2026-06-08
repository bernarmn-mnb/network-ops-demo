import { API_PREFIX } from '../../services/apiBase'
import { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSkeletonText,
  EuiCard,
  EuiIcon,
  EuiBadge,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

interface AgentNode {
  id: string;
  name: string;
  description: string;
  type: 'coordinator' | 'agent' | 'tool';
  children: string[];
}

interface AgentGraph {
  nodes: AgentNode[];
}

// Helper to determine toolkit category from node ID
function getToolkitCategory(nodeId: string): 'local' | 'client' | 'agent_builder' | 'other' {
  if (nodeId.startsWith('local_') || nodeId === 'local_demo_toolkit') return 'local';
  if (nodeId.startsWith('client_') || nodeId === 'client_toolkit') return 'client';
  if (nodeId === 'agent_builder_toolkit') return 'agent_builder';
  return 'other';
}

// Get icon and color for toolkit category
function getToolkitStyle(nodeId: string): { icon: string; badgeColor: string; label: string } {
  const category = getToolkitCategory(nodeId);
  switch (category) {
    case 'local':
      return { icon: 'compute', badgeColor: 'success', label: 'Server' };
    case 'client':
      return { icon: 'desktop', badgeColor: 'warning', label: 'Browser' };
    case 'agent_builder':
      return { icon: 'logoElastic', badgeColor: 'accent', label: 'Kibana' };
    default:
      return { icon: 'user', badgeColor: 'default', label: 'Agent' };
  }
}

export const AgentArchitectureGraph = () => {
  const [graph, setGraph] = useState<AgentGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const response = await fetch(`${API_PREFIX}/api/agno/v2/structure`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent structure');
        }
        const data = await response.json();
        setGraph(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStructure();
  }, []);

  if (loading) return <EuiSkeletonText lines={3} />;
  if (error) return <EuiText color="danger">Error loading architecture: {error}</EuiText>;
  if (!graph) return null;

  // Helper to find node by ID
  const getNode = (id: string) => graph.nodes.find((n) => n.id === id || n.name === id);

  // Find root (coordinator)
  const coordinator = graph.nodes.find((n) => n.type === 'coordinator');

  if (!coordinator) return <EuiText>No coordinator found</EuiText>;

  return (
    <EuiPanel color="subdued" paddingSize="m">
      <EuiTitle size="s">
        <h3>Agent Team Architecture</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      
      {/* Coordinator Level */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <EuiCard
          icon={<EuiIcon type="node" size="l" />}
          title={coordinator.name}
          description={coordinator.description}
          layout="horizontal"
          display="subdued"
          paddingSize="s"
          style={{ display: 'inline-block', maxWidth: '380px' }}
        >
          <EuiBadge color="primary">COORDINATOR</EuiBadge>
        </EuiCard>
      </div>

      {/* Connection line */}
      <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
        <div style={{ width: '2px', height: '16px', background: 'var(--euiColorMediumShade)', margin: '0 auto' }}></div>
      </div>

      {/* Toolkits - horizontal layout, no wrap */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', overflowX: 'auto', padding: '4px' }}>
        {coordinator.children.map((childId) => {
          const childNode = getNode(childId);
          if (!childNode) return null;
          
          const toolkitStyle = getToolkitStyle(childNode.id);
          const isAgentBuilder = childNode.id === 'agent_builder_toolkit';
          
          return (
            <div key={childId} style={{ textAlign: 'center', minWidth: '140px', flex: '1 1 140px', maxWidth: '200px' }}>
              {/* Toolkit header */}
              <div style={{ 
                padding: '8px', 
                background: 'var(--euiColorLightestShade)', 
                borderRadius: '6px',
                border: '1px solid var(--euiColorLightShade)'
              }}>
                <EuiIcon type={toolkitStyle.icon} size="m" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  {childNode.name.replace(' Tools', '').replace(' Agents', '')}
                </div>
                <EuiBadge color={toolkitStyle.badgeColor}>{toolkitStyle.label}</EuiBadge>
              </div>
              
              {/* Tools/Agents list */}
              {childNode.children.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ width: '1px', height: '8px', background: 'var(--euiColorMediumShade)', margin: '0 auto' }}></div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '3px', 
                    alignItems: 'center',
                    marginTop: '6px',
                    maxHeight: '140px',
                    overflowY: 'auto'
                  }}>
                    {childNode.children.slice(0, 5).map(itemId => {
                      const itemNode = getNode(itemId);
                      return (
                        <EuiToolTip 
                          key={itemId}
                          content={itemNode?.description || itemId}
                          position="right"
                        >
                          <EuiBadge 
                            color={isAgentBuilder ? 'accent' : 
                                   toolkitStyle.badgeColor === 'success' ? 'success' : 
                                   toolkitStyle.badgeColor === 'warning' ? 'warning' : 'hollow'} 
                            iconType={isAgentBuilder ? 'user' : 'wrench'}
                            style={{ fontSize: '11px' }}
                          >
                            {itemId.length > 16 ? itemId.slice(0, 14) + '…' : itemId}
                          </EuiBadge>
                        </EuiToolTip>
                      );
                    })}
                    {childNode.children.length > 5 && (
                      <EuiText size="xs" color="subdued">
                        +{childNode.children.length - 5} more
                      </EuiText>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
