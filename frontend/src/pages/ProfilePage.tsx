/**
 * Profile Page
 *
 * Data-driven profile page that renders whatever sections are populated
 * in the active DemoProfile. No domain-specific labels are hardcoded —
 * everything (stats, attribute groups, tag groups, people) comes from
 * the profile data itself.
 *
 * Works for grocery, fashion, B2B, insurance, banking — any demo domain.
 */

import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiAvatar,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiHorizontalRule,
  EuiIcon,
  EuiStat,
  EuiCard,
  EuiDescriptionList,
  EuiLoadingSpinner,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { useBrand } from '../components/providers/BrandedThemeProvider'
import { useProfile } from '../profiles'
import type {
  DemoProfile,
  ProfileStat,
  AttributeGroup,
  TagGroup,
  PeopleGroup,
  ProfileMember,
} from '../profiles'

// ---------------------------------------------------------------------------
// Sub-components — all data-driven, zero domain assumptions
// ---------------------------------------------------------------------------

function formatStatValue(stat: ProfileStat): string {
  if (stat.format === 'number' && typeof stat.value === 'number') {
    return stat.value.toLocaleString()
  }
  return String(stat.value)
}

function ProfileHero({ profile }: { profile: DemoProfile }) {
  const { brand } = useBrand()

  const memberSinceLabel = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <EuiPanel paddingSize="l" hasBorder={false} style={{ textAlign: 'center' }}>
      {profile.avatar ? (
        <EuiAvatar name={profile.name} imageUrl={profile.avatar} size="xl" />
      ) : (
        <EuiAvatar name={profile.name} size="xl" color={brand.colors?.primary || '#006BB4'} />
      )}
      <EuiSpacer size="m" />
      <EuiTitle size="m">
        <h1>{profile.name}</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        <p>{profile.role}</p>
      </EuiText>
      <EuiText size="s">
        <p style={{ fontStyle: 'italic' }}>{profile.tagline}</p>
      </EuiText>

      {/* Stats row — rendered from profile.stats array */}
      {profile.stats && profile.stats.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="center" gutterSize="xl" responsive={false} wrap>
            {profile.stats.map((stat) => (
              <EuiFlexItem grow={false} key={stat.label}>
                <EuiStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  titleSize="s"
                  textAlign="center"
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {/* Fallback: show memberSince as a subtitle if no stats defined */}
      {(!profile.stats || profile.stats.length === 0) && memberSinceLabel && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>Member since {memberSinceLabel}</p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  )
}

function MemberCard({ member }: { member: ProfileMember }) {
  const { brand } = useBrand()
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar name={member.name} size="m" color={brand.colors?.accent || '#4CA882'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{member.name}</strong>
            {member.subtitle && (
              <span style={{ color: 'var(--euiTextSubduedColor)', marginLeft: 8 }}>
                {member.subtitle}
              </span>
            )}
          </EuiText>
          {member.tags && member.tags.length > 0 && (
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap style={{ marginTop: 4 }}>
              {member.tags.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color={member.tagColor || 'warning'}>{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
}

function PeopleSection({ group }: { group: PeopleGroup }) {
  return (
    <>
      <EuiTitle size="s"><h2>{group.title}</h2></EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap>
        {group.members.map((m) => (
          <EuiFlexItem key={m.name} style={{ minWidth: 240, maxWidth: 360 }}>
            <MemberCard member={m} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  )
}

function AttributePanel({ group }: { group: AttributeGroup }) {
  if (group.items.length === 0) return null

  const listItems = group.items.map((item) => ({
    title: item.label,
    description: item.value,
  }))

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {group.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={group.icon} color={group.iconColor || 'default'} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle size="xs"><h3>{group.title}</h3></EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        listItems={listItems}
        compressed
        style={{ maxWidth: 500 }}
      />
    </EuiPanel>
  )
}

function TagPanel({ group }: { group: TagGroup }) {
  if (group.values.length === 0) return null

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {group.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={group.icon} color={group.iconColor || 'default'} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle size="xs"><h3>{group.title}</h3></EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {group.values.map((v) => (
          <EuiFlexItem grow={false} key={v}>
            <EuiBadge color={group.color || 'hollow'}>{v}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  )
}

// ---------------------------------------------------------------------------
// Profile Switcher Cards (bottom of page)
// ---------------------------------------------------------------------------

function ProfileSwitcherSection() {
  const { brand } = useBrand()
  const { profiles, profileId, setProfile } = useProfile()

  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="s">
        <h2>Switch Persona</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>Select a different demo persona to see how personalisation changes the experience.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" wrap>
        {profiles.map((p) => (
          <EuiFlexItem key={p.id} style={{ minWidth: 220, maxWidth: 300 }}>
            <EuiCard
              layout="horizontal"
              icon={
                p.avatar
                  ? <EuiAvatar name={p.name} imageUrl={p.avatar} size="l" />
                  : <EuiAvatar name={p.name} size="l" color={p.id === 'guest' ? '#ABB4C4' : (brand.colors?.primary || '#006BB4')} />
              }
              title={p.name}
              description={p.tagline}
              onClick={() => setProfile(p.id)}
              hasBorder
              style={{
                outline: p.id === profileId ? '2px solid var(--euiColorSuccess)' : undefined,
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProfilePage() {
  const { profile, isGuest, isLoading } = useProfile()

  return (
    <>
      <AppHeader />
      <EuiPageTemplate
        paddingSize="l"
        style={{ paddingTop: 'calc(var(--brand-header-height, 48px) + 24px)' }}
      >
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
            <EuiFlexItem grow={false}><EuiLoadingSpinner size="xl" /></EuiFlexItem>
          </EuiFlexGroup>
        ) : isGuest ? (
          <GuestView />
        ) : (
          <>
            <ProfileHero profile={profile} />
            <EuiSpacer size="l" />

            {/* People (Household, Team, etc.) */}
            {profile.people && profile.people.members.length > 0 && (
              <PeopleSection group={profile.people} />
            )}

            {/* Attribute groups + Tag groups — rendered in a responsive grid */}
            {((profile.attributes && profile.attributes.length > 0) ||
              (profile.tags && profile.tags.length > 0)) && (
              <EuiFlexGroup gutterSize="l" wrap>
                {/* Left column: attribute panels */}
                {profile.attributes && profile.attributes.length > 0 && (
                  <EuiFlexItem style={{ minWidth: 320 }}>
                    {profile.attributes.map((group, i) => (
                      <div key={group.title}>
                        <AttributePanel group={group} />
                        {i < profile.attributes!.length - 1 && <EuiSpacer size="m" />}
                      </div>
                    ))}
                  </EuiFlexItem>
                )}

                {/* Right column: tag panels */}
                {profile.tags && profile.tags.length > 0 && (
                  <EuiFlexItem style={{ minWidth: 320 }}>
                    {profile.tags.map((group, i) => (
                      <div key={group.title}>
                        <TagPanel group={group} />
                        {i < profile.tags!.length - 1 && <EuiSpacer size="m" />}
                      </div>
                    ))}
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </>
        )}

        <ProfileSwitcherSection />
      </EuiPageTemplate>
    </>
  )
}

function GuestView() {
  return (
    <EuiPanel paddingSize="xl" hasBorder={false} style={{ textAlign: 'center' }}>
      <EuiAvatar name="Guest" size="xl" color="#ABB4C4" />
      <EuiSpacer size="m" />
      <EuiTitle size="m"><h1>Guest</h1></EuiTitle>
      <EuiText color="subdued">
        <p>Browsing without personalisation. Switch to a persona below to see how the experience adapts.</p>
      </EuiText>
    </EuiPanel>
  )
}
