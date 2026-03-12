/**
 * Profile Switcher
 *
 * Compact header widget: shows the active persona's avatar.
 * Click to open a popover with all available profiles.
 * Selecting a profile updates the context (and localStorage).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  EuiPopover,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui'
import { useProfile } from './ProfileContext'

export function ProfileSwitcher() {
  const { profile, profiles, setProfile } = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const toggle = () => setIsOpen((prev) => !prev)
  const close = () => setIsOpen(false)

  const selectProfile = (id: string) => {
    setProfile(id)
    close()
  }

  const avatarButton = (
    <EuiToolTip content={`Signed in as ${profile.name}`} position="bottom">
      <button
        onClick={toggle}
        aria-label={`Switch profile (currently ${profile.name})`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {profile.avatar ? (
          <EuiAvatar name={profile.name} imageUrl={profile.avatar} size="s" />
        ) : (
          <EuiAvatar name={profile.name} size="s" color="#68C4A2" />
        )}
        <span
          style={{
            color: 'white',
            fontSize: '13px',
            fontWeight: 500,
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {profile.name.split(' ')[0]}
        </span>
      </button>
    </EuiToolTip>
  )

  return (
    <EuiPopover
      button={avatarButton}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="downRight"
      panelPaddingSize="s"
      panelStyle={{ minWidth: 260 }}
    >
      <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
        <strong>Switch persona</strong>
      </EuiText>
      <EuiHorizontalRule margin="xs" />

      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => selectProfile(p.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '8px 4px',
            background: p.id === profile.id ? 'var(--euiColorLightestShade)' : 'none',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {p.avatar ? (
            <EuiAvatar name={p.name} imageUrl={p.avatar} size="m" />
          ) : (
            <EuiAvatar name={p.name} size="m" color={p.id === 'guest' ? '#ABB4C4' : '#68C4A2'} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{p.name}</strong>
                </EuiText>
              </EuiFlexItem>
              {p.id === profile.id && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">Active</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {p.role}
            </EuiText>
          </div>
        </button>
      ))}

      <EuiHorizontalRule margin="xs" />
      <EuiButtonEmpty
        size="xs"
        iconType="user"
        onClick={() => {
          close()
          navigate('/profile')
        }}
      >
        View full profile
      </EuiButtonEmpty>
    </EuiPopover>
  )
}
