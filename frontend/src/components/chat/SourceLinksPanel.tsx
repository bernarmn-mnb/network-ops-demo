/**
 * Right-panel list of source URLs from the browser_show_source_links tool.
 */

import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiPanel,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui'
import type { SourceLinksPayload } from '../../config/chatBrowserTools'
import { useBrand } from '../providers/BrandedThemeProvider'

export interface SourceLinksPanelProps {
  payload: SourceLinksPayload | null
}

function linkLabel(url: string, title?: string): string {
  if (title?.trim()) return title.trim()
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function SourceLinksPanel({ payload }: SourceLinksPanelProps) {
  const { brand } = useBrand()

  if (!payload || payload.links.length === 0) {
    const who = brand.name?.trim() || 'this site'

    return (
      <EuiPanel hasBorder paddingSize="m" grow={false}>
        <EuiTitle size="xxs">
          <h2 style={{ margin: 0, color: 'var(--euiTextColor)' }}>Sources</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            If the assistant used {who} to build its answer, you will see those pages listed here with a clear title
            and link—not buried in the reply.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Open any item in a new tab to check figures, dates, and wording against the live source before you rely on
            them in your own analysis or reporting.
          </p>
        </EuiText>
      </EuiPanel>
    )
  }

  return (
    <div>
      <EuiTitle size="xs">
        <h2 style={{ margin: 0, color: 'var(--euiTextColor)' }}>{payload.header}</h2>
      </EuiTitle>
      {payload.intro ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0 }}>{payload.intro}</p>
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {payload.links.map((link, i) => (
          <EuiFlexItem key={`${link.url}-${i}`} grow={false}>
            <EuiPanel paddingSize="s" hasBorder grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="link" size="m" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiLink href={link.url} target="_blank" rel="noopener noreferrer" external>
                    {linkLabel(link.url, link.title)}
                  </EuiLink>
                  {link.description ? (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        <p style={{ margin: 0 }}>{link.description}</p>
                      </EuiText>
                    </>
                  ) : null}
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{link.url}</code>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  )
}
