import { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiBadge,
  EuiSpacer,
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

export const AgentArchitectureGraph = () => {
  const [graph, setGraph] = useState<AgentGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const response = await fetch('/api/agno/structure');
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

  const renderNode = (nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) return null;

    return (
      <EuiFlexItem key={node.id} grow={false} style={{ minWidth: 250 }}>
        <EuiCard
          icon={<EuiIcon type={node.type === 'tool' ? 'wrench' : 'user'} size="l" />}
          title={node.name}
          description={node.description}
          layout="horizontal"
          display="subdued"
        >
          {node.type !== 'tool' && (
            <EuiBadge color={node.type === 'coordinator' ? 'primary' : 'accent'}>
              {node.type.toUpperCase()}
            </EuiBadge>
          )}
        </EuiCard>
      </EuiFlexItem>
    );
  };

  return (
    <EuiPanel color="subdued">
      <EuiTitle size="s">
        <h3>Agent Team Architecture</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      
      {/* Coordinator Level */}
      <EuiFlexGroup gutterSize="l" justifyContent="center">
        {renderNode(coordinator.id)}
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <div style={{ textAlign: 'center', borderLeft: '2px dashed #ccc', height: '20px', width: '0', margin: '0 auto' }}></div>
      <EuiSpacer size="l" />

      {/* Sub-agents Level */}
      <EuiFlexGroup gutterSize="l" justifyContent="center" wrap>
        {coordinator.children.map((childId) => {
            const childNode = getNode(childId);
            if (!childNode) return null;
            
            return (
                <EuiFlexItem key={childId} grow={false}>
                    <EuiFlexGroup direction="column" alignItems="center">
                        {renderNode(childId)}
                        
                        {/* Tools Level */}
                        {childNode.children.length > 0 && (
                            <>
                                <EuiSpacer size="m" />
                                <div style={{ borderLeft: '1px solid #ddd', height: '15px' }}></div>
                                <EuiSpacer size="m" />
                                <EuiFlexGroup direction="column" gutterSize="s">
                                    {childNode.children.map(toolId => (
                                        <EuiFlexItem key={toolId}>
                                            <EuiBadge color="hollow" iconType="wrench">
                                                {toolId}
                                            </EuiBadge>
                                        </EuiFlexItem>
                                    ))}
                                </EuiFlexGroup>
                            </>
                        )}
                    </EuiFlexGroup>
                </EuiFlexItem>
            );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
