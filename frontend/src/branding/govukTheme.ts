/**
 * GOV.UK Brand Theme
 * 
 * UK Government Digital Service (GDS) design system branding.
 * Based on the GOV.UK Design System: https://design-system.service.gov.uk/
 * 
 * This theme demonstrates the FULL capability of the extended branding system,
 * capturing all the distinctive GDS styling patterns:
 * - Sharp corners (no border radius)
 * - Yellow focus rings for accessibility
 * - Specific link underline behavior
 * - Green primary buttons with distinctive shadow
 * - Component-specific CSS for tags, inset text, warning boxes
 * 
 * Colors extracted from gov.uk official website.
 * Font: GDS Transport (falls back to Arial, sans-serif)
 */

// GDS color constants for reuse
const GDS = {
  black: '#0B0C0C',
  white: '#FFFFFF',
  blue: '#1D70B8',
  darkBlue: '#003078',
  lightBlue: '#D2E2F1',
  yellow: '#FFDD00',
  green: '#00703C',
  greenHover: '#005A30',
  greenShadow: '#002D18',
  red: '#D4351C',
  grey1: '#F3F2F1',
  grey2: '#B1B4B6',
  grey3: '#505A5F',
}

export const govukBranding = {
  // Metadata
  name: 'GOV.UK',
  sourceUrl: 'https://www.gov.uk',
  extractedAt: '2026-01-27',
  
  // Core GDS colors - https://design-system.service.gov.uk/styles/colour/
  colors: {
    primary: GDS.blue,           // GOV.UK Blue - links
    accent: GDS.yellow,          // GOV.UK Yellow - focus states
    background: GDS.grey1,       // Light grey - page background
    white: GDS.white,            // White - content areas
    black: GDS.black,            // GOV.UK Black - primary text
    textPrimary: GDS.black,      // Headings
    textBody: GDS.grey3,         // Secondary text, body
    border: GDS.grey2,           // Grey - borders, dividers
    // Additional GDS semantic colors
    success: GDS.green,          // Success, positive actions
    danger: GDS.red,             // Error, destructive actions
    warning: GDS.yellow,         // Warnings
    focus: GDS.yellow,           // Focus visible ring
    // Header/Footer - GOV.UK uses BLACK header, not blue!
    headerBackground: GDS.black, // Distinctive black header
    headerText: GDS.white,       // White text on header
    footerBackground: GDS.grey1, // Footer background
  },
  
  // Dark mode overrides for GOV.UK
  // GOV.UK doesn't have an official dark mode, so we adapt sensibly
  colorsDark: {
    primary: GDS.blue,           // Keep the blue
    accent: GDS.yellow,          // Keep yellow for focus
    background: GDS.black,       // GOV.UK black
    white: '#1A1A1A',            // Dark surface
    black: GDS.white,            // Invert for dark mode text
    textPrimary: GDS.white,      // White headings
    textBody: GDS.grey2,         // Grey body text
    border: GDS.grey3,           // Darker border
    headerBackground: GDS.black, // Keep black header in dark mode too
    headerText: GDS.white,
  },
  
  // Typography - GDS Transport with system fallbacks
  fonts: {
    heading: '"GDS Transport", Arial, sans-serif',
    body: '"GDS Transport", Arial, sans-serif',
    fallback: 'Arial, sans-serif',
  },
  
  // Spacing - GDS is very angular, no rounded corners
  spacing: {
    borderRadius: '0px',         // GDS uses sharp corners
    borderRadiusSmall: '0px',
  },
  
  // GOV.UK Logo - simplified crown SVG + GOV.UK text
  // Crown design from hack-fe-day demo
  logo: {
    svgDataUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 32' height='32' width='132'%3E%3Cpath d='M18 0L21.5 7.5L30 6L27 14H9L6 6L14.5 7.5L18 0Z' fill='white'/%3E%3Cpath d='M9 16H27V22H9V16Z' fill='white'/%3E%3Cpath d='M7 24H29V28C29 30 27 32 25 32H11C9 32 7 30 7 28V24Z' fill='white'/%3E%3Ctext x='38' y='24' font-family='Arial, sans-serif' font-size='22' font-weight='700' fill='white'%3EGOV.UK%3C/text%3E%3C/svg%3E`,
    alt: 'GOV.UK',
    logoContainsText: true,  // Logo includes "GOV.UK" text - don't show brand name separately
  },
  
  // Dark version for light backgrounds
  logoDark: {
    svgDataUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 32' height='32' width='132'%3E%3Cpath d='M18 0L21.5 7.5L30 6L27 14H9L6 6L14.5 7.5L18 0Z' fill='%230B0C0C'/%3E%3Cpath d='M9 16H27V22H9V16Z' fill='%230B0C0C'/%3E%3Cpath d='M7 24H29V28C29 30 27 32 25 32H11C9 32 7 30 7 28V24Z' fill='%230B0C0C'/%3E%3Ctext x='38' y='24' font-family='Arial, sans-serif' font-size='22' font-weight='700' fill='%230B0C0C'%3EGOV.UK%3C/text%3E%3C/svg%3E`,
    alt: 'GOV.UK',
  },
  
  // ============================================================================
  // Extended Branding - Tier 1: Links and Focus
  // ============================================================================
  
  links: {
    color: GDS.blue,
    hoverColor: GDS.blue,
    underlineThickness: 'max(1px, .0625rem)',
    underlineOffset: '.1em',
    focus: {
      backgroundColor: GDS.yellow,
      boxShadow: `0 -2px ${GDS.yellow}, 0 4px ${GDS.black}`,
      removeUnderline: true,
    },
  },
  
  focusRing: {
    color: GDS.yellow,
    width: '3px',
    offset: '0',
    boxShadow: `0 0 0 3px ${GDS.yellow}`,
  },
  
  // ============================================================================
  // Extended Branding - Tier 1: Buttons
  // ============================================================================
  
  buttons: {
    primary: {
      backgroundColor: GDS.green,
      textColor: GDS.white,
      borderRadius: '0px',
      boxShadow: `0 2px 0 ${GDS.greenShadow}`,
      border: '2px solid transparent',
      padding: '8px 10px 7px',
      fontWeight: '400',
      hover: {
        backgroundColor: GDS.greenHover,
      },
      focus: {
        boxShadow: `inset 0 0 0 2px ${GDS.yellow}`,
      },
    },
    secondary: {
      backgroundColor: GDS.grey1,
      textColor: GDS.black,
      borderRadius: '0px',
      boxShadow: `0 2px 0 ${GDS.grey3}`,
      border: '2px solid transparent',
      hover: {
        backgroundColor: GDS.grey2,
      },
    },
    warning: {
      backgroundColor: GDS.red,
      textColor: GDS.white,
      borderRadius: '0px',
      boxShadow: '0 2px 0 #6E0C0C',
      border: '2px solid transparent',
      hover: {
        backgroundColor: '#AA2A1A',
      },
    },
  },
  
  // ============================================================================
  // Extended Branding - Tier 3: Layout
  // ============================================================================
  
  layout: {
    maxWidth: '960px',
    containerPadding: '0 15px',
    sectionSpacing: '30px',
    headerHeight: '60px',  // GOV.UK uses a taller header
  },
  
  // ============================================================================
  // Extended Branding - Tier 2: Custom CSS
  // ============================================================================
  
  customCss: `
    /* GDS Typography */
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* GDS Tag Component */
    .govuk-tag {
      font-family: "GDS Transport", Arial, sans-serif;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
      display: inline-block;
      padding: 5px 8px 4px;
      color: ${GDS.white};
      background-color: ${GDS.blue};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* GDS Inset Text */
    .govuk-inset-text {
      border-left: 10px solid ${GDS.grey2};
      padding: 15px;
      margin: 20px 0;
    }
    
    /* GDS Warning Text */
    .govuk-warning-text {
      position: relative;
      padding: 10px 0 10px 65px;
    }
    .govuk-warning-text__icon {
      font-weight: 700;
      box-sizing: border-box;
      display: inline-block;
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 35px;
      height: 35px;
      border: 3px solid ${GDS.black};
      border-radius: 50%;
      color: ${GDS.white};
      background-color: ${GDS.black};
      font-size: 30px;
      line-height: 29px;
      text-align: center;
    }
    
    /* GDS Panel (success confirmation) */
    .govuk-panel {
      background-color: ${GDS.green};
      color: ${GDS.white};
      padding: 35px;
      text-align: center;
    }
    .govuk-panel__title {
      font-size: 48px;
      font-weight: 700;
      margin: 0 0 30px;
    }
    
    /* GDS Details/Summary */
    .govuk-details__summary {
      color: ${GDS.blue};
      cursor: pointer;
    }
    .govuk-details__summary:hover {
      color: ${GDS.darkBlue};
    }
    .govuk-details__text {
      padding: 15px;
      padding-left: 20px;
      border-left: 5px solid ${GDS.grey2};
    }
    
    /* GDS Phase Banner */
    .govuk-phase-banner {
      padding: 10px 0;
      border-bottom: 1px solid ${GDS.grey2};
    }
    .govuk-phase-banner__content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    /* GDS Breadcrumbs */
    .govuk-breadcrumbs {
      margin-top: 15px;
      margin-bottom: 10px;
    }
    .govuk-breadcrumbs__list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .govuk-breadcrumbs__list-item {
      display: inline-block;
      margin-right: 10px;
    }
    .govuk-breadcrumbs__list-item::after {
      content: "›";
      margin-left: 10px;
    }
    .govuk-breadcrumbs__list-item:last-child::after {
      content: "";
    }
    
    /* GDS Footer */
    .govuk-footer {
      background-color: ${GDS.grey1};
      border-top: 1px solid ${GDS.grey2};
      padding: 25px 0;
      margin-top: 50px;
    }
    .govuk-footer__link {
      color: ${GDS.black};
    }
    
    /* GDS Error Message */
    .govuk-error-message {
      color: ${GDS.red};
      font-weight: 700;
      margin-bottom: 15px;
    }
    
    /* GDS Form Group with Error */
    .govuk-form-group--error {
      border-left: 5px solid ${GDS.red};
      padding-left: 15px;
    }
    
    /* GDS Hint Text */
    .govuk-hint {
      color: ${GDS.grey3};
      margin-bottom: 15px;
    }
    
    /* GDS Input */
    .govuk-input {
      font-family: "GDS Transport", Arial, sans-serif;
      font-size: 19px;
      padding: 5px;
      border: 2px solid ${GDS.black};
      border-radius: 0;
    }
    .govuk-input:focus {
      outline: 3px solid ${GDS.yellow};
      outline-offset: 0;
      box-shadow: inset 0 0 0 2px;
    }
    
    /* GDS Textarea */
    .govuk-textarea {
      font-family: "GDS Transport", Arial, sans-serif;
      font-size: 19px;
      padding: 5px;
      border: 2px solid ${GDS.black};
      border-radius: 0;
      width: 100%;
      resize: vertical;
    }
    .govuk-textarea:focus {
      outline: 3px solid ${GDS.yellow};
      outline-offset: 0;
    }
    
    /* GDS Button (applying to .govuk-button class) */
    .govuk-button {
      font-family: "GDS Transport", Arial, sans-serif;
      font-weight: 400;
      font-size: 19px;
      line-height: 1;
      box-sizing: border-box;
      display: inline-block;
      position: relative;
      width: auto;
      margin-bottom: 22px;
      padding: 8px 10px 7px;
      border: 2px solid transparent;
      border-radius: 0;
      color: ${GDS.white};
      background-color: ${GDS.green};
      box-shadow: 0 2px 0 ${GDS.greenShadow};
      text-align: center;
      vertical-align: top;
      cursor: pointer;
      -webkit-appearance: none;
    }
    .govuk-button:hover {
      background-color: ${GDS.greenHover};
    }
    .govuk-button:focus {
      outline: 3px solid transparent;
      box-shadow: inset 0 0 0 2px ${GDS.yellow};
    }
    .govuk-button--secondary {
      background-color: ${GDS.grey1};
      color: ${GDS.black};
      box-shadow: 0 2px 0 ${GDS.grey3};
    }
    .govuk-button--secondary:hover {
      background-color: ${GDS.grey2};
    }
    .govuk-button--warning {
      background-color: ${GDS.red};
      box-shadow: 0 2px 0 #6E0C0C;
    }
    .govuk-button--warning:hover {
      background-color: #AA2A1A;
    }
  `,
}

/**
 * EUI Theme Modifications for GOV.UK
 */
export const govukEuiTheme = {
  colors: {
    LIGHT: {
      primary: govukBranding.colors.primary,
      accent: govukBranding.colors.accent,
      success: govukBranding.colors.success,
      danger: govukBranding.colors.danger,
    },
    DARK: {
      primary: govukBranding.colors.primary,
      accent: govukBranding.colors.accent,
      success: govukBranding.colors.success,
      danger: govukBranding.colors.danger,
    },
  },
}
