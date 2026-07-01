// ============================================================
//  QUOTE GENERATOR - Main JS
//  Exotel Internal Sales Dashboard
// ============================================================

// ── State ──────────────────────────────────────────────────
const QG = {
  profile: null,
  quoteNumber: null,
  currentQuoteId: null,
  currentSku: null,        // alias → active item's sku_key
  currentTier: 'dabbler',  // alias → active item's tier
  skuValues: {},           // alias → active item's values
  stopLockOverrides: [],   // alias → active item's stopLockOverrides
  pendingStopLockResolve: null,
  isAdmin: false,
  APPROVAL_PASSWORD: 'manager@123',
  draftKey: null,
  _dirty: false,
  // ── Multi-SKU state ─────────────────────────────────
  skuItems: [],            // array of { id, sku_key, tier, values, stopLockOverrides, customName, eliteEnabled }
  activeItemId: null,      // id of item currently being edited
  lockedEntity: null,      // 'Exotel' | 'Veeno' | null - entity of first SKU selected
  compareMode: false,
  multiSkuMode: false,     // true when multi-SKU quote mode is enabled
  // ── Bundle Compare state ───────────────────────────────────
  bundleCompareMode: false,
  bundleA: null,
  bundleB: null,
  activeBundle: 'A',
  savedSingleState: null,
};

// ── SKU Definitions ────────────────────────────────────────
const I_PHONE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
const I_USERS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
const I_MOBILE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
const I_GLOBE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
const I_MSG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
const I_WA = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
const I_DIAMOND = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const I_MONITOR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
const I_HASH = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`;
const I_BOT = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a9 9 0 0 1 18 0"></path><rect x="2" y="9" width="2" height="5" rx="1"></rect><rect x="20" y="9" width="2" height="5" rx="1"></rect><rect x="4" y="8" width="16" height="9" rx="2"></rect><path d="M12 8V5"></path><circle cx="12" cy="4" r="1" fill="currentColor"></circle><circle cx="9" cy="12" r="1" fill="currentColor"></circle><circle cx="15" cy="12" r="1" fill="currentColor"></circle><path d="M10 15h4M20 12v3a2 2 0 0 1-2 2h-3"></path><circle cx="14" cy="17" r="1" fill="currentColor"></circle></svg>`;

// Bundle Compare — VS split-panel icon with styled text
const I_VS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="3" width="9" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
  <rect x="14" y="3" width="9" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="4.5" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
  <text x="12" y="15.5" text-anchor="middle" font-size="5.5" font-weight="800" fill="currentColor" font-family="system-ui,sans-serif" letter-spacing="-0.3">VS</text>
</svg>`;

const SKUS = [
  { key: 'voice_exotel_std', label: 'Voice STD', sub: 'Minute Based', entity: 'Exotel', icon: I_PHONE, hasTiers: true },
  { key: 'voice_exotel_user', label: 'Voice User', sub: 'User Based', entity: 'Exotel', icon: I_USERS, hasTiers: false },
  { key: 'voice_exotel_campaigns', label: 'Campaigns', sub: 'Single-leg Billing', entity: 'Exotel', icon: I_PHONE, hasTiers: true },
  { key: 'voice_exotel_tfn', label: 'Toll-Free (TFN)', sub: 'Exotel', entity: 'Exotel', icon: I_MOBILE, hasTiers: false },
  { key: 'voice_exotel_stream', label: 'Web Streaming', sub: 'WebSocket / Bot', entity: 'Exotel', icon: I_GLOBE, hasTiers: false },
  { key: 'voice_exotel_voicebot', label: 'Voicebot', sub: 'Conversational Bot', entity: 'Exotel', icon: I_BOT, hasTiers: false },
  { key: 'sms_exotel', label: 'SMS Plan', sub: 'Exotel SMS', entity: 'Exotel', icon: I_MSG, hasTiers: false },
  { key: 'whatsapp_exotel', label: 'WhatsApp Plan', sub: 'Exotel WA', entity: 'Exotel', icon: I_WA, hasTiers: false },
  { key: 'rcs_exotel', label: 'RCS Plan', sub: 'Exotel RCS', entity: 'Exotel', icon: I_DIAMOND, hasTiers: false },

  // ── International Commercial (USD pricing) ────────────────────────
  { key: 'voice_intl', label: 'International', sub: 'USD · Country-Specific', entity: 'Exotel', theme: 'intl', icon: I_GLOBE, hasTiers: false, isIntl: true },
  
  // ── Startup Plan (single SKU, sub-product via tier selector) ─────
  { key: 'startup', label: 'Startup Plan', sub: 'Free Trial Bundle', entity: 'Exotel', theme: 'startup', icon: I_PHONE, hasTiers: true, isStartup: true },

  { key: 'voice_veeno_std', label: 'Voice STD', sub: 'Minute Based', entity: 'Veeno', icon: I_PHONE, hasTiers: false },
  { key: 'voice_veeno_user', label: 'Voice User', sub: 'User Based', entity: 'Veeno', icon: I_USERS, hasTiers: false },
  { key: 'sip_veeno', label: 'SIP Lines', sub: 'WebRTC / Browser', entity: 'Veeno', icon: I_MONITOR, hasTiers: true },
  { key: 'num_1400', label: '1400 Series', sub: 'Veeno Number', entity: 'Veeno', icon: I_HASH, hasTiers: false },
  { key: 'num_1600', label: '1600 Series', sub: 'Veeno Number', entity: 'Veeno', icon: I_HASH, hasTiers: false },

  // ── Bundle Compare — special toggle card (not a real SKU) ────────
  { key: 'bundle_compare', label: 'Bundle Compare', sub: 'Compare Option A vs B', entity: 'Both', theme: 'bundle', icon: I_VS, hasTiers: false, isBundleCompare: true },
];

// Tier defaults
const TIER_DEFAULTS = {
  dabbler:    { validity: 5,  rental: 4999,  free_users: 3,    users_stop: 5,    free_numbers: 1,  credits: 5000,  single_leg: 60, stop_single: 52 },
  believer:   { validity: 11, rental: 10499, free_users: 6,    users_stop: 8,    free_numbers: 2,  credits: 9500,  single_leg: 55, stop_single: 52 },
  influencer: { validity: 11, rental: 10499, free_users: null, users_stop: null, free_numbers: 10, credits: 39000, single_leg: 52, stop_single: 52 },
  elite:      { validity: 11, rental: 10499, free_users: null, users_stop: null, free_numbers: 10, credits: 39000, single_leg: 52, stop_single: 52 },
};
// SKUs that support a custom plan name rename
const CUSTOM_NAME_SKUS = ['voice_exotel_std', 'voice_veeno_std', 'voice_exotel_user', 'voice_veeno_user', 'sip_veeno', 'voice_exotel_stream', 'voice_exotel_voicebot', 'voice_exotel_campaigns', 'voice_exotel_tfn', 'sms_exotel', 'whatsapp_exotel', 'rcs_exotel', 'num_1400', 'num_1600', 'voice_intl'];

// ── International Rate Card (USD/min, 60s pulse) ─────────────────
// Source: International Voice April'24 Outbound Price (USD) PDF
const INTL_RATE_CARD = [
  { country: 'Afghanistan', type: 'All', rate: 0.73, iso: 'AF' },
  { country: 'Albania', type: 'Fixed', rate: 0.75, iso: 'AL' },
  { country: 'Albania', type: 'Mobile', rate: 1.39, iso: 'AL' },
  { country: 'Algeria', type: 'Fixed', rate: 0.32, iso: 'DZ' },
  { country: 'Algeria', type: 'Mobile', rate: 2.61, iso: 'DZ' },
  { country: 'American Samoa', type: 'All', rate: 0.11, iso: 'AS' },
  { country: 'Andorra', type: 'Fixed', rate: 0.07, iso: 'AD' },
  { country: 'Andorra', type: 'Mobile', rate: 0.67, iso: 'AD' },
  { country: 'Angola', type: 'Fixed', rate: 0.28, iso: 'AO' },
  { country: 'Angola', type: 'Mobile', rate: 0.70, iso: 'AO' },
  { country: 'Anguilla', type: 'All', rate: 0.75, iso: 'AI' },
  { country: 'Antigua And Barbuda', type: 'All', rate: 0.79, iso: 'AG' },
  { country: 'Argentina', type: 'All', rate: 0.48, iso: 'AR' },
  { country: 'Armenia', type: 'All', rate: 0.82, iso: 'AM' },
  { country: 'Aruba', type: 'All', rate: 0.58, iso: 'AW' },
  { country: 'Australia', type: 'Fixed', rate: 0.07, iso: 'AU' },
  { country: 'Australia', type: 'Mobile', rate: 0.11, iso: 'AU' },
  { country: 'Austria', type: 'Fixed', rate: 0.33, iso: 'AT' },
  { country: 'Austria', type: 'Mobile', rate: 0.94, iso: 'AT' },
  { country: 'Azerbaijan', type: 'All', rate: 0.94, iso: 'AZ' },
  { country: 'Bahamas', type: 'All', rate: 0.66, iso: 'BS' },
  { country: 'Bahrain', type: 'All', rate: 0.67, iso: 'BH' },
  { country: 'Bangladesh', type: 'All', rate: 0.06, iso: 'BD' },
  { country: 'Barbados', type: 'All', rate: 0.96, iso: 'BB' },
  { country: 'Belarus', type: 'All', rate: 0.75, iso: 'BY' },
  { country: 'Belgium', type: 'Fixed', rate: 1.24, iso: 'BE' },
  { country: 'Belgium', type: 'Mobile', rate: 1.30, iso: 'BE' },
  { country: 'Belize', type: 'All', rate: 0.69, iso: 'BZ' },
  { country: 'Benin', type: 'All', rate: 1.20, iso: 'BJ' },
  { country: 'Bermuda', type: 'All', rate: 0.11, iso: 'BM' },
  { country: 'Bhutan', type: 'All', rate: 0.29, iso: 'BT' },
  { country: 'Bolivia', type: 'All', rate: 0.75, iso: 'BO' },
  { country: 'Bosnia And Herzegovina', type: 'All', rate: 1.27, iso: 'BA' },
  { country: 'Botswana', type: 'All', rate: 0.89, iso: 'BW' },
  { country: 'Brazil', type: 'All', rate: 0.09, iso: 'BR' },
  { country: 'British Virgin Islands', type: 'All', rate: 0.47, iso: 'VG' },
  { country: 'Brunei', type: 'All', rate: 0.06, iso: 'BN' },
  { country: 'Bulgaria', type: 'Fixed', rate: 0.29, iso: 'BG' },
  { country: 'Bulgaria', type: 'Mobile', rate: 1.12, iso: 'BG' },
  { country: 'Burkina Faso', type: 'All', rate: 1.70, iso: 'BF' },
  { country: 'Burundi', type: 'All', rate: 1.94, iso: 'BI' },
  { country: 'Cambodia', type: 'All', rate: 0.27, iso: 'KH' },
  { country: 'Cameroon', type: 'All', rate: 1.30, iso: 'CM' },
  { country: 'Canada', type: 'All', rate: 0.02, iso: 'CA' },
  { country: 'Cape Verde', type: 'All', rate: 0.79, iso: 'CV' },
  { country: 'Cayman Islands', type: 'Fixed', rate: 0.35, iso: 'KY' },
  { country: 'Cayman Islands', type: 'Mobile', rate: 0.54, iso: 'KY' },
  { country: 'Central African Republic', type: 'All', rate: 2.85, iso: 'CF' },
  { country: 'Chad', type: 'All', rate: 2.23, iso: 'TD' },
  { country: 'Chile', type: 'All', rate: 1.72, iso: 'CL' },
  { country: 'China', type: 'All', rate: 1.43, iso: 'CN' },
  { country: 'Colombia', type: 'All', rate: 0.10, iso: 'CO' },
  { country: 'Comoros', type: 'All', rate: 2.53, iso: 'KM' },
  { country: 'Congo', type: 'All', rate: 0.87, iso: 'CG' },
  { country: 'Congo (DR)', type: 'All', rate: 2.23, iso: 'CD' },
  { country: 'Costa Rica', type: 'All', rate: 0.24, iso: 'CR' },
  { country: 'Cote D\'Ivoire', type: 'All', rate: 1.79, iso: 'CI' },
  { country: 'Croatia', type: 'Fixed', rate: 0.56, iso: 'HR' },
  { country: 'Croatia', type: 'Mobile', rate: 1.27, iso: 'HR' },
  { country: 'Cuba', type: 'All', rate: 1.51, iso: 'CU' },
  { country: 'Cyprus', type: 'All', rate: 0.64, iso: 'CY' },
  { country: 'Czech Republic', type: 'All', rate: 0.27, iso: 'CZ' },
  { country: 'Denmark', type: 'All', rate: 1.39, iso: 'DK' },
  { country: 'Djibouti', type: 'All', rate: 1.05, iso: 'DJ' },
  { country: 'Dominica', type: 'All', rate: 0.70, iso: 'DM' },
  { country: 'Dominican Republic', type: 'All', rate: 0.33, iso: 'DO' },
  { country: 'Ecuador', type: 'All', rate: 0.59, iso: 'EC' },
  { country: 'Egypt', type: 'All', rate: 0.39, iso: 'EG' },
  { country: 'El Salvador', type: 'All', rate: 0.47, iso: 'SV' },
  { country: 'Eritrea', type: 'All', rate: 0.78, iso: 'ER' },
  { country: 'Estonia', type: 'All', rate: 1.73, iso: 'EE' },
  { country: 'Ethiopia', type: 'All', rate: 0.76, iso: 'ET' },
  { country: 'Faroe Islands', type: 'All', rate: 0.33, iso: 'FO' },
  { country: 'Fiji', type: 'All', rate: 0.92, iso: 'FJ' },
  { country: 'Finland', type: 'All', rate: 1.23, iso: 'FI' },
  { country: 'France', type: 'Fixed', rate: 0.12, iso: 'FR' },
  { country: 'France', type: 'Mobile', rate: 0.78, iso: 'FR' },
  { country: 'French Guiana', type: 'Fixed', rate: 0.14, iso: 'GF' },
  { country: 'French Guiana', type: 'Mobile', rate: 0.83, iso: 'GF' },
  { country: 'French Polynesia', type: 'All', rate: 0.86, iso: 'PF' },
  { country: 'Gabon', type: 'All', rate: 3.56, iso: 'GA' },
  { country: 'Gambia', type: 'All', rate: 1.78, iso: 'GM' },
  { country: 'Georgia', type: 'All', rate: 0.96, iso: 'GE' },
  { country: 'Germany', type: 'All', rate: 1.30, iso: 'DE' },
  { country: 'Ghana', type: 'All', rate: 0.87, iso: 'GH' },
  { country: 'Gibraltar', type: 'Fixed', rate: 0.10, iso: 'GI' },
  { country: 'Gibraltar', type: 'Mobile', rate: 0.43, iso: 'GI' },
  { country: 'Greece', type: 'All', rate: 0.25, iso: 'GR' },
  { country: 'Greenland', type: 'All', rate: 0.81, iso: 'GL' },
  { country: 'Grenada', type: 'Fixed', rate: 0.46, iso: 'GD' },
  { country: 'Grenada', type: 'Mobile', rate: 0.78, iso: 'GD' },
  { country: 'Guam', type: 'All', rate: 0.06, iso: 'GU' },
  { country: 'Guatemala', type: 'All', rate: 0.50, iso: 'GT' },
  { country: 'Guinea', type: 'All', rate: 2.44, iso: 'GN' },
  { country: 'Guinea-Bissau', type: 'All', rate: 2.96, iso: 'GW' },
  { country: 'Guyana', type: 'All', rate: 0.69, iso: 'GY' },
  { country: 'Haiti', type: 'All', rate: 1.76, iso: 'HT' },
  { country: 'Honduras', type: 'All', rate: 0.56, iso: 'HN' },
  { country: 'Hong Kong', type: 'All', rate: 0.11, iso: 'HK' },
  { country: 'Hungary', type: 'All', rate: 0.27, iso: 'HU' },
  { country: 'Iceland', type: 'All', rate: 0.08, iso: 'IS' },
  { country: 'India', type: 'All', rate: 0.08, iso: 'IN' },
  { country: 'Indonesia', type: 'All', rate: 0.22, iso: 'ID' },
  { country: 'Iran', type: 'All', rate: 0.38, iso: 'IR' },
  { country: 'Iraq', type: 'All', rate: 0.62, iso: 'IQ' },
  { country: 'Ireland', type: 'Fixed', rate: 0.03, iso: 'IE' },
  { country: 'Ireland', type: 'Mobile', rate: 1.46, iso: 'IE' },
  { country: 'Israel', type: 'All', rate: 0.63, iso: 'IL' },
  { country: 'Italy', type: 'Fixed', rate: 0.01, iso: 'IT' },
  { country: 'Italy', type: 'Mobile', rate: 1.75, iso: 'IT' },
  { country: 'Jamaica', type: 'All', rate: 0.64, iso: 'JM' },
  { country: 'Japan', type: 'All', rate: 0.21, iso: 'JP' },
  { country: 'Jordan', type: 'All', rate: 0.60, iso: 'JO' },
  { country: 'Kazakhstan', type: 'Fixed', rate: 0.18, iso: 'KZ' },
  { country: 'Kazakhstan', type: 'Mobile', rate: 1.53, iso: 'KZ' },
  { country: 'Kenya', type: 'All', rate: 1.01, iso: 'KE' },
  { country: 'Kosovo', type: 'All', rate: 1.51, iso: 'XK' },
  { country: 'Kuwait', type: 'All', rate: 0.17, iso: 'KW' },
  { country: 'Kyrgyzstan', type: 'All', rate: 1.18, iso: 'KG' },
  { country: 'Laos', type: 'All', rate: 0.26, iso: 'LA' },
  { country: 'Latvia', type: 'All', rate: 1.80, iso: 'LV' },
  { country: 'Lebanon', type: 'All', rate: 0.54, iso: 'LB' },
  { country: 'Lesotho', type: 'All', rate: 1.75, iso: 'LS' },
  { country: 'Liberia', type: 'All', rate: 1.76, iso: 'LR' },
  { country: 'Libya', type: 'All', rate: 1.10, iso: 'LY' },
  { country: 'Liechtenstein', type: 'All', rate: 0.52, iso: 'LI' },
  { country: 'Lithuania', type: 'All', rate: 1.24, iso: 'LT' },
  { country: 'Luxembourg', type: 'All', rate: 1.17, iso: 'LU' },
  { country: 'Macau', type: 'All', rate: 0.60, iso: 'MO' },
  { country: 'Macedonia', type: 'All', rate: 1.09, iso: 'MK' },
  { country: 'Madagascar', type: 'All', rate: 2.72, iso: 'MG' },
  { country: 'Malawi', type: 'All', rate: 1.62, iso: 'MW' },
  { country: 'Malaysia', type: 'All', rate: 0.08, iso: 'MY' },
  { country: 'Maldives', type: 'All', rate: 3.05, iso: 'MV' },
  { country: 'Mali', type: 'All', rate: 2.15, iso: 'ML' },
  { country: 'Malta', type: 'Fixed', rate: 0.81, iso: 'MT' },
  { country: 'Malta', type: 'Mobile', rate: 1.78, iso: 'MT' },
  { country: 'Marshall Islands', type: 'All', rate: 0.79, iso: 'MH' },
  { country: 'Martinique', type: 'Fixed', rate: 0.14, iso: 'MQ' },
  { country: 'Martinique', type: 'Mobile', rate: 0.71, iso: 'MQ' },
  { country: 'Mauritania', type: 'All', rate: 3.40, iso: 'MR' },
  { country: 'Mauritius', type: 'All', rate: 0.49, iso: 'MU' },
  { country: 'Mexico', type: 'All', rate: 0.04, iso: 'MX' },
  { country: 'Micronesia', type: 'All', rate: 1.70, iso: 'FM' },
  { country: 'Moldova', type: 'All', rate: 1.51, iso: 'MD' },
  { country: 'Monaco', type: 'All', rate: 1.55, iso: 'MC' },
  { country: 'Mongolia', type: 'All', rate: 0.05, iso: 'MN' },
  { country: 'Montenegro', type: 'All', rate: 2.11, iso: 'ME' },
  { country: 'Morocco', type: 'Fixed', rate: 0.59, iso: 'MA' },
  { country: 'Morocco', type: 'Mobile', rate: 2.32, iso: 'MA' },
  { country: 'Mozambique', type: 'All', rate: 1.68, iso: 'MZ' },
  { country: 'Myanmar', type: 'All', rate: 1.01, iso: 'MM' },
  { country: 'Namibia', type: 'All', rate: 0.57, iso: 'NA' },
  { country: 'Nepal', type: 'All', rate: 0.63, iso: 'NP' },
  { country: 'Netherlands', type: 'All', rate: 1.29, iso: 'NL' },
  { country: 'New Zealand', type: 'Fixed', rate: 0.03, iso: 'NZ' },
  { country: 'New Zealand', type: 'Mobile', rate: 0.09, iso: 'NZ' },
  { country: 'Nicaragua', type: 'All', rate: 0.82, iso: 'NI' },
  { country: 'Niger', type: 'All', rate: 1.02, iso: 'NE' },
  { country: 'Nigeria', type: 'All', rate: 0.50, iso: 'NG' },
  { country: 'Norway', type: 'All', rate: 0.05, iso: 'NO' },
  { country: 'Oman', type: 'All', rate: 0.90, iso: 'OM' },
  { country: 'Pakistan', type: 'All', rate: 0.18, iso: 'PK' },
  { country: 'Palau', type: 'All', rate: 1.33, iso: 'PW' },
  { country: 'Palestine', type: 'All', rate: 0.35, iso: 'PS' },
  { country: 'Panama', type: 'All', rate: 0.43, iso: 'PA' },
  { country: 'Paraguay', type: 'Fixed', rate: 0.13, iso: 'PY' },
  { country: 'Paraguay', type: 'Mobile', rate: 0.25, iso: 'PY' },
  { country: 'Peru', type: 'All', rate: 0.62, iso: 'PE' },
  { country: 'Philippines', type: 'All', rate: 0.33, iso: 'PH' },
  { country: 'Poland', type: 'All', rate: 0.74, iso: 'PL' },
  { country: 'Portugal', type: 'Fixed', rate: 0.07, iso: 'PT' },
  { country: 'Portugal', type: 'Mobile', rate: 1.34, iso: 'PT' },
  { country: 'Puerto Rico', type: 'All', rate: 0.03, iso: 'PR' },
  { country: 'Qatar', type: 'All', rate: 0.61, iso: 'QA' },
  { country: 'Reunion', type: 'Fixed', rate: 0.16, iso: 'RE' },
  { country: 'Reunion', type: 'Mobile', rate: 2.01, iso: 'RE' },
  { country: 'Romania', type: 'Fixed', rate: 0.01, iso: 'RO' },
  { country: 'Romania', type: 'Mobile', rate: 0.05, iso: 'RO' },
  { country: 'Russia', type: 'All', rate: 0.47, iso: 'RU' },
  { country: 'Rwanda', type: 'All', rate: 1.19, iso: 'RW' },
  { country: 'Saint Kitts And Nevis', type: 'All', rate: 0.74, iso: 'KN' },
  { country: 'Saint Lucia', type: 'All', rate: 0.62, iso: 'LC' },
  { country: 'Saint Vincent And The Grenadines', type: 'All', rate: 0.59, iso: 'VC' },
  { country: 'Samoa', type: 'All', rate: 0.88, iso: 'WS' },
  { country: 'Saudi Arabia', type: 'All', rate: 0.44, iso: 'SA' },
  { country: 'Senegal', type: 'All', rate: 1.58, iso: 'SN' },
  { country: 'Serbia', type: 'All', rate: 1.21, iso: 'RS' },
  { country: 'Seychelles', type: 'All', rate: 2.24, iso: 'SC' },
  { country: 'Sierra Leone', type: 'All', rate: 1.85, iso: 'SL' },
  { country: 'Singapore', type: 'All', rate: 0.04, iso: 'SG' },
  { country: 'Slovakia', type: 'All', rate: 0.40, iso: 'SK' },
  { country: 'Slovenia', type: 'All', rate: 1.56, iso: 'SI' },
  { country: 'Somalia', type: 'All', rate: 1.81, iso: 'SO' },
  { country: 'South Africa', type: 'Fixed', rate: 0.36, iso: 'ZA' },
  { country: 'South Africa', type: 'Mobile', rate: 1.06, iso: 'ZA' },
  { country: 'South Korea', type: 'All', rate: 0.08, iso: 'KR' },
  { country: 'South Sudan', type: 'All', rate: 1.12, iso: 'SS' },
  { country: 'Spain', type: 'All', rate: 1.95, iso: 'ES' },
  { country: 'Sri Lanka', type: 'All', rate: 1.05, iso: 'LK' },
  { country: 'Sudan', type: 'All', rate: 0.83, iso: 'SD' },
  { country: 'Suriname', type: 'All', rate: 1.50, iso: 'SR' },
  { country: 'Swaziland', type: 'All', rate: 0.73, iso: 'SZ' },
  { country: 'Sweden', type: 'Fixed', rate: 0.14, iso: 'SE' },
  { country: 'Sweden', type: 'Mobile', rate: 1.06, iso: 'SE' },
  { country: 'Switzerland', type: 'Fixed', rate: 0.54, iso: 'CH' },
  { country: 'Switzerland', type: 'Mobile', rate: 2.55, iso: 'CH' },
  { country: 'Syria', type: 'All', rate: 0.27, iso: 'SY' },
  { country: 'Taiwan', type: 'Fixed', rate: 0.17, iso: 'TW' },
  { country: 'Taiwan', type: 'Mobile', rate: 0.33, iso: 'TW' },
  { country: 'Tajikistan', type: 'All', rate: 0.65, iso: 'TJ' },
  { country: 'Tanzania', type: 'All', rate: 0.86, iso: 'TZ' },
  { country: 'Thailand', type: 'All', rate: 0.14, iso: 'TH' },
  { country: 'Togo', type: 'All', rate: 1.20, iso: 'TG' },
  { country: 'Tonga', type: 'All', rate: 4.60, iso: 'TO' },
  { country: 'Trinidad And Tobago', type: 'All', rate: 0.47, iso: 'TT' },
  { country: 'Tunisia', type: 'All', rate: 2.96, iso: 'TN' },
  { country: 'Turkey', type: 'Fixed', rate: 0.12, iso: 'TR' },
  { country: 'Turkey', type: 'Mobile', rate: 0.97, iso: 'TR' },
  { country: 'Turkmenistan', type: 'Fixed', rate: 0.36, iso: 'TM' },
  { country: 'Turkmenistan', type: 'Mobile', rate: 0.59, iso: 'TM' },
  { country: 'Uganda', type: 'All', rate: 1.56, iso: 'UG' },
  { country: 'Ukraine', type: 'Fixed', rate: 0.69, iso: 'UA' },
  { country: 'Ukraine', type: 'Mobile', rate: 0.89, iso: 'UA' },
  { country: 'United Arab Emirates', type: 'All', rate: 0.41, iso: 'AE' },
  { country: 'United Kingdom', type: 'All', rate: 1.24, iso: 'GB' },
  { country: 'United States', type: 'All', rate: 0.02, iso: 'US' },
  { country: 'Uruguay', type: 'Fixed', rate: 0.18, iso: 'UY' },
  { country: 'Uruguay', type: 'Mobile', rate: 0.50, iso: 'UY' },
  { country: 'Uzbekistan', type: 'All', rate: 0.30, iso: 'UZ' },
  { country: 'Venezuela', type: 'Fixed', rate: 0.07, iso: 'VE' },
  { country: 'Venezuela', type: 'Mobile', rate: 0.31, iso: 'VE' },
  { country: 'Vietnam', type: 'All', rate: 0.30, iso: 'VN' },
  { country: 'Yemen', type: 'All', rate: 0.39, iso: 'YE' },
  { country: 'Zambia', type: 'All', rate: 22.16, iso: 'ZM' },
  { country: 'Zimbabwe', type: 'All', rate: 1.54, iso: 'ZW' },
];

// Helper: get unique countries from rate card
function getIntlCountries() {
  const seen = new Set();
  return INTL_RATE_CARD.filter(r => {
    if (seen.has(r.country)) return false;
    seen.add(r.country);
    return true;
  }).map(r => ({ country: r.country, iso: r.iso })).sort((a, b) => a.country.localeCompare(b.country));
}

// Helper: get rate entries for a country
function getIntlCountryRates(country) {
  return INTL_RATE_CARD.filter(r => r.country === country);
}

// Helper: get best (lowest fixed, then mobile) outbound rate for a country
function getIntlDefaultRate(country) {
  const rates = getIntlCountryRates(country);
  if (!rates.length) return 0;
  const fixed = rates.find(r => r.type === 'Fixed' || r.type === 'All');
  return fixed ? fixed.rate : rates[0].rate;
}

// India outbound rate (for PSTN leg calculation)
const INTL_INDIA_RATE = 0.08; // $0.08/min
// US VoIP leg rate
const INTL_US_VOIP_RATE = 0.02; // $0.02/min
// Standard display names for tiers (can be overridden per-item via item.customName)
const TIER_DISPLAY_NAMES = { dabbler: 'Dabbler', believer: 'Believer', influencer: 'Influencer', elite: 'Unnamed' };

// ── Terms & Conditions (Full SKU Definitions) ──────────────────────────────
const STARTUP_PARENT_MAP = {
  startup_voice: 'voice_exotel_std',
  startup_sip: 'sip_veeno',
  startup_stream: 'voice_exotel_stream',
  startup_tfn: 'voice_exotel_tfn',
  startup_sms: 'sms_exotel',
  startup_whatsapp: 'whatsapp_exotel',
  startup_rcs: 'rcs_exotel',
  startup_campaigns: 'voice_exotel_campaigns',
};

function getSkuTncHtml(item, entity = 'Exotel') {
  const fields = getSkuFields(item.sku_key, item.tier);
  const getVal = (id) => item.values[id] ?? fields.find(x => x.id === id)?.value ?? 0;

  let tncKey = item.sku_key;
  if (tncKey === 'startup') {
    tncKey = STARTUP_PARENT_MAP['startup_' + (item.tier || 'voice')] || 'voice_exotel_std';
  }

  if (tncKey === 'voice_exotel_std') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Call Charges</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>For outgoing calls (2-leg calls), charges apply separately to each leg (local/STD split).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Rental Coverage</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Rentals for 5/11 months include: User logins, Virtual numbers, Call recordings, Analytics</li>
            <li>Agreement validity: 1 year from the start date.</li>
            <li>Rates may change as per TRAI regulations with a 30-day notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Channels</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Unlimited channels offered from a shared pool with ~130% buffer over prior month’s usage.</li>
            <li>No separate PRI line charges.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments & Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid model; usage is debited against available balance.</li>
            <li>Unused balance is carried forward. Minimum recharge: ₹500.</li>
            <li>Payment receipt issued on the date of payment.</li>
            <li>Tax invoices issued monthly for actual usage.</li>
            <li>Rental invoices raised in the following month.</li>
            <li>Details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs. Payment Receipt</a></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, submit a declaration on company letterhead:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS deduction: u/s 194J @2% (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Incoming and Outgoing Numbers</strong>
          <div style="margin:4px 0 2px 0;"><strong>Incoming Calls:</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Customers must use their own customer-facing number (Airtel or Jio SIMs preferred).</li>
            <li>Calls can be forwarded to Exotel virtual landline numbers available in the following circles: Delhi, Gujarat, Mumbai, Maharashtra, Karnataka, Tamil Nadu, Andhra Pradesh, West Bengal, Rajasthan, Madhya Pradesh, Kerala.</li>
            <li>Displaying Exotel virtual landline numbers as customer-facing numbers is not advisable (no ownership provided).</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Outgoing Calls:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Customers cannot use their own numbers for outbound calls.</li>
            <li>Outgoing calls will display Exotel virtual landline numbers from the above circles.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Custom Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>API documentation: developer.exotel.com/api</li>
            <li>FAQs: Voice & Phone Calls</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal is valid for 30 days from the date of issue.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>SMS Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>SMS charged on submission (DLT registration mandatory).</li>
            <li>BSNL DLT not supported currently.</li>
            <li>Additional DLT scrubbing charge: ₹0.025 per SMS (effective 1st Sept 2020).</li>
            <li>Calls to DND numbers restricted by TRAI.</li>
            <li>Transactional calling usage (enabling DND calling) requires:<br>
              1. Use case documentation<br>
              2. Screenshot of lead record in CRM (name, email, URL, number visible)<br>
              3. Signed and stamped letterhead declaration:<br><em>“&lt;Company name&gt;; known as &lt;Tenant ID&gt;; is using Exotel to make transactional calls to its registered users only. In case of any violation, (Company Name) would be able to provide the opt-in proof within 24 working hours. If the (Company Name) is not able to provide the proof within 24 working hours, Exotel reserves the right to disconnect the connections immediately with prior notice. (Company Name) agrees to the terms of service mentioned here - https://exotel.com/privacy-policy/”</em>
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following via the Exotel Dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN Card</li>
            <li>Certificate of Incorporation / Owner’s Passport</li>
            <li>Company Address Proof (recent postpaid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
            <li>Accepted formats: PNG, GIF, JPEG, PDF</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs available for: Delhi/NCR, Mumbai, Maharashtra, Bengaluru, Hyderabad, Kolkata, Chennai, Ahmedabad, Rajasthan, MP, Kerala.</li>
            <li>VNs remain Exotel’s property; ownership cannot be transferred.</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Virtual Number Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>A new virtual number is assigned during onboarding.</li>
            <li>Exotel is not responsible if the number is marked as spam (depends on customer usage).</li>
            <li>Customers are advised to purchase Truecaller and Airtel Whitelisting Services for credibility.</li>
            <li>Minimum commitment: 6 months for any number allocated.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of Exotel Techcom Private Limited. It is intended solely for the recipient. Any unauthorized sharing, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'voice_exotel_user') {
    const uc = getVal('user_charge');
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Pricing & Billing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>₹${uc} + 18% GST per agent/month (deducted as ${uc} credits).</li>
            <li>1 credit = ₹1.</li>
            <li>Billing cycle: Monthly, from the 1st. Ensure the wallet is topped up by the 29th.</li>
            <li>Pro-rata billing applicable only in the first month.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Agent Management</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Charges apply to all created agent profiles (verified/unverified, active/inactive).</li>
            <li>Adding an agent deducts ₹${uc}.</li>
            <li>Updating an agent’s details (i.e. changing the registered phone number) will not be treated as deleting and re-adding the agent. No credits will be deducted from your wallet for such modifications.</li>
            <li>However, deleting an agent profile and adding a new one mid-month will deduct the full monthly rental as credits again. To avoid unnecessary charges, it is recommended to perform deletions at the end of the month and add new agents at the beginning of the month.</li>
            <li>Recommendation: Delete unused agents before month-end to avoid extra billing.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Agent Creation Policy</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>All agents must be added under Coworkers and Groups on the Exotel dashboard.</li>
            <li>Exotel may auto-create agent profiles from outgoing call logs if API calls are made without corresponding agent profiles on the dashboard.</li>
            <li>Outgoing API calls without dashboard profiles are not permitted.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Calls Included vs. Excluded</strong>
          <div style="margin:4px 0 2px 0;"><strong>Included:</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local calls within India via Exotel VNs.</li>
            <li>Dashboard-originated calls, CRM-based C2C API calls, inbound routed calls (no programmable connect via URL).</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Excluded (charged separately):</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Campaign/bulk calls via dashboard or API.</li>
            <li>Non-agent initiated verification calls.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Fair Usage Policy</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Violations may move account to minute-based billing.</li>
            <li>Exotel will notify and attempt resolution before imposing additional charges.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Plan Flexibility</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>No fixed validity.</li>
            <li>Credit consumption depends on the number of agents added/removed.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs provided for Delhi/NCR, Mumbai, Maharashtra, Bengaluru, Hyderabad, Kolkata, Chennai, Ahmedabad, Rajasthan, MP, Kerala.</li>
            <li>VNs remain Exotel’s property and cannot be ported (Ownership of the number can’t be transferred).</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Virtual Number Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides a new virtual number during onboarding.</li>
            <li>If the number is marked as spam, Exotel will not be responsible, as spam tagging depends on customer usage and behavior.</li>
            <li>Customers are advised to purchase Truecaller and Airtel Whitelisting Services to get their number whitelisted and maintain credibility.</li>
            <li>Exotel requires a minimum commitment of 6 months for any number allocated to a customer account.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payment Terms</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid wallet-based model.</li>
            <li>Minimum top-up: ₹500.</li>
            <li>Unused credits carry forward.</li>
            <li>Call recordings available for 6 months.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Taxes & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>All prices exclusive of 18% GST.</li>
            <li>TDS (if applicable): 2% u/s 194J.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>CRM/ERP integrations via Exotel API.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Offer Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal valid for 30 days from date of issuance.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments & Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Payment receipt on the day of payment.</li>
            <li>Tax invoice issued monthly based on credits consumed.</li>
            <li>Rental invoice raised in the following month.</li>
            <li>More details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs Payment Receipt</a></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, declaration required:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS deductible @2% under Section 194J (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Incoming & Outgoing Numbers</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Incoming:</strong> Customers must use their own number (Airtel/Jio preferred), which can be forwarded to Exotel VNs in supported circles.</li>
            <li><strong>Outgoing:</strong> Customer numbers cannot be used. Outgoing calls will always display Exotel VNs.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>SMS Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>SMS charged on submission; DLT registration mandatory.</li>
            <li>BSNL DLT not supported.</li>
            <li>Operator DLT scrubbing charge: ₹0.025/SMS.</li>
            <li>Calls/SMS to DND numbers restricted by TRAI.</li>
            <li>Transactional usage requires:<br>
              1. Use case documentation<br>
              2. CRM lead screenshot (name, URL, number)<br>
              3. Signed/stamped declaration:<br>
              <em>“[Company Name], known as [Account SID], is using Exotel to make transactional calls to its registered users only. In case of any violation, [Company Name] will provide opt-in proof within 24 hours. We agree to the terms of service: Exotel TOS.”</em>
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload via Exotel dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>PAN card (Company/Owner)</li>
            <li>Certificate of Incorporation / Passport copy of owner</li>
            <li>Address proof (recent post-paid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
            <li>Accepted formats: png, gif, jpeg, pdf</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential, proprietary information of Exotel Techcom Pvt. Ltd. Unauthorized disclosure, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'voice_exotel_tfn') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Toll-Free Number (TFN) – Incoming Only</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>TFN numbers are designated for <strong>incoming calls only</strong>. Outgoing calls are not supported on Toll-Free Numbers.</li>
            <li>Callers across India can reach the TFN at no cost to themselves; charges are borne by the business account.</li>
            <li>Incoming calls are charged per minute as per the agreed rate.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Intelligent Call Routing &amp; Features</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Intelligent call routing with API integrations.</li>
            <li>Detailed call logs and call statuses.</li>
            <li>Call recording and analytics.</li>
            <li>Multi-level IVR systems.</li>
            <li>CRM/ERP integration APIs.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Pricing &amp; Rental</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Rental charges cover: User logins, TFN number(s), Call recordings, Analytics.</li>
            <li>CPM plan: First 200 minutes/day are included; usage beyond 200 mins/day is additionally chargeable. No separate PRI line costs are charged.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Billing &amp; Payments</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Prepaid model: Balance is deducted for incoming call usage. Minimum recharge: ₹500. Unused balance carries forward.</li>
            <li>Invoices:<br>
              ○ Payment receipt issued on the date of payment.<br>
              ○ Tax invoices issued on the 1st of each month for usage in the previous month.<br>
              ○ Software rental invoices are raised in the following month.<br>
              ○ More details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs Payment Receipt</a>.
            </li>
            <li>No extra charges for call recordings or analytics.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST &amp; TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>All prices are exclusive of 18% GST.</li>
            <li>If GST-unregistered, a declaration on company letterhead is required:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS: Deductible u/s 194J @2% (as per GoI Ministry of Finance press release, 13 May 2020).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>TFN Ownership &amp; Policy</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>TFN numbers remain the property of Exotel and are non-transferable.</li>
            <li>If discontinued by the telecom provider, Exotel will replace the number with an alternate TFN.</li>
            <li>A minimum commitment of 6 months is required for any allocated TFN.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Documents to be uploaded via the Exotel dashboard (formats: png, gif, jpeg, pdf):</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN card (or Owner’s PAN).</li>
            <li>Certificate of Incorporation / Owner’s Passport / GST / MSME / Trade license.</li>
            <li>Company address proof (latest post-paid bill, rental agreement).</li>
            <li>Passport-size photo of one Director.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Custom Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>CRM/ERP integration available via API. Documentation: developer.exotel.com/api.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>This commercial proposal is valid for 30 days from the date of issuance.</li>
            <li>Rates are subject to TRAI regulations with at least one month’s prior notice for changes.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential, proprietary, and unpublished material belonging exclusively to Exotel Techcom Private Limited. It is shared with the recipient in strict confidence. Unauthorized disclosure, duplication, or use of this document, in whole or in part, is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'voice_exotel_stream' || tncKey === 'voice_exotel_voicebot') {
    const isVoicebot = tncKey === 'voice_exotel_voicebot';
    const prodName = isVoicebot ? 'Voicebot' : 'Voice Streaming';
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>${entity} ${prodName} – Product Overview</strong>
          <div style="margin:4px 0 2px 0;">This advanced solution allows businesses to:</div>
          <ul style="margin:0 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Deploy conversational bots and AI assistants for automated, intelligent interactions.</li>
            <li>Enable real-time call transcription, keyword detection, and sentiment analysis to enhance quality monitoring and decision-making.</li>
            <li>Automate routine calls, improve customer experience (CX), and monitor agent performance with near-zero latency.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Important Terms</strong>
          <div style="margin:4px 0 2px 0;">Key capabilities include:</div>
          <ul style="margin:0 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Intelligent call routing with API integrations</li>
            <li>Detailed call logs and statuses</li>
            <li>Call recording and analytics</li>
            <li>Multi-level IVR systems</li>
            <li>CRM/ERP integration APIs</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Call Charges</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>For automated calls, a single leg will be consumed.</li>
            <li>For human-initiated outgoing calls (2-leg calls), charges apply separately to each leg (local/STD split).</li>
            <li>Call attempts (not answered calls) are also chargeable.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Rental Coverage</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Rentals for 5/11 months include user logins, virtual numbers, call recordings, and analytics.</li>
            <li>Agreement validity: 1 year from the start date.</li>
            <li>Rates are subject to TRAI regulations, with a 30-day prior notice for any change.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Channels</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>“Channels” refer to the number of concurrent calls supported.</li>
            ${isVoicebot ? '<li>First 5 concurrent channels are included complimentary.</li>' : ''}
            <li>No separate PRI line charges apply.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments & Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid model; usage debited against available balance.</li>
            <li>Unused balance is carried forward.</li>
            <li>Minimum recharge: ₹500.</li>
            <li>Payment receipts issued on payment date; Tax invoices issued monthly based on actual usage.</li>
            <li>Rental invoices raised in the following month.</li>
            <li>Reference: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs. Payment Receipt</a></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, submit a declaration on company letterhead:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS deduction applicable u/s 194J @2% (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Incoming and Outgoing Numbers</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Incoming Calls:</strong> Customers must use their own customer-facing number (Airtel or Jio SIMs preferred). These calls can be forwarded to Exotel’s virtual landline numbers available in circles such as Delhi, Gujarat, Mumbai, Maharashtra, Karnataka, Tamil Nadu, Andhra Pradesh, West Bengal, Rajasthan, Madhya Pradesh, and Kerala. Displaying Exotel virtual numbers as customer-facing is not advisable since ownership remains with Exotel.</li>
            <li><strong>Outgoing Calls:</strong> Customers cannot use their own numbers for outbound calls. Outgoing calls will display Exotel’s virtual landline numbers from the above circles.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Custom Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>API Documentation: developer.exotel.com/api</li>
            <li>Reference Articles:<br>
              ○ VoiceBot FAQs<br>
              ○ Stream and Voicebot Applet<br>
              ○ Voicebot Campaigns
            </li>
            <li>Developer Resources:<br>
              ○ github.com/exotel/Agent-Stream<br>
              ○ github.com/exotel/Agent-Stream-echobot
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal validity: 30 days from the issue date.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>SMS Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>SMS charged on submission (DLT registration mandatory).</li>
            <li>BSNL DLT not supported.</li>
            <li>Operator DLT scrubbing charge: ₹0.025 per SMS (effective 1 Sept 2020).</li>
            <li>Calls to DND numbers restricted by TRAI.</li>
            <li>For transactional use:<br>
              ○ Provide use case documentation.<br>
              ○ Screenshot of lead record in CRM (showing name, URL, and number).<br>
              ○ Signed and stamped declaration:<br>
              <em>“[Company Name], known as [Account SID], is using Exotel to make transactional calls to its registered users only. In case of any violation, [Company Name] will provide opt-in proof within 24 hours. We agree to the terms of service: Exotel TOS.”</em>
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following documents via the Exotel Dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN card</li>
            <li>Certificate of Incorporation / Owner’s Passport</li>
            <li>Company address proof (recent post-paid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
            <li>Accepted formats: png, gif, jpeg, pdf</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs available in: Delhi/NCR, Mumbai, Maharashtra, Bengaluru, Hyderabad, Kolkata, Chennai, Ahmedabad, Rajasthan, MP, and Kerala.</li>
            <li>VNs remain Exotel’s property and cannot be ported or transferred.</li>
            <li>If discontinued by the provider, Exotel will replace the VN with an alternate number.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>A new VN is allocated during onboarding.</li>
            <li>If marked as spam, Exotel is not responsible (depends on customer usage).</li>
            <li>Customers are advised to purchase Truecaller or Airtel Whitelisting Services to maintain credibility.</li>
            <li>A minimum 6-month commitment is required for any number allocated.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of ${entity === 'Veeno' ? 'Veeno Cloud Systems' : 'Exotel Techcom Private Limited'}. It is intended solely for the recipient. Any unauthorized sharing, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'sms_exotel') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Chain Binding & DLT Compliance</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>“Chain binding” refers to binding your Principal Entity (PE) with Telemarketer (TM) partners and telecom operators. This ensures compliance with TRAI guidelines and verifies the message source.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Voice Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Support: For voice services or add-ons, contact hello@exotel.com or your account manager.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Billing & Payments</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Model: 100% prepaid. Balance is deducted for call and SMS usage.</li>
            <li>Carry Forward: Unused balance is carried forward. Minimum recharge: ₹500.</li>
            <li>Invoices:<br>
              ○ Payment receipt on date of payment.<br>
              ○ Tax invoice issued on the 1st of each month, based on usage (e.g., 2,000 credits = invoice for ₹2,000 + GST).<br>
              ○ Software rental invoices raised in the following month.<br>
              ○ Details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs Payment Receipt</a>.
            </li>
            <li>No extra charges for analytics.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Taxes & Compliance</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Prices are exclusive of taxes. 18% GST applies.</li>
            <li>TDS deduction: 2% u/s 194J (as per GoI press release dated 13 May 2020).</li>
            <li>If GST-unregistered, a declaration is required on company letterhead:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following documents via the Exotel dashboard (formats: png, gif, jpeg, pdf):</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN card (or Owner’s PAN card).</li>
            <li>Certificate of Incorporation / GST / MSME / Trade license.</li>
            <li>Company address proof (latest post-paid bill, rental agreement, or bank statement).</li>
            <li>Passport-size photo of one Director.</li>
            <li>Detailed KYC Guidelines.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>This commercial offer is valid for 30 days from the date of issuance.</li>
            <li>Rates are subject to change as per TRAI regulations, with one month’s prior notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>References</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Terms of Service: Exotel TOS.</li>
            <li>API Documentation: developer.exotel.com/api.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential, proprietary, and unpublished material owned exclusively by Exotel Techcom Private Limited. It is shared in strict confidence with the recipient. Unauthorized use, disclosure, or reproduction, in whole or part, is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'whatsapp_exotel') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Per-Message Pricing Policy</strong>
          <div style="margin:4px 0 2px 0;"><strong>Applicable Message Categories:</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Marketing Template Messages: Charged per delivered message.</li>
            <li>Authentication Template Messages: Charged per delivered message.</li>
            <li>Utility Template Messages:<br>
              ○ Free if sent within the active 24-hour customer service window.<br>
              ○ Charged per message if sent outside the customer service window.
            </li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Customer Service Window:</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>A 24-hour window opens when the user initiates or replies to a conversation.</li>
            <li>Any utility messages sent during this window are free of charge.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Example Scenarios</strong>
          <div style="margin:4px 0 2px 0;"><strong>Case 1 – User Replies After All Template Messages Are Sent</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Message Flow:</strong><br>
              12:00 PM – Marketing template message sent<br>
              2:00 PM – Utility template message sent<br>
              8:00 PM – Utility template message sent<br>
              9:00 PM – User replies (after all messages)
            </li>
            <li><strong>Total Charges:</strong> 3 messages (1 Marketing + 2 Utility)<br>
              ✅ Both Utility messages are chargeable as they were sent outside the service window.
            </li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Case 2 – User Replies Before Utility Messages Are Sent</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Message Flow:</strong><br>
              12:00 PM – Marketing template message sent<br>
              1:00 PM – User replies (service window opens)<br>
              2:00 PM – Utility template message sent<br>
              8:00 PM – Utility template message sent
            </li>
            <li><strong>Total Charges:</strong> 1 message (Only the Marketing message)<br>
              ✅ Both Utility messages are free, as they were sent within the open customer service window.
            </li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Platform vs WhatsApp Charges Scenarios:</strong></div>
          <ul style="margin:0 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Scenario 1:</strong> A business sent 4 utility messages, all of them were delivered, out of which 2 were in a customer service window.<br>
              <em>WhatsApp Rate charges:</em> 2 x 0.115 (since the other 2 messages are within a customer service window)<br>
              <em>Platform/API fee charges:</em> 4 x API Fee
            </li>
            <li><strong>Scenario 2:</strong> A business sent 4 utility messages, but only 2 were delivered to the handset, all of them outside customer service window.<br>
              <em>WhatsApp Rate charges:</em> 2 x 0.115 (since only 2 messages were delivered)<br>
              <em>Platform/API fee charges:</em> 4 x API Fee (as messages were successfully sent via our platform)
            </li>
            <li><strong>Scenario 3:</strong> A business sent 4 marketing messages, out of which 3 got delivered.<br>
              <em>WhatsApp Rate charges:</em> 3 x 0.7846 (since only 3 messages were delivered)<br>
              <em>Platform/API fee charges:</em> 4 x API Fee (as messages were successfully sent via our platform)
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments & Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid model; usage charges (calls/SMS/messages) are automatically debited from your wallet.</li>
            <li>Minimum recharge: ₹500. Unused balance carries forward to the next month.</li>
            <li>No additional charges for accessing call recordings or analytics.</li>
            <li>Invoicing:<br>
              ○ Payment receipt is issued immediately upon payment.<br>
              ○ Monthly tax invoice is generated on the 1st of every month based on actual usage (Example: If 2000 credits are consumed, an invoice for ₹2000 + GST will be issued).<br>
              ○ Software rental invoices are raised in the following month.<br>
              ○ 🔗 More details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs. Payment Receipt</a>
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS Requirements</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST Unregistered: Provide a declaration on company letterhead:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS Applicability: Deduct TDS @2% under Section 194J (if applicable).<br>
              As per the Press Release dated 13 May 2020, Page 2, Serial No. 16, issued by the Ministry of Finance, TDS @2% under 194J applies for FTS transactions.
            </li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following via the Exotel dashboard (Accepted formats: PNG, GIF, JPEG, PDF):</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN card</li>
            <li>Certificate of Incorporation / Owner’s passport / MSME / Udyam certificate</li>
            <li>Company address proof (recent post-paid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs provided for Delhi/NCR, Mumbai, Maharashtra, Bengaluru, Hyderabad, Kolkata, Chennai, Ahmedabad, Rajasthan, MP, Kerala.</li>
            <li>VNs remain Exotel’s property and cannot be ported (Ownership of the number can’t be transferred).</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Virtual Number Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides a new virtual number during onboarding.</li>
            <li>If the number is marked as spam, Exotel will not be responsible, as spam tagging depends on customer usage and behavior.</li>
            <li>Customers are advised to purchase Truecaller and Airtel Whitelisting Services to get their number whitelisted and maintain credibility.</li>
            <li>Exotel requires a minimum commitment of 6 months for any number allocated to a customer account.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>This commercial proposal is valid for 30 days from the date of issuance.</li>
            <li>Rates are subject to TRAI regulations with at least one month’s prior notice for changes.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of Exotel Techcom Pvt. Ltd. Unauthorized sharing, distribution, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'rcs_exotel') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Voice Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Support: For voice services or add-ons, contact hello@exotel.com or your account manager.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Billing & Payments</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Model: 100% prepaid. Balance is deducted for call and RCS usage.</li>
            <li>Carry Forward: Unused balance is carried forward. Minimum recharge: ₹500.</li>
            <li>Invoices:<br>
              ○ Payment receipt on date of payment.<br>
              ○ Tax invoice issued on the 1st of each month, based on usage (e.g., 2,000 credits = invoice for ₹2,000 + GST).<br>
              ○ Software rental invoices raised in the following month.<br>
              ○ Details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs Payment Receipt</a>.
            </li>
            <li>No extra charges for analytics.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Taxes & Compliance</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Prices are exclusive of taxes. 18% GST applies.</li>
            <li>TDS deduction: 2% u/s 194J (as per GoI press release dated 13 May 2020).</li>
            <li>If GST-unregistered, a declaration is required on company letterhead:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following documents via the Exotel dashboard (formats: png, gif, jpeg, pdf):</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN card (or Owner’s PAN card).</li>
            <li>Certificate of Incorporation / GST / MSME / Trade license.</li>
            <li>Company address proof (latest post-paid bill, rental agreement, or bank statement).</li>
            <li>Passport-size photo of one Director.</li>
            <li>Detailed KYC Guidelines.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>This commercial offer is valid for 30 days from the date of issuance.</li>
            <li>Rates are subject to change as per TRAI regulations, with one month’s prior notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>References</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Terms of Service: Exotel TOS.</li>
            <li>API Documentation: developer.exotel.com/api.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential, proprietary, and unpublished material owned exclusively by Exotel Techcom Private Limited. It is shared in strict confidence with the recipient. Unauthorized use, disclosure, or reproduction, in whole or part, is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'voice_veeno_std' || tncKey === 'voice_veeno_user') {
    const uc = getVal('user_charge');
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Pricing & Billing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>₹${uc} + 18% GST per agent/month (deducted as ${uc} credits).</li>
            <li>1 credit = ₹1.</li>
            <li>The call charges will be applicable.</li>
            <li>Billing cycle: Monthly, from the 1st. Ensure the wallet is topped up by the 29th.</li>
            <li>Pro-rata billing applicable only in the first month.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Agent Management</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Charges apply to all created agent profiles (verified/unverified, active/inactive).</li>
            <li>Adding an agent deducts ₹${uc}.</li>
            <li>Updating an agent’s details (i.e. changing the registered phone number) will not be treated as deleting and re-adding the agent. No credits will be deducted from your wallet for such modifications.</li>
            <li>However, deleting an agent profile and adding a new one mid-month will deduct the full monthly rental as credits again. To avoid unnecessary charges, it is recommended to perform deletions at the end of the month and add new agents at the beginning of the month.</li>
            <li>Recommendation: Delete unused agents before month-end to avoid extra billing.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Agent Creation Policy</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>All agents must be added under Coworkers and Groups on the Exotel dashboard.</li>
            <li>Exotel may auto-create agent profiles from outgoing call logs if API calls are made without corresponding agent profiles on the dashboard.</li>
            <li>Outgoing API calls without dashboard profiles are not permitted.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Calls Included vs. Excluded</strong>
          <div style="margin:4px 0 2px 0;"><strong>Included:</strong></div>
          <ul style="margin:0 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local calls within India via Exotel VNs.</li>
            <li>Dashboard-originated calls, CRM-based C2C API calls, inbound routed calls (no programmable connect via URL).</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Excluded (charged separately):</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Campaign/bulk calls via dashboard or API.</li>
            <li>Non-agent initiated verification calls.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Fair Usage Policy</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Violations may move accounts to minute-based billing.</li>
            <li>Exotel will notify and attempt resolution before imposing additional charges.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Plan Flexibility</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>No fixed validity.</li>
            <li>Credit consumption depends on the number of agents added/removed.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs provided for Delhi, Mumbai, Bengaluru, Hyderabad, Kolkata and Ahmedabad.</li>
            <li>Mobile DIDs available for selected states, please contact your account manager or Exotel support.</li>
            <li>VNs remain Exotel’s property and cannot be ported (Ownership of the number can’t be transferred).</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Virtual Number Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides a new virtual number during onboarding.</li>
            <li>If the number is marked as spam, Exotel will not be responsible, as spam tagging depends on customer usage and behavior.</li>
            <li>Customers are advised to purchase Truecaller and Airtel Whitelisting Services to get their number whitelisted and maintain credibility.</li>
            <li>Exotel requires a minimum commitment of 6 months for any number allocated to a customer account.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payment Terms</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid wallet-based model.</li>
            <li>Minimum top-up: ₹500.</li>
            <li>Unused credits carry forward.</li>
            <li>Call recordings available for 6 months.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Taxes & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>All prices exclusive of 18% GST.</li>
            <li>TDS (if applicable): 2% u/s 194J.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>CRM/ERP integrations via Exotel API.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Offer Validity & Agreement</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal valid for 30 days from date of issuance.</li>
            <li>Agreement Validity: One (1) year from the start date (Go Live Date).</li>
            <li>Rates may change in line with TRAI regulations with a minimum 1-month notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments &amp; Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Payment receipt on the day of payment.</li>
            <li>Tax invoice issued monthly based on credits consumed.</li>
            <li>Rental invoice raised in the following month.</li>
            <li>More details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs Payment Receipt</a></li>
          </ul>
          <div style="margin:6px 0 2px 0;"><strong>Bank Account for Payment:</strong></div>
          <table style="font-size:0.78rem; border-collapse:collapse; margin-left:4px;">
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Account Name</td><td style="font-weight:600;">Veeno Communication Private Limited</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Account Number</td><td style="font-weight:600;">0512126571</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Bank Name</td><td style="font-weight:600;">Kotak Mahindra Bank Limited</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">IFSC Code</td><td style="font-weight:600;">KKBK0008066</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Branch</td><td style="font-weight:600;">MG Road, Bangalore</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Address</td><td style="font-weight:600;">#22, Ground Floor, MG Road, Bangalore - 560001</td></tr>
          </table>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, declaration required:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS deductible @2% under Section 194J (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Incoming & Outgoing Numbers</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Incoming:</strong> Customers must use their own number (Airtel/Jio preferred), which can be forwarded to Exotel VNs in supported circles.</li>
            <li><strong>Outgoing:</strong> Customer numbers cannot be used. Outgoing calls will always display Exotel VNs.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>SMS Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides SMS services; however, SMS is not supported for this particular account. Please reach out to Exotel support or your account manager for further assistance.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following via the Exotel dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Please note that to procure SIP lines from Exotel, the company must be registered in Karnataka, Mumbai, Delhi, West Bengal, Gujarat, or Andhra Pradesh, and KYC is mandatory even for trial accounts; after creating a trial account, visit the KYC document section, select your registered city, download the CAF form, complete, sign, and seal it, and submit it along with the Aadhaar card to your Exotel account manager for KYC approval.</li>
            <li>Company PAN card</li>
            <li>Certificate of Incorporation / Owner’s passport / MSME / Udyog aadhar</li>
            <li>Company address proof (recent post-paid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
            <li>Accepted formats: png, gif, jpeg, pdf</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential, proprietary information of Exotel Techcom Pvt. Ltd. Unauthorized disclosure, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'sip_veeno') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Important Terms</strong>
          <div style="margin:4px 0 2px 0;"><strong>Call Charges</strong></div>
          <ul style="margin:0 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>For automated calls, a single leg will be consumed.</li>
            <li>For human-initiated outgoing calls (2-leg calls), charges apply separately to each leg (local/STD split).</li>
            <li>Call attempts (not answered calls) are also chargeable.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Rental Coverage</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Rentals for 5/11 months include user logins, virtual numbers, call recordings, and analytics.</li>
            <li>Agreement is valid for 1 year from start date.</li>
            <li>Rates may change as per TRAI regulations with 30 days’ notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Channels</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Unlimited channels offered from a shared pool with ~130% buffer over prior month’s usage.</li>
            <li>No separate PRI line charges.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments &amp; Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid model; usage debited against balance.</li>
            <li>Unused balance is carried forward. Minimum recharge: ₹500.</li>
            <li>Payment receipt issued on payment date. Tax invoices issued monthly for actual usage.</li>
            <li>Rental invoices raised in the following month.</li>
            <li>Details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs. Payment Receipt</a></li>
          </ul>
          <div style="margin:6px 0 2px 0;"><strong>Bank Account for Payment:</strong></div>
          <table style="font-size:0.78rem; border-collapse:collapse; margin-left:4px;">
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Account Name</td><td style="font-weight:600;">Veeno Communication Private Limited</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Account Number</td><td style="font-weight:600;">0512126571</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Bank Name</td><td style="font-weight:600;">Kotak Mahindra Bank Limited</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">IFSC Code</td><td style="font-weight:600;">KKBK0008066</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Branch</td><td style="font-weight:600;">MG Road, Bangalore</td></tr>
            <tr><td style="padding:2px 10px 2px 0; color:#475569;">Address</td><td style="font-weight:600;">#22, Ground Floor, MG Road, Bangalore - 560001</td></tr>
          </table>
        </li>
        <li style="margin-bottom:8px;"><strong>GST & TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, a declaration on company letterhead is required:<br><em>“This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit.”</em></li>
            <li>TDS: Deduction u/s 194J @2% (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Incoming and outgoing Numbers</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>Incoming Calls:</strong> Customers must use their own customer-facing number (Airtel or Jio SIMs are preferred). These calls can be forwarded to Exotel virtual landline numbers where available in circles such as Delhi, Gujarat, Mumbai, Maharashtra, Karnataka, Tamil Nadu, Andhra Pradesh, West Bengal, Rajasthan, Madhya Pradesh, and Kerala.<br>Displaying Exotel virtual landline numbers as customer-facing numbers is not advisable since Exotel does not provide ownership of these numbers.</li>
            <li><strong>Outgoing Calls:</strong> Customers cannot use their own numbers for outbound calls. Outgoing calls will always display Exotel virtual landline numbers from the above circles.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Custom Integrations</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>API documentation: developer.exotel.com/api.</li>
            <li>FAQs - Voice & Phone Calls</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal valid for 30 days from issue date.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>SMS Services</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides SMS services; however, SMS is not supported for this particular account. Please reach out to Exotel support or your account manager for further assistance.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following via the Exotel dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Please note that to procure SIP lines from Exotel, the company must be registered in Karnataka, Mumbai, Delhi, West Bengal, Gujarat, or Andhra Pradesh, and KYC is mandatory even for trial accounts; after creating a trial account, visit the KYC document section, select your registered city, download the CAF form, complete, sign, and seal it, and submit it along with the Aadhaar card to your Exotel account manager for KYC approval</li>
            <li>Company PAN card</li>
            <li>Certificate of Incorporation / Owner’s passport / MSME / Udyog aadhar</li>
            <li>Company address proof (recent post-paid bill, rental agreement, or bank statement)</li>
            <li>Director’s passport-size photo</li>
            <li>Accepted formats: png, gif, jpeg, pdf</li>
            <li>Guidelines: KYC Documentation</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Number (VN) Policy</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Local landline VNs provided for Delhi, Mumbai, Bengaluru, Hyderabad, Kolkata and Ahmedabad</li>
            <li>Mobile DIDs available for selected states, please contact your account manager or Exotel support.</li>
            <li>VNs remain Exotel’s property and cannot be ported (Ownership of the number can’t be transferred).</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
          <div style="margin:0 0 2px 0;"><strong>Virtual Number Spam & Whitelisting Policy:</strong></div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Exotel provides a new virtual number during onboarding.</li>
            <li>If the number is marked as spam, Exotel will not be responsible, as spam tagging depends on customer usage and behavior.</li>
            <li>Customers are advised to purchase Truecaller and Airtel Whitelisting Services to get their number whitelisted and maintain credibility.</li>
            <li>Exotel requires a minimum commitment of 6 months for any number allocated to a customer account.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of Exotel Techcom Private Limited. It is intended solely for the recipient. Any unauthorized sharing, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  if (tncKey === 'voice_exotel_campaigns') {
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>Call Charges</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>This is a <strong>single-leg billing</strong> plan — only one call leg is charged per connected call minute.</li>
            <li>Ideal for outbound bulk/campaign calling where the agent leg is not billed separately.</li>
            <li>Call attempts (unanswered or failed) may also be chargeable depending on the campaign setup.</li>
            <li>Call rate applies per minute of actual connected duration.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Rental Coverage</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Rentals for 5/11 months include: User logins, Virtual numbers, Call recordings, Analytics.</li>
            <li>Agreement validity: 1 year from the start date.</li>
            <li>Rates may change as per TRAI regulations with a 30-day notice.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Channels</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>CPM plan: First 200 minutes/day are included; usage beyond 200 mins/day is additionally chargeable.</li>
            <li>No separate PRI line charges.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Payments &amp; Invoicing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>100% prepaid model; usage is debited against available balance.</li>
            <li>Unused balance is carried forward. Minimum recharge: ₹500.</li>
            <li>Payment receipt issued on the date of payment.</li>
            <li>Tax invoices issued monthly for actual usage.</li>
            <li>Rental invoices raised in the following month.</li>
            <li>Details: <a href="https://support.exotel.com/support/solutions/articles/3000099511-what-is-the-difference-between-a-tax-invoice-and-a-payment-receipt-where-can-i-download-the-tax-invo" target="_blank" style="color:#0284c7; text-decoration:underline;">Tax Invoice vs. Payment Receipt</a></li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>GST &amp; TDS</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>If GST unregistered, submit a declaration on company letterhead:<br><em>"This is to confirm that we are not eligible for GST and are therefore not registered under the GST Act, 2017. We further confirm that we will not claim Input Tax Credit."</em></li>
            <li>TDS deduction: u/s 194J @2% (if applicable).</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Virtual Numbers</strong>
          <ul style="margin:2px 0 6px 0; padding-left:18px; list-style-type:circle;">
            <li>Outgoing calls display Exotel virtual landline numbers from supported circles.</li>
            <li>VNs remain Exotel's property; ownership cannot be transferred.</li>
            <li>If discontinued by the provider, Exotel will replace it with an alternate VN.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>KYC Requirements</strong>
          <div style="margin:4px 0 2px 0;">Upload the following via the Exotel Dashboard:</div>
          <ul style="margin:0; padding-left:18px; list-style-type:circle;">
            <li>Company PAN Card</li>
            <li>Certificate of Incorporation / Owner's Passport</li>
            <li>Company Address Proof (recent postpaid bill, rental agreement, or bank statement)</li>
            <li>Director's passport-size photo</li>
            <li>Accepted formats: PNG, GIF, JPEG, PDF</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Commercial Validity</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Proposal is valid for 30 days from the date of issue.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of Exotel Techcom Private Limited. It is intended solely for the recipient. Any unauthorized sharing, use, or reproduction is strictly prohibited.
      </div>
    `;
  }
  if (tncKey === 'voice_intl') {
    const prepaid = getVal('prepaid_usd') || 400;
    const users = getVal('num_users') || 1;
    const numbers = getVal('num_numbers') || 1;
    const country = getVal('intl_country') || 'United States';
    return `
      <ol style="margin:0; padding-left:20px; text-align:left; font-size:0.8rem;">
        <li style="margin-bottom:8px;"><strong>USD Pricing & Account Billing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Pricing and billing for this plan are denominated exclusively in US Dollars (USD).</li>
            <li>Fixed Prepaid model: Minimum initial prepay amount is $${prepaid}. Account access is subject to maintaining a positive balance.</li>
            <li>Billing cycle: Monthly subscription fees are deducted automatically from the prepaid balance on the 1st of each month.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Monthly Rentals</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>User access fee: $15 per agent profile per month.</li>
            <li>Number rental fee: $15 per virtual number per month.</li>
            <li>Monthly rentals are deducted from the prepaid credits. If the balance falls below zero, outgoing calls may be suspended.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>International Call Routing & Leg-based Billing</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li><strong>VoIP Calling:</strong> Incoming calls to VoIP client are Free. Outgoing calls are charged at the outbound destination country rate.</li>
            <li><strong>PSTN Calling:</strong> Incoming calls forwarded to Indian numbers are charged at $0.08/min (the India leg) as the US leg is free. Outgoing calls are billed for both legs: the destination country leg plus the Indian telecaller leg ($0.08/min).</li>
            <li>Pulse rate: All calls are billed on a 60-second pulse.</li>
          </ul>
        </li>
        <li style="margin-bottom:8px;"><strong>Compliance & Virtual Numbers</strong>
          <ul style="margin:2px 0 0 0; padding-left:18px; list-style-type:circle;">
            <li>Virtual numbers remain the property of Exotel and are subject to destination country regulations and KYC guidelines.</li>
          </ul>
        </li>
      </ol>
      <div style="margin-top:16px; font-size:0.75rem; color:#64748b; font-style:italic;">
        Disclaimer: This document contains confidential and proprietary information of Exotel Techcom Private Limited. It is intended solely for the recipient. Any unauthorized sharing, use, or reproduction is strictly prohibited.
      </div>
    `;
  }

  return null;
}

function generateTncHtml(validItems, entity) {
  let html = '';
  validItems.forEach(item => {
    const skuHtml = getSkuTncHtml(item, entity);
    if (skuHtml) html += skuHtml;
  });

  // Fallback if no specific T&Cs are defined yet
  if (!html) {
    html = `<ul style="margin:0; padding-left:20px; text-align:left;">
      <li style="margin-bottom:6px;">All prices are exclusive of GST unless stated otherwise. GST @ 18% applicable.</li>
      <li style="margin-bottom:6px;">This quotation is valid for 30 days from the date of issue.</li>
      <li style="margin-bottom:6px;">Setup charges are waived as indicated. Waived amounts are non-refundable once service is activated.</li>
      <li style="margin-bottom:6px;">Call credits are consumed as per usage and are non-transferable.</li>
      <li style="margin-bottom:6px;">Services are subject to ${entity}'s standard Terms of Service and Acceptable Use Policy.</li>
      <li style="margin-bottom:6px;">Payment terms: 100% advance unless otherwise agreed in writing.</li>
    </ul>`;
  }

  return html;
}

// Per-SKU default fields: { id, label, value, locked, stopType, stopVal, note, waived, nonEditable }
function getSkuFields(skuKey, tier) {
  const t = TIER_DEFAULTS[tier] || TIER_DEFAULTS.dabbler;
  const sms_field = { id: 'sms_cost', label: 'SMS Cost (p/msg)', value: 21, locked: true, stopType: 'lower', stopVal: 17, note: 'SMS Add-on' };
  const wa_fields = [
    { id: 'wa_utility', label: 'WhatsApp Utility (p/msg)', value: 11, locked: true, stopType: null, nonEditable: true, note: 'WA Add-on' },
    { id: 'wa_promo', label: 'WhatsApp Promo (p/msg)', value: 86, locked: true, stopType: null, nonEditable: true, note: 'WA Add-on' },
    { id: 'wa_api', label: 'WhatsApp API Charge (p/msg, both Utility & Promo)', value: 6, locked: true, stopType: 'lower', stopVal: 4, note: 'WA Add-on' },
  ];

  switch (skuKey) {
    // ── Exotel STD (minute-based, with addons) ──────────────────────
    case 'voice_exotel_std': {
      return [
        { id: 'validity', label: 'Validity (months)', value: t.validity, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'rental', label: 'Account Rental (₹)', value: t.rental, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'attach_isd_pdf', label: 'Attach ISD Rate Card PDF', value: 0, type: 'boolean' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: t.free_users ?? 'Unlimited', locked: true, stopType: t.users_stop ? 'upper' : null, stopVal: t.users_stop },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: t.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'credits', label: 'Call Credits (₹)', value: t.credits, locked: true, stopType: 'lower', stopVal: t.credits },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'single_leg', label: 'Single Leg Charge (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
        { id: 'incoming', label: 'Incoming (Single Leg) (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
        { id: 'outgoing', label: 'Outgoing (Double Leg) (p/min)', value: t.single_leg * 2, locked: true, stopType: 'lower', stopVal: t.stop_single * 2 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        sms_field, ...wa_fields,
        { id: 'call_transfer', label: 'Call Transfer (₹/month)', value: 499, locked: false, note: 'CT Add-on' },
      ];
    }

    // ── Veeno STD (minute-based, flat ₹1,000/month rental, no tiers) ─
    case 'voice_veeno_std': {
      return [
        { id: 'validity', label: 'Validity (months)', value: 11, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'rental', label: 'Account Rental (₹)', value: 1000, type: 'rental_toggle', locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'attach_isd_pdf', label: 'Attach ISD Rate Card PDF', value: 0, type: 'boolean' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        {
          id: 'user_charge', label: 'User Charge – Veeno Model (₹/user/month)', value: 1000, locked: true, stopType: 'lower', stopVal: 1000,
          note: 'Non-waiveable. Charged from user 1.'
        },
        { id: 'user_model_exotel', label: 'Pricing Model', value: 0, type: 'model_toggle', locked: false },
        { id: 'exotel_free_users', label: 'Free Users (Exotel model)', value: 6, locked: false },
        { id: 'exotel_user_charge', label: 'Extra User Charge – Exotel model (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 199 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        // Mobile DID option instead of landline
        { id: 'did_numbers', label: 'Mobile DID Numbers (optional)', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Rate (₹/Mobile DID/month)', value: 1500, locked: false, stopType: 'lower', stopVal: 1000 },
        { id: 'remove_std_numbers', label: 'Remove landline numbers?', value: 0, type: 'boolean', locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 4000 },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'single_leg', label: 'Single Leg Charge (p/min)', value: 52, locked: true, stopType: 'lower', stopVal: 52 },
        { id: 'incoming', label: 'Incoming Call Charges (p/min, 0=Free)', value: 0, locked: false, stopType: 'lower', stopVal: 0, note: '0 means Free for client' },
        { id: 'outgoing', label: 'Outgoing (Single Leg) (p/min)', value: 52, locked: true, stopType: 'lower', stopVal: 52 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'call_transfer', label: 'Call Transfer (₹/month)', value: 499, locked: false, note: 'CT Add-on' },
      ];
    }

    // ── Exotel User-based ───────────────────────────────────────────
    case 'voice_exotel_user':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 5 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'user_charge', label: 'User Charge (₹/user/month)', value: 2000, locked: true, stopType: 'lower', stopVal: 1600 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Paid Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Paid Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'incoming', label: 'Incoming Call Charges', value: 0, locked: true, nonEditable: true, waived: true },
        { id: 'outgoing', label: 'Outgoing Call Charges', value: 0, locked: true, nonEditable: true, waived: true },
        { id: 'call_transfer', label: 'Call Transfer (₹/month)', value: 499, locked: false, note: 'CT Add-on' },
      ];

    // ── Veeno User-based (₹2,000/user, no free users) ───────────────
    case 'voice_veeno_user':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 5 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        {
          id: 'user_charge', label: 'User Charge (₹/user/month)', value: 2000, locked: true, stopType: 'lower', stopVal: 2000,
          note: 'Non-waiveable. Charged from user 1.'
        },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        // Mobile DID option
        { id: 'did_numbers', label: 'Mobile DID Numbers (optional)', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Rate (₹/Mobile DID/month)', value: 1500, locked: false, stopType: 'lower', stopVal: 1000 },
        { id: 'remove_std_numbers', label: 'Remove landline numbers?', value: 0, type: 'boolean', locked: false },
        { id: 'incoming', label: 'Incoming Call Charges', value: 0, locked: true, nonEditable: true, waived: true },
        { id: 'outgoing', label: 'Outgoing Call Charges', value: 0, locked: true, nonEditable: true, waived: true },
        { id: 'call_transfer', label: 'Call Transfer (₹/month)', value: 499, locked: false, note: 'CT Add-on' },
      ];

    case 'voice_exotel_tfn':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'num_numbers', label: 'No. of TFN Numbers', value: 1, locked: false },
        { id: 'number_cost', label: 'TFN Number Cost (₹/number/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1000 },
        { id: 'add_vn', label: 'Add Virtual Landline Numbers?', type: 'boolean', value: 0 },
        { id: 'free_numbers', label: 'Free Virtual Landline Numbers', value: 1, locked: false, note: 'VN Add-on' },
        { id: 'num_paid_numbers', label: 'No. of Extra Virtual Landline Numbers', value: 0, locked: false, note: 'VN Add-on' },
        { id: 'extra_number', label: 'Extra Virtual Landline Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299, note: 'VN Add-on' },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 39000 },
        { id: 'incoming', label: 'Incoming Call Charge (p/min)', value: 190, locked: true, stopType: 'lower', stopVal: 150 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
      ];
    case 'voice_exotel_stream':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 6, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'num_channels', label: 'No. of Channels', value: 5, locked: true, stopType: 'lower', stopVal: 3 },
        { id: 'channel_cost', label: 'Channel Cost (₹/channel/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1200 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 4000 },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: true, stopType: 'lower', stopVal: 16 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 40 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'human_handoff', label: 'Enable Human Handoff? (Voicebot to Agent)', type: 'boolean', value: 0 },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 6, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true, stopType: 'upper', stopVal: 5 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'did_numbers', label: 'No. of Mobile DID Numbers', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Cost (₹/number/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1000 },
      ];
    case 'voice_exotel_voicebot':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 6, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'num_channels', label: 'No. of Channels', value: 5, locked: false, stopType: 'lower', stopVal: 5 },
        { id: 'channel_cost', label: 'Channel Cost (₹/channel/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1200 },
        { id: 'volume', label: 'Monthly Call Volume (mins)', value: 1000, locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: 50000, locked: true, stopType: 'lower', stopVal: 50000, note: 'Volume × Rate × Months (Min ₹50,000)' },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 500, locked: true, stopType: 'lower', stopVal: 300 },
        { id: 'incoming', label: 'Incoming (p/min)', value: 500, locked: true, stopType: 'lower', stopVal: 300 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'human_handoff', label: 'Enable Human Handoff? (Voicebot to Agent)', type: 'boolean', value: 0 },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 6, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true, stopType: 'upper', stopVal: 5 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'did_numbers', label: 'No. of Mobile DID Numbers', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Cost (₹/number/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1000 },
      ];
    case 'sms_exotel':
      return [
        { id: 'rental', label: 'Account Rental (₹/month)', value: 1000, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'credits', label: 'SMS Credits (₹)', value: 10000, locked: true, stopType: 'lower', stopVal: 5000 },
        { id: 'sms_cost', label: 'SMS Cost (p/sms)', value: 21, locked: true, stopType: 'lower', stopVal: 16 },
      ];
    case 'whatsapp_exotel':
      return [
        { id: 'rental', label: 'Account Rental (₹/month)', value: 4000, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'credits', label: 'WA Credits (₹)', value: 10000, locked: true, stopType: 'lower', stopVal: 5000 },
        { id: 'wa_utility', label: 'Utility Msg (p/msg)', value: 11, locked: true, nonEditable: true },
        { id: 'wa_promo', label: 'Promotional Msg (p/msg)', value: 86, locked: true, nonEditable: true },
        // API charge applies to BOTH utility and promo messages
        {
          id: 'wa_api', label: 'API Charge (p/msg, applies to ALL messages)', value: 6, locked: true, stopType: 'lower', stopVal: 4,
          note: 'Applies to both Utility and Promotional messages'
        },
      ];
    case 'rcs_exotel':
      return [
        { id: 'brand_fee', label: 'Brand Registration (₹)', value: 15000, locked: true, stopType: 'lower', stopVal: 10000 },
        { id: 'rental', label: 'Account Rental (₹/month)', value: 4000, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'number_cost', label: 'Number (₹/month)', value: 499, locked: true, note: 'Can be waived' },
        { id: 'credits', label: 'RCS Credits (₹)', value: 35000, locked: true, stopType: 'lower', stopVal: 35000 },
        { id: 'rcs_biz', label: 'RCS Business Msg (p/msg)', value: 22, locked: true, nonEditable: true },
        { id: 'rcs_rich', label: 'RCS Rich Media (p/msg)', value: 28, locked: true, nonEditable: true },
        { id: 'rcs_reply', label: 'User Reply Charge (p/msg)', value: 18, locked: true, nonEditable: true },
      ];
    case 'sip_veeno': {
      const t2 = TIER_DEFAULTS[tier] || TIER_DEFAULTS.dabbler;
      return [
        { id: 'validity', label: 'Validity (months)', value: t2.validity, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'rental', label: 'Account Rental (₹)', value: t2.rental, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: t2.free_users ?? 'Unlimited', locked: true, stopType: t2.users_stop ? 'upper' : null, stopVal: t2.users_stop },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'free_numbers', label: 'Free Numbers', value: t2.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        // Mobile DID option
        { id: 'did_numbers', label: 'Mobile DID Numbers (optional)', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Rate (₹/Mobile DID/month)', value: 1500, locked: false, stopType: 'lower', stopVal: 1000 },
        { id: 'remove_std_numbers', label: 'Remove landline numbers?', value: 0, type: 'boolean', locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: t2.credits, locked: true, stopType: 'lower', stopVal: t2.credits },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: true, stopType: 'lower', stopVal: 16 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 40 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 6, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        // No SMS/WA addons for Veeno
      ];
    }
    case 'num_1400':
    case 'num_1600':
      return [
        { id: 'procurement', label: 'Number Procurement (₹)', value: 10000, locked: true, stopType: 'lower', stopVal: 2000 },
        { id: 'rental', label: 'Number Rental (₹/month)', value: 850, locked: true, stopType: 'lower', stopVal: 850 },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_channels', label: 'No. of Channels', value: 30, locked: true, stopType: 'lower', stopVal: 10 },
        { id: 'channel_cost', label: 'Channel Cost (₹/month)', value: 1000, locked: true, nonEditable: true },
        { id: 'num_months', label: 'No. of Months', value: 12, locked: true, stopType: 'lower', stopVal: 6 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 20000 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 50 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
      ];
    case 'voice_exotel_campaigns': {
      return [
        { id: 'validity', label: 'Validity (months)', value: t.validity, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'rental', label: 'Account Rental (₹)', value: t.rental, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: t.free_users ?? 'Unlimited', locked: true, stopType: t.users_stop ? 'upper' : null, stopVal: t.users_stop },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: t.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'credits', label: 'Call Credits (₹)', value: t.credits, locked: true, stopType: 'lower', stopVal: t.credits },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'call_rate', label: 'Campaign Rate (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single, note: 'Single-leg: one charge per call per minute' },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
      ];
    }
    case 'voice_veeno_campaigns':
      return [];

    // ── Startup Plan wrapper (delegates to startup_* by tier) ───────
    case 'startup': {
      const validSubs = ['voice','sip','stream','tfn','sms','whatsapp','rcs','campaigns'];
      const sub = validSubs.includes(tier) ? tier : 'voice';
      return getSkuFields('startup_' + sub, 'dabbler');
    }
    case 'startup_voice':
      return [
        { id: 'validity', label: 'Validity (months)', value: 6, locked: true, nonEditable: true },
        { id: 'rental', label: 'Account Rental (₹)', value: 4999, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'extra_credits', label: 'Additional Credits (₹)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'single_leg', label: 'Single Leg Charge (p/min)', value: 60, locked: false },
        { id: 'incoming', label: 'Incoming (Single Leg) (p/min)', value: 60, locked: false },
        { id: 'outgoing', label: 'Outgoing (Double Leg) (p/min)', value: 120, locked: false },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
      ];
    case 'startup_sip':
      return [
        { id: 'validity', label: 'Validity (months)', value: 6, locked: true, nonEditable: true },
        { id: 'rental', label: 'Account Rental (\u20b9)', value: 0, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (\u20b9)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted \u2013 no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (\u20b9/user/month)', value: 199, locked: false },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (\u20b9/number/month)', value: 499, locked: false },
        { id: 'credits', label: 'Call Credits (\u20b9)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'extra_credits', label: 'Additional Credits (\u20b9)', value: 0, locked: false, note: 'Gifted \u2013 no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted \u2013 no charge to client' },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: false },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: false },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 6, locked: false, note: 'Can be waived (set to 0)' },
      ];
    case 'startup_stream':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 6, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'num_channels', label: 'No. of Channels', value: 5, locked: true, stopType: 'lower', stopVal: 3 },
        { id: 'channel_cost', label: 'Channel Cost (₹/channel/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1200 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 4000 },
        { id: 'extra_credits', label: 'Additional Credits (₹)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: true, stopType: 'lower', stopVal: 16 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 40 },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
        { id: 'human_handoff', label: 'Enable Human Handoff? (Voicebot to Agent)', type: 'boolean', value: 0 },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 6, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived (set to 0)' },
        { id: 'free_users', label: 'Free Users', value: 3, locked: true, stopType: 'upper', stopVal: 5 },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false, stopType: 'lower', stopVal: 299 },
        { id: 'did_numbers', label: 'No. of Mobile DID Numbers', value: 0, locked: false },
        { id: 'did_cost', label: 'Mobile DID Cost (₹/number/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1000 },
      ];
    case 'startup_tfn':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'num_numbers', label: 'No. of TFN Numbers', value: 1, locked: false },
        { id: 'number_cost', label: 'TFN Number Cost (₹/number/month)', value: 1500, locked: false },
        { id: 'num_months', label: 'No. of Months', value: 2, locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: 3000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'incoming', label: 'Incoming Call Charge (p/min)', value: 190, locked: false },
        { id: 'pulse', label: 'Billing Pulse', value: 60, type: 'pulse', locked: false },
      ];
    case 'startup_sms':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 1, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false },
        { id: 'credits', label: 'SMS Credits (₹)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'sms_cost', label: 'SMS Cost (p/msg)', value: 21, locked: false },
      ];
    case 'startup_whatsapp':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 1, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false },
        { id: 'credits', label: 'WA Credits (₹)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'wa_utility', label: 'WhatsApp Utility (p/msg)', value: 11, locked: true, nonEditable: true },
        { id: 'wa_promo', label: 'WhatsApp Promo (p/msg)', value: 86, locked: true, nonEditable: true },
        { id: 'wa_api', label: 'WhatsApp API Charge (p/msg)', value: 6, locked: false },
      ];
    case 'startup_rcs':
      return [
        { id: 'brand_fee', label: 'Brand Registration Fee (₹)', value: 8500, locked: true, nonEditable: true, waived: true },
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 1, locked: false },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'number_cost', label: 'Number Cost (₹/month)', value: 0, locked: false },
        { id: 'credits', label: 'RCS Credits (₹)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'rcs_biz', label: 'Business Messaging (p/msg)', value: 15, locked: false },
        { id: 'rcs_rich', label: 'Rich Media Messaging (p/msg)', value: 25, locked: false },
        { id: 'rcs_reply', label: 'User Reply Charge (p/msg)', value: 10, locked: false },
      ];
    case 'startup_campaigns':
      return [
        { id: 'validity', label: 'Validity (months)', value: 1, locked: false },
        { id: 'rental', label: 'Account Rental (₹)', value: 4999, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'CPM', value: '200 Calls/Min (Additional Chargeable)', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_users', label: 'Additional Free Users', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: false },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: 6000, locked: false, stopType: 'upper', stopVal: 6000 },
        { id: 'extra_credits', label: 'Additional Credits (₹)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'extra_validity', label: 'Additional Validity (months)', value: 0, locked: false, note: 'Gifted – no charge to client' },
        { id: 'call_rate', label: 'Campaign Rate (p/min)', value: 60, locked: false },
      ];

    // ── International Commercial (USD) ─────────────────────────────
    case 'voice_intl':
      return [
        // Plan Overview
        { id: 'prepaid_usd', label: 'Prepaid Amount (USD)', value: 400, locked: false, stopType: 'lower', stopVal: 200 },
        { id: 'attach_intl_pdf', label: 'Attach Intl. Rate Card PDF', value: 0, type: 'boolean' },
        { id: 'fee_type', label: 'Apply Fee to Quote', value: 0, type: 'fee_select' },
        // User Plan
        { id: 'num_users', label: 'No. of Users (Agents)', value: 1, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'user_charge_usd', label: 'User Charge (USD/agent/month)', value: 15, locked: true, stopType: 'lower', stopVal: 10 },
        // Number Plan
        { id: 'num_numbers', label: 'No. of US/Intl Numbers', value: 1, locked: false, stopType: 'lower', stopVal: 1 },
        { id: 'number_charge_usd', label: 'Number Rental (USD/number/month)', value: 15, locked: true, stopType: 'lower', stopVal: 10 },
        // Call Charges
        { id: 'intl_country', label: 'Destination Country', value: 'United States', locked: false, type: 'country_select' },
        { id: 'rm_country', label: 'RM / Agent Location', value: 'India', locked: false, type: 'country_select' },
        { id: 'voip_incoming_usd', label: 'VoIP Incoming (USD/min)', value: 0, locked: true, nonEditable: true },
        { id: 'voip_outgoing_usd', label: 'VoIP Outgoing (USD/min)', value: 0.02, locked: false },
        { id: 'pstn_incoming_usd', label: 'PSTN Incoming (USD/min)', value: 0.08, locked: false },
        { id: 'pstn_outgoing_usd', label: 'PSTN Outgoing (USD/min)', value: 0.10, locked: false },
      ];

    default: return [];
  }
}


// ── Multi-SKU Helpers ──────────────────────────────────────
function _makeItem(id) {
  return { id, sku_key: null, tier: 'dabbler', values: {}, stopLockOverrides: [], customName: '' };
}

function initSkuItems() {
  const item = _makeItem('item_0');
  QG.skuItems = [item];
  QG.activeItemId = 'item_0';
  QG.lockedEntity = null;
  syncActiveAliases();
}

function getActiveItem() {
  return QG.skuItems.find(i => i.id === QG.activeItemId) || QG.skuItems[0];
}

function syncActiveAliases() {
  const item = getActiveItem();
  if (!item) return;
  QG.currentSku = item.sku_key;
  QG.currentTier = item.tier;
  QG.skuValues = item.values;
  QG.stopLockOverrides = item.stopLockOverrides;
}


// ── Helpers ────────────────────────────────────────────────
function fmtAmount(val) {
  if (typeof val !== 'number') return val;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

function fmtRate(val) {
  if (typeof val !== 'number') return val;
  if (val >= 100) return '₹' + (val / 100).toFixed(2) + ' / Min';
  return val + 'p / Min';
}

function fmtMsg(val) {
  if (typeof val !== 'number') return val;
  if (val >= 100) return '₹' + (val / 100).toFixed(2) + ' / Msg';
  return val + 'p / Msg';
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'string' && isNaN(Number(v))) return v;
  return '₹' + Number(v).toLocaleString('en-IN');
}
function fmtP(v, unit = 'p/min') { return v === null || v === undefined ? '-' : `${v} ${unit}`; }
function cleanLabel(lbl) { return (lbl || '').replace(/\s*\([^)]+\)/g, '').trim(); }
function sanitize(str) {
  return String(str || '').replace(/[&<>"']/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[t] || t));
}
function today() {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function updateIntlRates(item, card) {
  const country = item.values['intl_country'] || 'United States';
  const rmCountry = item.values['rm_country'] || 'India';

  // Destination leg rate — Priority: Fixed > All > Mobile
  const destRates = getIntlCountryRates(country);
  let destRate = 0;
  if (destRates.length > 0) {
    const fixed = destRates.find(r => r.type === 'Fixed');
    const all   = destRates.find(r => r.type === 'All');
    const mobile = destRates.find(r => r.type === 'Mobile');
    destRate = (fixed || all || mobile)?.rate ?? 0;
  }

  // RM / Agent leg rate — lookup from rate card (India = $0.08 hardcoded as default)
  let rmRate = 0.08; // India default
  if (rmCountry !== 'India') {
    const rmRates = getIntlCountryRates(rmCountry);
    if (rmRates.length > 0) {
      const fixed = rmRates.find(r => r.type === 'Fixed');
      const all   = rmRates.find(r => r.type === 'All');
      const mobile = rmRates.find(r => r.type === 'Mobile');
      rmRate = (fixed || all || mobile)?.rate ?? 0.08;
    }
  }

  // VoIP Outgoing = destination leg rate only
  // PSTN Incoming = RM/agent leg only (destination leg is free)
  // PSTN Outgoing = destination leg + RM/agent leg
  item.values['voip_outgoing_usd'] = destRate;
  item.values['pstn_incoming_usd'] = parseFloat(rmRate.toFixed(4));
  item.values['pstn_outgoing_usd'] = parseFloat((destRate + rmRate).toFixed(4));

  // Store the resolved rm rate for preview use
  item.values['_rm_rate'] = rmRate;

  // Update inputs in the card
  const voipOutEl = card.querySelector('#qf_voip_outgoing_usd_' + item.id);
  if (voipOutEl) voipOutEl.value = item.values['voip_outgoing_usd'];

  const pstnIncEl = card.querySelector('#qf_pstn_incoming_usd_' + item.id);
  if (pstnIncEl) pstnIncEl.value = item.values['pstn_incoming_usd'];

  const pstnOutEl = card.querySelector('#qf_pstn_outgoing_usd_' + item.id);
  if (pstnOutEl) pstnOutEl.value = item.values['pstn_outgoing_usd'];
}

// ── Confetti burst (same animation as Task Hub completion) ──────
function launchConfetti() {
  let c = document.getElementById('qg-confetti');
  if (c) c.remove();
  c = document.createElement('canvas');
  c.id = 'qg-confetti';
  c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  const cols = ['#0284c7','#38bdf8','#10b981','#f59e0b','#ef4444','#7c3aed','#ec4899','#84cc16'];
  const pts = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width,
    y: c.height + 10,
    vx: (Math.random() - 0.5) * 7,
    vy: -(Math.random() * 9 + 9),
    size: Math.random() * 7 + 3,
    color: cols[Math.floor(Math.random() * cols.length)],
    rot: Math.random() * 360,
    rs: (Math.random() - 0.5) * 0.1,
    opacity: 1,
  }));

  let alive = true;
  (function anim() {
    if (!alive) return;
    ctx.clearRect(0, 0, c.width, c.height);
    let any = false;
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.rs;
      if (p.vy > 0) p.opacity -= 0.018;
      if (p.opacity > 0 && p.y < c.height + 50) {
        any = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });
    if (any) requestAnimationFrame(anim);
    else { alive = false; c.remove(); }
  })();
}

// ── Tab switching with browser history support ─────────────────
function switchQuoteTab(target, pushHistory = true) {
  // Reset the form if returning to new-quote while in edit mode
  if (target === 'new-quote' && QG.currentQuoteId) {
    resetQuoteForm();
  }

  document.querySelectorAll('.quote-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.quote-tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.quote-tab[data-qtab="${target}"]`);
  if (btn) btn.classList.add('active');

  const content = document.getElementById('qtab-content-' + target);
  if (content) content.classList.add('active');

  if (target === 'my-quotes') loadMyQuotes();
  if (target === 'drafts') loadDrafts();
  if (target === 'all-quotes') loadAllQuotes();
  if (target === 'approvals') loadApprovals();
  if (target === 'sku-requests') loadRequestedSkus();

  if (pushHistory) {
    history.pushState({ qtab: target }, '', '#qtab=' + target);
  }
}

function setupQuoteTabs() {
  // Bind click handlers
  document.querySelectorAll('.quote-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchQuoteTab(btn.dataset.qtab, true);
    });
  });

  // Listen for browser Back/Forward navigation
  window.addEventListener('popstate', (e) => {
    let target = 'new-quote'; // Default fallback
    if (e.state && e.state.qtab) {
      target = e.state.qtab;
    } else if (window.location.hash.startsWith('#qtab=')) {
      target = window.location.hash.replace('#qtab=', '');
    }
    switchQuoteTab(target, false);
  });

  // Read initial hash or set default state without pushing a duplicate
  if (window.location.hash.startsWith('#qtab=')) {
    const initTab = window.location.hash.replace('#qtab=', '');
    setTimeout(() => switchQuoteTab(initTab, false), 100);
  } else {
    history.replaceState({ qtab: 'new-quote' }, '', '#qtab=new-quote');
  }
}

// ── Lock / Unlock field logic ──────────────────────────────
function setupLockButtons() {
  document.querySelectorAll('.q-lock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isLocked = input.disabled;
      if (isLocked) {
        input.disabled = false;
        input.focus();
        btn.classList.add('unlocked');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
      } else {
        input.disabled = true;
        btn.classList.remove('unlocked');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
      }
    });
  });
}

// ── Multi-SKU Item Manager Render ──────────────────────────
function renderSkuItemManager() {
  const manager = document.getElementById('sku-item-manager');
  const list = document.getElementById('sku-item-list');
  if (!list) return;

  if (QG.bundleCompareMode) renderBundleTabSwitcher();

  // Show panel whenever multi-SKU mode is on or multiple items exist
  if (manager) {
    const hasSku = QG.skuItems.some(i => i.sku_key);
    manager.style.display = (QG.multiSkuMode || QG.skuItems.length > 1 || hasSku) ? '' : 'none';
  }

  // Update entity lock badge UI based on QG.lockedEntity
  const lockBadge = document.getElementById('sku-entity-lock-badge');
  const lockName = document.getElementById('sku-entity-lock-name');
  const hint = document.getElementById('sku-selector-hint');

  if (QG.multiSkuMode && QG.lockedEntity) {
    if (lockBadge) {
      lockBadge.style.display = 'inline-block';
      lockBadge.style.background = QG.lockedEntity === 'Veeno' ? '#fce7f3' : '#e0f2fe';
      lockBadge.style.color = QG.lockedEntity === 'Veeno' ? '#9d174d' : '#0369a1';
    }
    if (lockName) lockName.textContent = QG.lockedEntity;
    if (hint) hint.textContent = QG.bundleCompareMode
      ? `Option ${QG.activeBundle} is using ${QG.lockedEntity} SKUs. Switch to the other option to pick a different entity.`
      : `You can only add ${QG.lockedEntity} SKUs to this quote.`;
  } else {
    if (lockBadge) lockBadge.style.display = 'none';
    if (hint) hint.textContent = 'Choose the product plan for this quote. The logo and entity will switch automatically.';
  }

  // Item rows — inline rename: pencil click swaps label into an input in-place
  if (!QG._renamingItemId) QG._renamingItemId = null;

  list.innerHTML = QG.skuItems.map((item, idx) => {
    const sku = SKUS.find(s => s.key === item.sku_key);
    const isActive = item.id === QG.activeItemId;
    const tierDisplayName = TIER_DISPLAY_NAMES[item.tier] || (item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : '');
    const skuLabel = sku ? sku.label : '';
    const hasTiers = !!(item.sku_key && SKUS.find(s => s.key === item.sku_key)?.hasTiers);
    // Always show custom name when set; otherwise fall back to tier name (for tiered SKUs only)
    const suffix = item.customName ? ' · ' + item.customName : (hasTiers && tierDisplayName ? ' · ' + tierDisplayName : '');
    const fullLabel = sku ? `${skuLabel}${suffix}` : 'Not configured';
    const entityColor = sku?.entity === 'Veeno' ? '#be185d' : '#0369a1';
    const entityBg = sku?.entity === 'Veeno' ? '#fce7f3' : '#e0f2fe';
    const showRemove = QG.skuItems.length > 1;
    const canRename = sku && CUSTOM_NAME_SKUS.includes(item.sku_key);
    const hasCustomName = !!(item.customName);
    const isRenaming = QG._renamingItemId === item.id;

    // Placeholder for the rename input = default tier name (not custom)
    const defaultName = TIER_DISPLAY_NAMES[item.tier] || (item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : skuLabel);

    // Label area: input when renaming, text when not
    const labelArea = isRenaming
      ? `<input id="rename-inline-${item.id}"
           type="text"
           value="${(item.customName || '').replace(/"/g,'&quot;')}"
           placeholder="${defaultName}"
           onclick="event.stopPropagation()"
           oninput="window.setItemCustomName('${item.id}', this.value)"
           onblur="window.commitItemRename('${item.id}')"
           onkeydown="if(event.key==='Enter'||event.key==='Escape'){event.preventDefault();window.commitItemRename('${item.id}')}"
           style="font-weight:600;font-size:0.88rem;color:${isActive ? '#0284c7' : '#1e293b'};border:none;border-bottom:2px solid #0284c7;background:transparent;outline:none;font-family:inherit;width:100%;padding:0;"
         >`
      : `<div style="font-weight:600;font-size:0.88rem;color:${isActive ? '#0284c7' : '#1e293b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sku ? sanitize(fullLabel) : '<span style="color:#94a3b8;font-style:italic;">Not configured</span>'}</div>`;

    return `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:0;">
        <div class="sku-item-row ${isActive ? 'active' : ''}" onclick="window.switchActiveItem('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isRenaming ? '#0284c7' : isActive ? '#0284c7' : '#e2e8f0'};background:${isActive ? '#f0f9ff' : '#fff'};transition:all 0.15s;flex:1;min-width:0;">
          <div style="width:8px;height:8px;border-radius:50%;background:${isActive ? '#0284c7' : '#cbd5e1'};flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            ${labelArea}
            ${sku ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:1px;">Item ${idx + 1} · ${sku.entity}${hasCustomName && !isRenaming ? ' · <span style="color:#0284c7;">renamed</span>' : ''}</div>` : `<div style="font-size:0.72rem;color:#94a3b8;">Item ${idx + 1} - select a SKU below</div>`}
          </div>
          ${sku ? `<span style="padding:2px 7px;border-radius:20px;font-size:0.68rem;font-weight:700;background:${entityBg};color:${entityColor};">${sku.entity}</span>` : ''}
        </div>
        ${canRename ? `<button onclick="event.stopPropagation();window.openItemRename('${item.id}')" title="${isRenaming ? 'Finish renaming' : 'Rename plan'}" style="width:24px;height:24px;flex-shrink:0;border:none;border-radius:50%;background:${hasCustomName || isRenaming ? '#e0f2fe' : '#f1f5f9'};color:${hasCustomName || isRenaming ? '#0284c7' : '#94a3b8'};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.15s;" onmouseover="this.style.background='#e0f2fe';this.style.color='#0284c7'" onmouseout="this.style.background='${hasCustomName || isRenaming ? '#e0f2fe' : '#f1f5f9'}';this.style.color='${hasCustomName || isRenaming ? '#0284c7' : '#94a3b8'}'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '<div style="width:24px;flex-shrink:0;"></div>'}
        ${showRemove ? `<button onclick="window.removeSkuItem('${item.id}')" style="width:24px;height:24px;flex-shrink:0;border:none;border-radius:50%;background:#fee2e2;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-size:15px;line-height:1;transition:background 0.15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" title="Remove item">×</button>` : '<div style="width:24px;flex-shrink:0;"></div>'}
      </div>`;
  }).join('');

  // Auto-focus the inline input if we're in rename mode
  if (QG._renamingItemId) {
    const inp = document.getElementById('rename-inline-' + QG._renamingItemId);
    if (inp) { inp.focus(); inp.select(); }
  }
}

// ── Item rename helpers ─────────────────────────────────────
window.openItemRename = function(itemId) {
  const item = QG.skuItems.find(i => i.id === itemId);
  if (!item) return;
  if (QG._renamingItemId === itemId) {
    // Toggle off — commit and close
    window.commitItemRename(itemId);
    return;
  }
  QG._renamingItemId = itemId;
  renderSkuItemManager();
};

window.commitItemRename = function(itemId) {
  // Save whatever is currently in the input
  const inp = document.getElementById('rename-inline-' + itemId);
  if (inp) {
    const item = QG.skuItems.find(i => i.id === itemId);
    if (item) item.customName = inp.value.trim();
  }
  QG._renamingItemId = null;
  renderSkuItemManager();
  updatePreview();
};

window.setItemCustomName = function(itemId, name) {
  const item = QG.skuItems.find(i => i.id === itemId);
  if (!item) return;
  item.customName = name;
  updatePreview();
};

window.clearItemCustomName = function(itemId) {
  const item = QG.skuItems.find(i => i.id === itemId);
  if (!item) return;
  item.customName = '';
  QG._renamingItemId = null;
  renderSkuItemManager();
  updatePreview();
};


window.addSkuItem = function () {
  if (QG.skuItems.length >= 4) {
    showAlert('Only a maximum of 3 items are allowed to be there at any given time. Please remove some first.', { type: 'warning', title: 'Limit Exceeded' });
    return;
  }
  const activeItem = getActiveItem();
  if (!activeItem.sku_key) {
    showAlert('Please select a SKU for the current item before adding another.', { type: 'warning', title: 'SKU Required' });
    return;
  }
  const newId = 'item_' + Date.now();
  const newItem = _makeItem(newId);
  newItem.tier = QG.currentTier; // inherit tier
  QG.skuItems.push(newItem);
  QG.activeItemId = newId;
  syncActiveAliases();
  renderSkuItemManager();
  renderSkuSelector();
  document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) cfgArea.innerHTML = '';
  document.getElementById('sku-selector-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (QG.skuItems.length >= 4) {
    showAlert('Only 3 items are allowed to be there at any given time. Please remove some to proceed.', { type: 'warning', title: 'Limit Exceeded' });
  }
};

window.removeSkuItem = function (itemId) {
  if (QG.skuItems.length <= 1) return;
  const idx = QG.skuItems.findIndex(i => i.id === itemId);
  if (idx === -1) return;

  const removedItem = QG.skuItems[idx];

  // In tier-compare mode: uncheck the tier checkbox FIRST so that
  // updateCompareTiers() doesn't add it back when it rebuilds from checkboxes.
  if (QG.compareMode && removedItem.tier) {
    const cb = document.getElementById('ct-' + removedItem.tier);
    if (cb) cb.checked = false;
  }

  QG.skuItems.splice(idx, 1);

  if (QG.activeItemId === itemId) {
    QG.activeItemId = QG.skuItems[0].id;
    syncActiveAliases();
  }

  const remaining = QG.skuItems.filter(i => i.sku_key);
  QG.lockedEntity = remaining.length > 0 ? SKUS.find(s => s.key === remaining[0].sku_key)?.entity || null : null;

  // In compare mode for tier-compare SKUs, let updateCompareTiers handle the full re-render.
  // Calling selectSku here would call updateCompareTiers internally which reads checkboxes
  // and would add the removed tier back — so we skip it entirely.
  const tierCompareSkus = ['voice_exotel_std', 'sip_veeno'];
  if (QG.compareMode && QG.currentSku && tierCompareSkus.includes(QG.currentSku)) {
    window.updateCompareTiers();
    updatePreview();
    return;
  }

  // Non-compare-mode path: standard re-render
  if (QG.activeItemId === itemId && QG.currentSku) {
    // don't call selectSku — just re-render directly
  }
  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea && QG.currentSku) {
    if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers && !QG.compareMode) {
      renderTierSelector();
    } else {
      renderSkuForm(QG.currentSku, QG.currentTier);
    }
  }
  updatePreview();
};

window.switchActiveItem = function (itemId) {
  if (QG.activeItemId === itemId) return;
  QG.activeItemId = itemId;
  syncActiveAliases();
  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (QG.currentSku) {
    const sku = SKUS.find(s => s.key === QG.currentSku);
    if (sku?.hasTiers) {
      renderTierSelector();
    } else {
      if (cfgArea) cfgArea.innerHTML = '';
      renderSkuForm(QG.currentSku, QG.currentTier);
    }
  } else {
    if (cfgArea) cfgArea.innerHTML = '';
  }
};

window.toggleMultiSkuMode = function (enabled) {
  QG.multiSkuMode = enabled;
  const manager = document.getElementById('sku-item-manager');

  if (!enabled) {
    const mainItem = getActiveItem() || QG.skuItems[0];
    QG.skuItems = [mainItem];
    QG.activeItemId = mainItem.id;
    QG.lockedEntity = null; // Unlock entity
    if (manager) manager.style.display = 'none';
    syncActiveAliases();
    renderSkuItemManager();
    renderSkuSelector();
    updatePreview();
  } else {
    const mainItem = QG.skuItems[0];
    if (mainItem && mainItem.sku_key) {
      const sku = SKUS.find(s => s.key === mainItem.sku_key);
      if (sku) QG.lockedEntity = sku.entity;
      if (manager) manager.style.display = '';
    }
    renderSkuItemManager();
    renderSkuSelector();
  }
};


window.toggleBundleCompareMode = function (enabled) {
  // Mutual exclusion: exit tier-compare mode before entering bundle compare
  if (enabled && QG.compareMode) {
    window.toggleCompareMode(false);
  }

  QG.bundleCompareMode = enabled;
  const multiSkuLabel = document.getElementById('toggle-multi-sku-mode')?.closest('label');
  const tabSwitcher = document.getElementById('bundle-tab-switcher');
  const manager = document.getElementById('sku-item-manager');

  if (enabled) {
    QG.savedSingleState = {
      skuItems: JSON.parse(JSON.stringify(QG.skuItems)),
      activeItemId: QG.activeItemId,
      lockedEntity: QG.lockedEntity,
      multiSkuMode: QG.multiSkuMode
    };
    if (multiSkuLabel) multiSkuLabel.style.display = 'none';
    QG.multiSkuMode = true;
    // Always start with fresh bundle items to avoid stale add-on state carrying over
    QG.bundleA = { skuItems: [_makeItem('item_a_0')], activeItemId: 'item_a_0', lockedEntity: null };
    QG.bundleB = { skuItems: [_makeItem('item_b_0')], activeItemId: 'item_b_0', lockedEntity: null };
    QG.activeBundle = QG.activeBundle || 'A';
    const activeData = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
    QG.skuItems = activeData.skuItems;
    QG.activeItemId = activeData.activeItemId;
    QG.lockedEntity = activeData.lockedEntity;
    if (tabSwitcher) tabSwitcher.style.display = 'block';
    if (manager) manager.style.display = '';
  } else {
    if (QG.savedSingleState) {
      QG.skuItems = QG.savedSingleState.skuItems;
      QG.activeItemId = QG.savedSingleState.activeItemId;
      QG.lockedEntity = QG.savedSingleState.lockedEntity;
      QG.multiSkuMode = QG.savedSingleState.multiSkuMode;
    }
    if (multiSkuLabel) {
      multiSkuLabel.style.display = '';
      const cb = document.getElementById('toggle-multi-sku-mode');
      if (cb) cb.checked = QG.multiSkuMode;
    }
    if (tabSwitcher) tabSwitcher.style.display = 'none';
    if (manager) manager.style.display = QG.multiSkuMode ? '' : 'none';
  }
  syncActiveAliases();
  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) {
    if (QG.currentSku) {
      const sku = SKUS.find(s => s.key === QG.currentSku);
      if (sku?.hasTiers && !QG.compareMode) { renderTierSelector(); }
      else { cfgArea.innerHTML = ''; renderSkuForm(QG.currentSku, QG.currentTier); }
    } else { cfgArea.innerHTML = ''; }
  }
  updatePreview();
};

window.switchBundle = function (bundleLabel) {
  if (QG.activeBundle === bundleLabel) return;
  const oldBundle = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
  oldBundle.skuItems = QG.skuItems;
  oldBundle.activeItemId = QG.activeItemId;
  oldBundle.lockedEntity = QG.lockedEntity;
  QG.activeBundle = bundleLabel;
  const newBundle = bundleLabel === 'A' ? QG.bundleA : QG.bundleB;
  QG.skuItems = newBundle.skuItems;
  QG.activeItemId = newBundle.activeItemId;
  QG.lockedEntity = newBundle.lockedEntity;
  syncActiveAliases();
  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) {
    if (QG.currentSku) {
      const sku = SKUS.find(s => s.key === QG.currentSku);
      if (sku?.hasTiers && !QG.compareMode) { renderTierSelector(); }
      else { cfgArea.innerHTML = ''; renderSkuForm(QG.currentSku, QG.currentTier); }
    } else { cfgArea.innerHTML = ''; }
  }
  // Do NOT call updatePreview() here synchronously — renderSkuForm's setTimeout(10ms)
  // fires toggleAddons first (which sets smsAddon/waAddon flags), then calls updatePreview.
  // Calling it here would render the preview before addon flags are updated for the new bundle.
  if (!QG.currentSku) updatePreview(); // only if no form will be rendered
};


function renderBundleTabSwitcher() {
  const tabSwitcher = document.getElementById('bundle-tab-switcher');
  if (!tabSwitcher) return;

  const skuItemsA = QG.bundleA?.skuItems || [];
  const skuItemsB = QG.bundleB?.skuItems || [];

  // Build a human-readable label for a bundle's tab
  const bundleTabLabel = (items, fallback) => {
    const configured = items.filter(i => i.sku_key);
    if (configured.length === 0) return fallback;
    if (configured.length === 1) {
      const item = configured[0];
      const sku = SKUS.find(s => s.key === item.sku_key);
      const skuName = item.customName || sku?.label || item.sku_key;
      const tier = item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : '';
      return tier ? `${skuName} · ${tier}` : skuName;
    }
    return `${fallback} (${configured.length} SKUs)`;
  };

  const labelA = bundleTabLabel(skuItemsA, 'Option A');
  const labelB = bundleTabLabel(skuItemsB, 'Option B');

  tabSwitcher.innerHTML = `
    <div class="bundle-tab-bar">
      <button class="bundle-tab ${QG.activeBundle === 'A' ? 'active' : ''}" onclick="window.switchBundle('A')" title="${sanitize(labelA)}" style="display:flex;align-items:center;justify-content:center;padding:8px 16px;">
        <span style="font-size:0.9rem;font-weight:600;line-height:1.3;">${sanitize(labelA)}</span>
      </button>
      <button class="bundle-tab ${QG.activeBundle === 'B' ? 'active' : ''}" onclick="window.switchBundle('B')" title="${sanitize(labelB)}" style="display:flex;align-items:center;justify-content:center;padding:8px 16px;">
        <span style="font-size:0.9rem;font-weight:600;line-height:1.3;">${sanitize(labelB)}</span>
      </button>
    </div>
  `;
}


function renderSkuSelector() {
  const grid = document.getElementById('sku-selector-grid');
  if (!grid) return;

  // In bundle compare mode each bundle is independent — show all SKUs, no cross-entity lock
  // Always include the bundle_compare card regardless of entity lock
  let filtered;
  if (QG.multiSkuMode && QG.lockedEntity && !QG.bundleCompareMode) {
    filtered = SKUS.filter(s => s.isBundleCompare || s.entity === QG.lockedEntity || s.entity === 'Both');
  } else {
    filtered = SKUS.filter(s => !s.hidden);
  }

  const compareCapable = ['voice_exotel_std', 'voice_exotel_user', 'voice_veeno_std', 'voice_veeno_user', 'sip_veeno'];
  const CMP_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 4 7 4"/><polyline points="7 20 17 20"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><polyline points="11 8 7 12 11 16"/><polyline points="13 8 17 12 13 16"/></svg>`;

  grid.innerHTML = filtered.map(s => {
    if (s.isBundleCompare) {
      // Special toggle card — not a regular SKU
      const isActive = QG.bundleCompareMode;
      return `
      <div class="sku-option sku-bundle${isActive ? ' selected' : ''}" data-sku="bundle_compare"
           onclick="window.toggleBundleCompareMode(!QG.bundleCompareMode); renderSkuSelector();"
           title="${isActive ? 'Disable Bundle Compare mode' : 'Enable Bundle Compare: configure two packages side-by-side'}">
        <div class="sku-option-icon">${s.icon}</div>
        <div>
          <div class="sku-option-label">${sanitize(s.label)}</div>
          <div class="sku-option-sub">${isActive ? 'Active — A vs B' : sanitize(s.sub)}</div>
          <span class="sku-entity-tag bundle">${isActive ? '✓ ON' : 'A vs B'}</span>
        </div>
      </div>`;
    }

    const canCmp = compareCapable.includes(s.key);
    const isCmpActive = QG.compareMode && QG.currentSku === s.key;
    const cmpBtn = canCmp
      ? `<button class="sku-compare-btn${isCmpActive ? ' active' : ''}" title="Compare mode" onclick="event.stopPropagation(); window.enableCompareFor('${s.key}')">${CMP_ICON}</button>`
      : '';
    const theme = s.theme || s.entity.toLowerCase();
    return `
    <div class="sku-option sku-${theme}${QG.currentSku === s.key ? ' selected' : ''}" data-sku="${s.key}" onclick="selectSku('${s.key}')">
      ${cmpBtn}
      <div class="sku-option-icon">${s.icon}</div>
      <div>
        <div class="sku-option-label">${sanitize(s.label)}</div>
        <div class="sku-option-sub">${sanitize(s.sub)}</div>
        <span class="sku-entity-tag ${theme}">${s.entity}</span>
      </div>
    </div>`;
  }).join('');
}

// Enable compare mode for a specific SKU (called from the per-card icon button)
window.enableCompareFor = function(key) {
  // Mutual exclusion: exit bundle compare mode before entering same-SKU tier compare
  if (QG.bundleCompareMode) {
    window.toggleBundleCompareMode(false);
  }

  // Toggle off if already comparing this SKU
  if (QG.compareMode && QG.currentSku === key) {
    window.toggleCompareMode(false);
    renderSkuSelector();
    return;
  }
  const sku = SKUS.find(s => s.key === key);
  if (!sku) return;
  // Switch to this SKU
  QG.currentSku = key;
  const item = QG.skuItems[0] || _makeItem('item_0');
  if (item.sku_key !== key) {
    item.sku_key = key;
    item.values = {};
    item.stopLockOverrides = [];
    QG._dirty = true;
    if (QG.skuItems.length === 0) QG.skuItems = [item];
    else QG.skuItems[0] = item;
  }
  QG.activeItemId = item.id;
  syncActiveAliases();
  document.querySelectorAll('.sku-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.sku === key);
  });
  updateEntityBadge(sku.entity);
  window.toggleCompareMode(true);
  renderSkuSelector(); // refresh icon state
};
function selectSku(key) {
  const sku = SKUS.find(s => s.key === key);
  if (!sku) return;

  // Entity lock enforcement — only applies within a bundle (not across bundles in compare mode)
  if (QG.multiSkuMode && QG.lockedEntity && sku.entity !== QG.lockedEntity && sku.entity !== 'Both' && !QG.bundleCompareMode) {
    showAlert(`This quote is locked to ${QG.lockedEntity} plans. Remove all items to start a new quote with a different entity.`, { type: 'warning', title: 'Entity Lock' });
    return;
  }

  // Currency check: prevent mixing International (USD) with standard plans (INR)
  if (QG.multiSkuMode && !QG.bundleCompareMode && QG.skuItems.length > 1) {
    const hasIntl = QG.skuItems.some(i => i.sku_key === 'voice_intl' && i.id !== QG.activeItemId);
    const isSelectingIntl = key === 'voice_intl';
    if ((hasIntl && !isSelectingIntl) || (!hasIntl && isSelectingIntl)) {
      showAlert("International USD plans cannot be mixed with standard INR plans in a single quote.", { type: 'warning', title: 'Currency Mismatch' });
      return;
    }
  }

  // Update active item
  const item = getActiveItem();
  item.sku_key = key;
  item.values = {};
  item.stopLockOverrides = [];
  QG._dirty = true;

  // Set entity lock on first selection
  if (QG.multiSkuMode && !QG.lockedEntity) {
    QG.lockedEntity = sku.entity;
    renderSkuSelector(); // re-render with entity filter
  }

  syncActiveAliases();

  // Show item manager once first SKU chosen
  const manager = document.getElementById('sku-item-manager');
  if (manager && QG.multiSkuMode) manager.style.display = '';

  document.querySelectorAll('.sku-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.sku === key);
  });

  updateEntityBadge(sku.entity);

  const ctSelector = document.getElementById('compare-tier-selector');
  const tierCompareSkus = ['voice_exotel_std', 'sip_veeno'];
  if (QG.compareMode) {
    if (key === QG.currentSku && tierCompareSkus.includes(key)) {
      if (ctSelector) ctSelector.style.display = 'none';
      ['dabbler','believer','influencer'].forEach(t => {
        const cb = document.getElementById('ct-' + t);
        if (cb) cb.checked = true;
      });
      window.updateCompareTiers();
      return;
    } else {
      // Different SKU selected — always kill compare mode and clear extra items
      if (ctSelector) ctSelector.style.display = 'none';
      QG.compareMode = false;
      const mainItem = QG.skuItems[0] || _makeItem('item_0');
      QG.skuItems = [mainItem];
      QG.activeItemId = mainItem.id;
      renderSkuSelector(); // refresh compare icon states
    }
  }

  renderSkuItemManager();

  if (sku.hasTiers) {
    renderTierSelector();
  } else {
    const area = document.getElementById('sku-config-area');
    if (area) area.innerHTML = '';
    renderSkuForm(key, QG.currentTier);
  }
}
function updateEntityBadge(entity) {
  const badge = document.getElementById('q-entity-badge');
  if (!badge) return;
  if (entity === 'Veeno') {
    badge.style.background = '#fce7f3'; badge.style.color = '#be185d'; badge.textContent = 'Veeno';
  } else {
    badge.style.background = '#e0f2fe'; badge.style.color = '#0369a1'; badge.textContent = 'Exotel';
  }
  updatePreview();
}

// ── Tier selector ──────────────────────────────────────────
const STARTUP_SUB_LABELS = {
  voice:     { label: 'Voice STD',     sub: 'Minute Based' },
  sip:       { label: 'SIP Lines',     sub: 'WebRTC / Browser' },
  stream:    { label: 'Web Streaming', sub: 'WebSocket / Bot' },
  tfn:       { label: 'Toll-Free',     sub: 'TFN' },
  sms:       { label: 'SMS',           sub: 'Messaging' },
  whatsapp:  { label: 'WhatsApp',      sub: 'Messaging' },
  rcs:       { label: 'RCS',           sub: 'Messaging' },
  campaigns: { label: 'Campaigns',     sub: 'Single-leg' },
};

function renderTierSelector() {
  const area = document.getElementById('sku-config-area');
  const isStartupSku = QG.currentSku === 'startup';

  if (isStartupSku) {
    const validSubs = Object.keys(STARTUP_SUB_LABELS);
    if (!validSubs.includes(QG.currentTier)) {
      QG.currentTier = 'voice';
      const item = getActiveItem();
      if (item) item.tier = 'voice';
    }
    area.innerHTML = `
      <div class="q-card sku-tier-card" style="padding:16px 20px;">
        <div class="q-card-header" style="margin-bottom:12px;">
          <div class="q-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Select Product for Startup Plan
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
          ${Object.entries(STARTUP_SUB_LABELS).map(([key, info]) => `
            <button onclick="selectTier('${key}')"
              style="display:flex; align-items:center; justify-content:center;
                     padding:10px 6px; border-radius:8px; cursor:pointer; font-family:inherit;
                     border: 2px solid ${QG.currentTier === key ? '#0284c7' : '#e2e8f0'};
                     background: ${QG.currentTier === key ? '#f0f9ff' : '#f8fafc'};
                     box-shadow: ${QG.currentTier === key ? '0 0 0 3px #bae6fd' : 'none'};
                     font-size:0.85rem; font-weight:600;
                     color:${QG.currentTier === key ? '#0284c7' : '#475569'};
                     transition:all 0.15s ease; white-space:nowrap;">${info.label}
            </button>`
          ).join('')}
        </div>
        <div id="startup-budget-bar-wrap" style="margin-top:12px; padding-top:10px; border-top:1px solid #e0f2fe;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.78rem; font-weight:600; color:#475569;">Credit Budget</span>
            <span id="startup-budget-label" style="font-size:0.78rem; font-weight:700; color:#0284c7;">&#8377;0 / &#8377;6,000</span>
          </div>
          <div style="height:6px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
            <div id="startup-budget-fill" style="height:100%; width:0%; background:#0284c7; border-radius:4px; transition:width 0.3s ease, background 0.3s ease;"></div>
          </div>
          <p id="startup-budget-warning" style="display:none; margin:6px 0 0; font-size:0.75rem; color:#dc2626; font-weight:600;">&#9888; Credit limit exceeded. Max allowed is &#8377;6,000.</p>
        </div>
      </div>
    `;
  } else {
    const item = getActiveItem();
    const supportsElite = QG.currentSku === 'voice_exotel_std';
    const stdTiers = [
      { key: 'dabbler',    label: 'Dabbler',    sub: '5 months'  },
      { key: 'believer',   label: 'Believer',   sub: '11 months' },
      { key: 'influencer', label: 'Influencer', sub: '11 months' },
    ];
    if (supportsElite) stdTiers.push({ key: 'elite', label: 'Unnamed', sub: '11 months' });

    const isTierActive = (key) => {
      if (QG.compareMode) {
        return QG.skuItems.some(i => i.tier === key);
      }
      return QG.currentTier === key;
    };

    area.innerHTML = `
    <div class="q-card sku-tier-card">
      <div class="q-card-header" style="flex-wrap:wrap;gap:8px;">
        <div class="q-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          Select Plan Tier
        </div>
      </div>
      <div class="tier-selector">
        ${stdTiers.map(t => {
          const active = isTierActive(t.key);
          const greyed = t.key === 'elite' && !active;
          return `<button class="tier-btn ${active ? 'active' : ''} ${greyed ? 'greyed-out' : ''}" data-tier="${t.key}" onclick="selectTier('${t.key}')">${t.label}<br><small style="font-weight:400;font-size:0.72rem;">${t.sub}</small></button>`;
        }).join('')}
      </div>
    </div>
  `;
  }
  renderSkuForm(QG.currentSku, QG.currentTier);
}

function selectTier(tier) {
  if (QG.compareMode) {
    // In compare mode, clicking a tier toggles its selection in the comparison
    const existingIdx = QG.skuItems.findIndex(i => i.tier === tier);
    if (existingIdx !== -1) {
      // Toggle off (remove)
      // BUT we must keep at least 1 item in the comparison
      if (QG.skuItems.length <= 1) {
        showAlert('At least one plan must be selected in comparison.', { type: 'warning', title: 'Action Denied' });
        return;
      }
      QG.skuItems.splice(existingIdx, 1);
      // Revert checkbox state just in case (though it is hidden)
      const cb = document.getElementById('ct-' + tier);
      if (cb) cb.checked = false;
    } else {
      // Toggle on (add)
      // BUT we only allow up to 3 items
      if (QG.skuItems.length >= 3) {
        showAlert('Only a maximum of 3 plans can be selected at any given time. Please remove some to proceed.', { type: 'warning', title: 'Limit Exceeded' });
        return;
      }
      QG.skuItems.push({
        id: 'item_' + Date.now() + '_' + QG.skuItems.length,
        sku_key: QG.currentSku,
        tier: tier,
        values: {},
        stopLockOverrides: []
      });
      const cb = document.getElementById('ct-' + tier);
      if (cb) cb.checked = true;
    }

    // Update active item if the previous active one was removed
    if (!QG.skuItems.some(i => i.id === QG.activeItemId)) {
      QG.activeItemId = QG.skuItems[0].id;
    }
    syncActiveAliases();

    // Re-render
    renderTierSelector();
    renderSkuForm(QG.currentSku, QG.currentTier);
    renderSkuItemManager();
    updatePreview();
    return;
  }

  // Normal mode path:
  const item = getActiveItem();
  item.tier = tier;
  item.values = {};
  QG.currentTier = tier;
  QG.skuValues = item.values;
  if (QG.currentSku === 'startup') {
    // Re-render the whole product selector so the active button updates
    renderTierSelector();
  } else {
    document.querySelectorAll('.tier-btn').forEach(b => {
      const isCurrent = b.getAttribute('data-tier') === tier;
      b.classList.toggle('active', isCurrent);
      if (b.getAttribute('data-tier') === 'elite') {
        b.classList.toggle('greyed-out', !isCurrent);
      }
    });
    renderSkuForm(QG.currentSku, tier);
    renderSkuItemManager();
  }
}

// Toggle the Elite 4th plan for Voice STD (Exotel)
window.toggleEliteTier = function(enabled) {
  const item = getActiveItem();
  if (!item) return;
  item.eliteEnabled = enabled;
  // If disabling, switch away from elite tier
  if (!enabled && item.tier === 'elite') {
    item.tier = 'influencer';
    item.values = {};
    QG.currentTier = 'influencer';
    QG.skuValues = item.values;
  }
  renderTierSelector();
  renderSkuItemManager();
  updatePreview();
};

// Set/clear custom plan name for the active item
window.setCustomPlanName = function(name) {
  const item = getActiveItem();
  if (!item) return;
  item.customName = name.trim();
  renderSkuItemManager();
  updatePreview();
};

window.clearCustomPlanName = function() {
  const item = getActiveItem();
  if (!item) return;
  item.customName = '';
  renderTierSelector();
  renderSkuItemManager();
  updatePreview();
};

// ── SKU Form Render ────────────────────────────────────────

window.toggleCompareMode = function (enabled) {
  QG.compareMode = enabled;
  const manager = document.getElementById('sku-item-manager');
  const ctSelector = document.getElementById('compare-tier-selector');
  // SKUs that support tier-based comparison
  const tierCompareSkus = ['voice_exotel_std', 'sip_veeno'];
  const userCompareSkus = ['voice_exotel_user', 'voice_veeno_user', 'voice_veeno_std'];

  if (enabled) {
    if (tierCompareSkus.includes(QG.currentSku)) {
      if (ctSelector) ctSelector.style.display = 'none';
      // Reset all tier checkboxes to checked so all 3 tiers appear on fresh entry
      ['dabbler','believer','influencer'].forEach(t => {
        const cb = document.getElementById('ct-' + t);
        if (cb) cb.checked = true;
      });
      // Elite checkbox: don't auto-check unless already opted in
      const eliteCb = document.getElementById('ct-elite');
      if (eliteCb) eliteCb.checked = false;
      window.updateCompareTiers();
      return; // updateCompareTiers handles the rest
    } else if (userCompareSkus.includes(QG.currentSku)) {
      // User-based compare: create 2 config columns
      if (ctSelector) ctSelector.style.display = 'none';
      window.updateUserCompare();
      return;
    }
  } else {
    if (ctSelector) ctSelector.style.display = 'none';
    // Revert to 1 item if they disable it
    const mainItem = QG.skuItems[0] || _makeItem('item_0');
    QG.skuItems = [mainItem];
    QG.activeItemId = mainItem.id;
    if (!document.getElementById('toggle-multi-sku-mode')?.checked) {
      QG.lockedEntity = null;
    }
    syncActiveAliases();
  }

  // Need to force re-render
  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (QG.currentSku) {
    if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) {
      renderTierSelector();
    } else {
      if (cfgArea) cfgArea.innerHTML = '';
      renderSkuForm(QG.currentSku, QG.currentTier);
    }
  }
  updatePreview();
};

// User-based plan comparison (different configs side by side)
window.updateUserCompare = function () {
  if (!QG.compareMode) return;
  const existingA = QG.skuItems[0] || _makeItem('item_0');
  const existingB = QG.skuItems[1];

  existingA.sku_key = QG.currentSku;
  if (!existingA.values.num_users) existingA.values.num_users = 10;
  if (!existingA.values.num_months) existingA.values.num_months = 6;
  if (!existingA.values.user_charge) existingA.values.user_charge = 2000;

  const newB = existingB || {
    id: 'item_' + Date.now(),
    sku_key: QG.currentSku,
    tier: QG.currentTier,
    values: { num_users: 10, num_months: 3, user_charge: 2500 },
    stopLockOverrides: []
  };
  if (!newB.sku_key) { newB.sku_key = QG.currentSku; newB.tier = QG.currentTier; }

  QG.skuItems = [existingA, newB];
  QG.activeItemId = existingA.id;
  QG.lockedEntity = SKUS.find(s => s.key === QG.currentSku)?.entity;
  syncActiveAliases();

  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) cfgArea.innerHTML = '';
  renderSkuForm(QG.currentSku, QG.currentTier);
  updatePreview();
};


window.updateCompareTiers = function (el) {
  if (!QG.compareMode) return;
  const selectedTiers = [];
  if (document.getElementById('ct-dabbler')?.checked) selectedTiers.push('dabbler');
  if (document.getElementById('ct-believer')?.checked) selectedTiers.push('believer');
  if (document.getElementById('ct-influencer')?.checked) selectedTiers.push('influencer');
  if (document.getElementById('ct-elite')?.checked) selectedTiers.push('elite');

  if (selectedTiers.length > 3) {
    showAlert('Only a maximum of 3 plans can be selected at any given time. Please remove some to proceed.', { type: 'warning', title: 'Limit Exceeded' });
    if (el) el.checked = false;
    return;
  }

  if (selectedTiers.length === 0) {
    selectedTiers.push('dabbler');
    if (document.getElementById('ct-dabbler')) document.getElementById('ct-dabbler').checked = true;
  }

  QG.skuItems = selectedTiers.map((tier, idx) => {
    const existing = QG.skuItems.find(i => i.tier === tier && i.sku_key === QG.currentSku);
    if (existing) return existing;
    return {
      id: 'item_' + Date.now() + '_' + idx,
      sku_key: QG.currentSku,
      tier: tier,
      values: {},
      stopLockOverrides: []
    };
  });

  if (!QG.skuItems.some(i => i.id === QG.activeItemId)) {
    QG.activeItemId = QG.skuItems[0].id;
  }

  QG.lockedEntity = SKUS.find(s => s.key === QG.currentSku)?.entity;
  syncActiveAliases();

  renderSkuItemManager();
  renderSkuSelector();
  const cfgArea = document.getElementById('sku-config-area');
  if (QG.currentSku) {
    if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) {
      renderTierSelector();
    } else {
      if (cfgArea) cfgArea.innerHTML = '';
      renderSkuForm(QG.currentSku, QG.currentTier);
    }
  }
  updatePreview();
};


function renderSkuForm(skuKey, tier) {
  const container = document.getElementById('sku-config-area');
  // Preserve the tier selector card so it stays visible while the form re-renders
  const existingTierCard = container.querySelector('.sku-tier-card');
  container.innerHTML = '';
  if (existingTierCard) container.appendChild(existingTierCard);

  const itemsToRender = (QG.compareMode && QG.skuItems.length > 1) ? QG.skuItems : [getActiveItem() || QG.skuItems[0]];

  const grid = document.createElement('div');
  if (QG.compareMode) {
    grid.className = 'compare-mode-grid';
  } else {
    grid.style.width = '100%';
  }

  itemsToRender.forEach(item => {
    // Make sure we have a valid sku for the item
    const k = item.sku_key || skuKey || QG.currentSku;
    const t = item.tier || tier || QG.currentTier;
    if (!k) return;

    const fields = getSkuFields(k, t);
    const sku = SKUS.find(s => s.key === k);

    // Set default values without add-ons
    fields.forEach(f => {
      if (f.note?.includes('Add-on')) {
        // Default addon values to undefined so checkboxes remain unchecked
        if (item.values[f.id] === undefined) {
          // do not set
        }
      } else {
        if (item.values[f.id] === undefined && f.value !== undefined) {
          item.values[f.id] = f.value;
        }
      }
    });

    // Make sure current active aliases match if it's the active item
    if (item.id === QG.activeItemId) syncActiveAliases();

    const card = document.createElement('div');
    card.className = QG.compareMode ? 'compare-card' : 'q-card';
    if (QG.compareMode && sku?.hasTiers && QG.skuItems.length === 3) card.classList.add('tier-card');
    card.id = 'sku-fields-card-' + item.id;

    card.innerHTML = `
      <div class="q-card-header">
        <div class="q-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          ${sku?.label || 'Not Selected'}
          ${item.customName
            ? `<span class="sku-entity-tag" style="margin-left:6px;background:#e0f2fe;color:#0369a1;">${sanitize(item.customName)}</span>`
            : (t && sku?.hasTiers ? `<span class="sku-entity-tag ${sku.entity.toLowerCase()}" style="margin-left:6px;">${TIER_DISPLAY_NAMES[t] || (t.charAt(0).toUpperCase() + t.slice(1))}</span>` : '')}
        </div>
      </div>
      
      ${fields.some(f => f.note?.includes('Add-on') && f.note !== 'VN Add-on') ? `
      <div style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px; font-size: 0.85rem; margin-bottom: 12px; border-radius: 6px; flex-wrap:wrap; align-items:center;">
        <strong>Add-ons:</strong>
        ${fields.some(f => f.note === 'SMS Add-on') ? `<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="toggle-sms-addon_${item.id}" ${item.values['sms_cost'] ? 'checked' : ''} onchange="window.toggleAddons('${item.id}', '${k}', '${t}')"> SMS</label>` : ''}
        ${fields.some(f => f.note === 'WA Add-on') ? `<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="toggle-wa-addon_${item.id}" ${item.values['wa_api'] ? 'checked' : ''} onchange="window.toggleAddons('${item.id}', '${k}', '${t}')"> WhatsApp</label>` : ''}
        ${fields.some(f => f.note === 'CT Add-on') ? `<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="toggle-ct-addon_${item.id}" ${item.values['call_transfer'] !== undefined ? 'checked' : ''} onchange="window.toggleAddons('${item.id}', '${k}', '${t}')"> Call Transfer <span style="font-size:0.78rem;color:#64748b;">(₹499/mo)</span></label>` : ''}
      </div>` : ''}

      <div class="q-card-fields-container">
        ${renderFieldsGrouped(fields, item)}
      </div>
    `;
    grid.appendChild(card);

    // Bind input changes
    setTimeout(() => {
      fields.forEach(f => {
        if (f.nonEditable) return;

        if (f.type === 'pulse') {
          const toggleGroup = card.querySelector(`#qf_pulse_${item.id}`);
          toggleGroup?.querySelectorAll('.q-toggle-opt').forEach(btn => {
            btn.addEventListener('click', () => {
              const val = parseInt(btn.dataset.val, 10);
              const oldPulse = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 60);
              if (val === oldPulse) return;

              item.values[f.id] = val;
              toggleGroup.querySelectorAll('.q-toggle-opt').forEach(b =>
                b.classList.toggle('active', parseInt(b.dataset.val, 10) === val)
              );

              // Scale calling rate fields: single_leg, incoming, outgoing, call_rate
              const scale = val / oldPulse;
              const rateFields = ['single_leg', 'incoming', 'outgoing', 'call_rate'];
              rateFields.forEach(fieldId => {
                const inputEl = card.querySelector('#qf_' + fieldId + '_' + item.id);
                if (inputEl) {
                  const currentVal = parseFloat(inputEl.value);
                  if (!isNaN(currentVal)) {
                    const newVal = Math.round(currentVal * scale * 100) / 100;
                    inputEl.value = newVal;
                    item.values[fieldId] = newVal;
                    
                    // Run breach checks on updated inputs
                    const fieldDef = fields.find(x => x.id === fieldId);
                    if (fieldDef && fieldDef.stopType && !item.stopLockOverrides.includes(fieldId)) {
                      const breach = isBreaching(fieldDef, newVal, item);
                      if (breach) inputEl.classList.add('stop-lock-violation');
                      else inputEl.classList.remove('stop-lock-violation');
                    }
                  }
                } else if (item.values[fieldId] !== undefined) {
                  const currentVal = parseFloat(item.values[fieldId]);
                  if (!isNaN(currentVal)) {
                    item.values[fieldId] = Math.round(currentVal * scale * 100) / 100;
                  }
                }
              });

              if (item.sku_key === 'voice_exotel_voicebot') {
                const vol = parseFloat(item.values['volume'] ?? fields.find(x => x.id === 'volume')?.value ?? 1000);
                const rate = parseFloat(item.values['outgoing'] ?? fields.find(x => x.id === 'outgoing')?.value ?? 500);
                const mos = parseFloat(item.values['num_months'] ?? fields.find(x => x.id === 'num_months')?.value ?? 6);
                const calculatedCredits = Math.max(50000, Math.round(vol * ((rate * (60 / val)) / 100) * mos));
                item.values['credits'] = calculatedCredits;
                const creditsInp = card.querySelector('#qf_credits_' + item.id);
                if (creditsInp) {
                  creditsInp.value = calculatedCredits;
                }
              }

              updatePreview();
            });
          });
          return;
        }

        if (f.type === 'boolean' || f.type === 'model_toggle' || f.type === 'fee_select') {
          const toggleGroup = card.querySelector(`#qf_toggle_${f.id}_${item.id}`);
          toggleGroup?.querySelectorAll('.q-toggle-opt').forEach(btn => {
            btn.addEventListener('click', () => {
              const val = parseInt(btn.dataset.val, 10);
              item.values[f.id] = val;
              toggleGroup.querySelectorAll('.q-toggle-opt').forEach(b =>
                b.classList.toggle('active', parseInt(b.dataset.val, 10) === val)
              );
              // Re-run addon visibility whenever any boolean/model field changes (e.g. add_vn, user_model_exotel)
              window.toggleAddons(item.id, k, t);
              updatePreview();
            });
          });
          return;
        }

        if (f.type === 'rental_toggle') {
          // Wire up the number input for the rental amount
          const rtInput = card.querySelector(`#qf_${f.id}_${item.id}`);
          if (rtInput) {
            rtInput.addEventListener('input', () => {
              const numVal = parseFloat(rtInput.value);
              item.values[f.id] = isNaN(numVal) ? rtInput.value : numVal;
              updatePreview();
            });
          }
          // Wire up the inline Monthly/One-Time toggle
          const rtToggleGroup = card.querySelector(`#qf_toggle_rental_onetime_${item.id}`);
          rtToggleGroup?.querySelectorAll('.q-toggle-opt').forEach(btn => {
            btn.addEventListener('click', () => {
              const val = parseInt(btn.dataset.val, 10);
              item.values['rental_onetime'] = val;
              rtToggleGroup.querySelectorAll('.q-toggle-opt').forEach(b =>
                b.classList.toggle('active', parseInt(b.dataset.val, 10) === val)
              );
              updatePreview();
            });
          });
          return;
        }

        // Country selector and call type selector for International SKU
        if (f.type === 'country_select') {
          const selectEl = card.querySelector(`#qf_${f.id}_${item.id}`);
          if (selectEl) {
            selectEl.addEventListener('change', () => {
              item.values[f.id] = selectEl.value;
              // Recalculate rates for new country
              updateIntlRates(item, card);
              updatePreview();
            });
          }
          return;
        }

        const input = card.querySelector('#qf_' + f.id + '_' + item.id);
        if (!input) return;
        input.addEventListener('input', async () => {
          const val = input.value;
          const numVal = parseFloat(val);

          if (f.id === 'single_leg' && !isNaN(numVal)) {
            const isVeeno = item.sku_key === 'voice_veeno_std';
            const incField = card.querySelector('#qf_incoming_' + item.id);
            const outField = card.querySelector('#qf_outgoing_' + item.id);

            if (incField && !isVeeno) {
              incField.value = numVal;
              item.values['incoming'] = numVal;
              const fInc = fields.find(x => x.id === 'incoming');
              if (fInc && isBreaching(fInc, numVal, item)) incField.classList.add('stop-lock-violation');
              else incField.classList.remove('stop-lock-violation');
            }
            if (outField) {
              const outVal = isVeeno ? numVal : numVal * 2;
              outField.value = outVal;
              item.values['outgoing'] = outVal;
              const fOut = fields.find(x => x.id === 'outgoing');
              if (fOut && isBreaching(fOut, outVal, item)) outField.classList.add('stop-lock-violation');
              else outField.classList.remove('stop-lock-violation');
            }
          }

          if (f.stopType && !isNaN(numVal) && !item.stopLockOverrides.includes(f.id)) {
            const breach = isBreaching(f, numVal, item);
            if (breach) { input.classList.add('stop-lock-violation'); }
            else { input.classList.remove('stop-lock-violation'); }
          }
          item.values[f.id] = isNaN(numVal) ? val : numVal;

          if (item.sku_key === 'voice_exotel_voicebot' && (f.id === 'volume' || f.id === 'outgoing' || f.id === 'num_months')) {
            const vol = parseFloat(item.values['volume'] ?? fields.find(x => x.id === 'volume')?.value ?? 1000);
            const rate = parseFloat(item.values['outgoing'] ?? fields.find(x => x.id === 'outgoing')?.value ?? 500);
            const mos = parseFloat(item.values['num_months'] ?? fields.find(x => x.id === 'num_months')?.value ?? 6);
            const itemPulse = parseFloat(item.values['pulse'] ?? fields.find(x => x.id === 'pulse')?.value ?? 60);
            const calculatedCredits = Math.max(50000, Math.round(vol * ((rate * (60 / itemPulse)) / 100) * mos));
            item.values['credits'] = calculatedCredits;
            const creditsInp = card.querySelector('#qf_credits_' + item.id);
            if (creditsInp) {
              creditsInp.value = calculatedCredits;
            }
          }

          if (QG.activeItemId === item.id) syncActiveAliases();
          updatePreview();
        });
      });
    }, 0);

    // Block scroll-to-change only when the input is actively focused.
    // Without this guard, wheel events over unfocused inputs were swallowed,
    // preventing the parent panel from scrolling.
    setTimeout(() => {
      card.querySelectorAll('.q-input').forEach(inp => {
        inp.addEventListener('wheel', (e) => {
          if (inp.hasAttribute('data-focused')) {
            e.preventDefault(); // only steal scroll when user is editing the field
          }
          // otherwise: let the event bubble up to the scrollable panel
        }, { passive: false });
        inp.addEventListener('focus', () => { inp.setAttribute('data-focused', '1'); });
        inp.addEventListener('blur',  () => { inp.removeAttribute('data-focused'); });
      });
    }, 20);
  });

  container.appendChild(grid);

  setTimeout(() => {
    setupLockButtons();
    itemsToRender.forEach(item => window.toggleAddons(item.id, item.sku_key || skuKey, item.tier || tier));
    // Initialize International rates if voice_intl
    itemsToRender.forEach(item => {
      if (item.sku_key === 'voice_intl') {
        const card = document.getElementById('sku-fields-card-' + item.id);
        if (card) updateIntlRates(item, card);
      }
    });
    updatePreview();
  }, 10);
}

window.toggleAddons = function (itemId, skuKey, tier) {
  if (!itemId) {
    // fallback if no itemId passed
    itemId = QG.activeItemId;
    const it = getActiveItem();
    skuKey = it?.sku_key || QG.currentSku;
    tier = it?.tier || QG.currentTier;
  }
  const showSms = document.getElementById('toggle-sms-addon_' + itemId)?.checked;
  const showWa = document.getElementById('toggle-wa-addon_' + itemId)?.checked;
  const showCt = document.getElementById('toggle-ct-addon_' + itemId)?.checked;

  const item = QG.skuItems.find(i => i.id === itemId);
  if (!item) return;

  const fields = getSkuFields(skuKey, tier);

  document.querySelectorAll('#sku-fields-card-' + itemId + ' .q-field-row').forEach(row => {
    const addonType = row.dataset.addon;
    if (addonType === 'SMS Add-on') {
      row.style.display = showSms ? 'flex' : 'none';
      if (!showSms) {
        delete item.values['sms_cost'];
        item.smsAddon = false;
      } else if (item.values['sms_cost'] === undefined) {
        item.values['sms_cost'] = fields.find(f => f.id === 'sms_cost')?.value;
        item.smsAddon = true;
      } else {
        item.smsAddon = true;
      }
    }
    if (addonType === 'WA Add-on') {
      row.style.display = showWa ? 'flex' : 'none';
      if (!showWa) {
        delete item.values['wa_utility'];
        delete item.values['wa_promo'];
        delete item.values['wa_api'];
        item.waAddon = false;
      } else if (item.values['wa_api'] === undefined) {
        item.values['wa_utility'] = fields.find(f => f.id === 'wa_utility')?.value;
        item.values['wa_promo'] = fields.find(f => f.id === 'wa_promo')?.value;
        item.values['wa_api'] = fields.find(f => f.id === 'wa_api')?.value;
        item.waAddon = true;
      } else {
        item.waAddon = true;
      }
    }
    if (addonType === 'CT Add-on') {
      const showCt = document.getElementById('toggle-ct-addon_' + itemId)?.checked;
      row.style.display = showCt ? 'flex' : 'none';
      if (!showCt) {
        delete item.values['call_transfer'];
        item.ctAddon = false;
      } else if (item.values['call_transfer'] === undefined) {
        item.values['call_transfer'] = fields.find(f => f.id === 'call_transfer')?.value ?? 499;
        item.ctAddon = true;
      } else {
        item.ctAddon = true;
      }
    }
    if (addonType === 'VN Add-on') {
      const showVn = item.values['add_vn'] === 1;
      row.style.display = showVn ? 'flex' : 'none';
      if (!showVn) {
        delete item.values['free_numbers'];
        delete item.values['num_paid_numbers'];
        delete item.values['extra_number'];
      } else if (item.values['free_numbers'] === undefined) {
        item.values['free_numbers'] = fields.find(f => f.id === 'free_numbers')?.value;
        item.values['num_paid_numbers'] = fields.find(f => f.id === 'num_paid_numbers')?.value;
        item.values['extra_number'] = fields.find(f => f.id === 'extra_number')?.value;
      }
    }
  });

  // Handle Veeno STD user model toggle – hide/show fields based on active model
  if (skuKey === 'voice_veeno_std') {
    const card = document.getElementById('sku-fields-card-' + itemId);
    if (card) {
      const showExotel = item.values['user_model_exotel'] === 1;
      // Fields that belong only to the Veeno per-user model
      ['num_users', 'extra_users', 'user_charge'].forEach(fid => {
        const el = card.querySelector(`#qf_${fid}_${itemId}`);
        const row = el?.closest('.q-field-row');
        if (row) row.style.display = showExotel ? 'none' : 'flex';
      });
      // Fields that belong only to the Exotel free-user model
      ['exotel_free_users', 'exotel_user_charge'].forEach(fid => {
        const el = card.querySelector(`#qf_${fid}_${itemId}`);
        const row = el?.closest('.q-field-row');
        if (row) row.style.display = showExotel ? 'flex' : 'none';
      });
      // Also hide/show the Veeno user charge label row (for the toggle itself keep visible)
      // Update the section label visibility for clarity
      const veenoLabelFields = card.querySelectorAll('.q-field-row');
      veenoLabelFields.forEach(row => {
        const label = row.querySelector('.q-field-label');
        if (!label) return;
        const labelText = label.textContent.trim();
        // Hide "User Charge – Veeno Model" label row when in Exotel model
        if (labelText === 'User Charge – Veeno Model (₹/user/month)') {
          row.style.display = showExotel ? 'none' : 'flex';
        }
        // Hide Exotel-model-only labels when in Veeno model
        if (labelText === 'Free Users (Exotel model)' || labelText === 'Extra User Charge – Exotel model (₹/user/month)') {
          row.style.display = showExotel ? 'flex' : 'none';
        }
      });
    }
  }

  if (QG.activeItemId === itemId) syncActiveAliases();
  updatePreview();
};

function isBreaching(f, numVal, item) {
  return false;
}

function renderFieldRow(f, item) {
  const v = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : '');

  if (f.type === 'country_select') {
    const countries = getIntlCountries();
    const optionsHtml = countries.map(c => `<option value="${sanitize(c.country)}" ${v === c.country ? 'selected' : ''}>${sanitize(c.country)}</option>`).join('');
    return `
      <div class="q-field-row" data-addon="${f.note || ''}">
        <span class="q-field-label">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value">
          <select class="q-input" id="qf_${f.id}_${item.id}" style="width:100%;">
            ${optionsHtml}
          </select>
        </div>
      </div>`;
  }

  if (f.type === 'call_type_select') {
    const callTypes = ['Fixed', 'Mobile'];
    const optionsHtml = callTypes.map(ct => `<option value="${ct}" ${v === ct ? 'selected' : ''}>${ct}</option>`).join('');
    return `
      <div class="q-field-row" data-addon="${f.note || ''}">
        <span class="q-field-label">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value">
          <select class="q-input" id="qf_${f.id}_${item.id}" style="width:100%;">
            ${optionsHtml}
          </select>
        </div>
      </div>`;
  }

  if (f.nonEditable) {
    const display = f.waived
      ? `<span class="q-waived"><svg width="11" height="11" viewBox="0 0 12 12" style="display:inline;vertical-align:middle;margin-right:2px"><polyline points="1,6 4,10 11,2" style="fill:none;stroke:#16a34a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/></svg> Waived</span>`
      : `<span class="q-non-editable">${v}</span>`;
    return `
      <div class="q-field-row" data-addon="${f.note || ''}">
        <span class="q-field-label">${sanitize(cleanLabel(f.label))}</span>
        <div class="q-field-value">${display}</div>
      </div>`;
  }

  if (f.type === 'pulse') {
    const pulseVal = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 60);
    return `
      <div class="q-field-row" data-addon="${f.note || ''}" style="align-items:center;">
        <span class="q-field-label" style="flex:1;">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="justify-content:flex-end;">
          <div class="q-toggle-group" id="qf_pulse_${item.id}">
            <button type="button" class="q-toggle-opt${pulseVal == 15 ? ' active' : ''}" data-val="15">15secs</button>
            <button type="button" class="q-toggle-opt${pulseVal == 30 ? ' active' : ''}" data-val="30">30secs</button>
            <button type="button" class="q-toggle-opt${pulseVal == 60 ? ' active' : ''}" data-val="60">60secs</button>
          </div>
        </div>
      </div>`;
  }

  if (f.type === 'model_toggle') {
    const mtVal = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 0);
    return `
      <div class="q-field-row" data-addon="${f.note || ''}" style="align-items:center;">
        <span class="q-field-label" style="flex:1;">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="justify-content:flex-end;">
          <div class="q-toggle-group" id="qf_toggle_${f.id}_${item.id}">
            <button type="button" class="q-toggle-opt${mtVal == 0 ? ' active' : ''}" data-val="0">Veeno Model</button>
            <button type="button" class="q-toggle-opt${mtVal == 1 ? ' active' : ''}" data-val="1">Exotel Model</button>
          </div>
        </div>
      </div>`;
  }

  if (f.type === 'boolean') {
    const boolVal = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 0);
    return `
      <div class="q-field-row" data-addon="${f.note || ''}" style="align-items:center;">
        <span class="q-field-label" style="flex:1;">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="justify-content:flex-end;">
          <div class="q-toggle-group" id="qf_toggle_${f.id}_${item.id}">
            <button type="button" class="q-toggle-opt${boolVal == 1 ? ' active' : ''}" data-val="1">Yes</button>
            <button type="button" class="q-toggle-opt${boolVal == 0 ? ' active' : ''}" data-val="0">No</button>
          </div>
        </div>
      </div>`;
  }

  if (f.type === 'fee_select') {
    const feeVal = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 0);
    return `
      <div class="q-field-row" data-addon="${f.note || ''}" style="align-items:center;">
        <span class="q-field-label" style="flex:1;">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="justify-content:flex-end;">
          <div class="q-toggle-group" id="qf_toggle_${f.id}_${item.id}" style="font-size:0.72rem;">
            <button type="button" class="q-toggle-opt${feeVal == 0 ? ' active' : ''}" data-val="0">None</button>
            <button type="button" class="q-toggle-opt${feeVal == 1 ? ' active' : ''}" data-val="1">3% Conv.</button>
            <button type="button" class="q-toggle-opt${feeVal == 2 ? ' active' : ''}" data-val="2">18% GST</button>
          </div>
        </div>
      </div>`;
  }

  if (f.type === 'rental_toggle') {
    const rtVal = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : 0);
    const rtOneTime = (item.values['rental_onetime'] ?? 0) == 1;
    return `
      <div class="q-field-row" data-addon="${f.note || ''}">
        <span class="q-field-label">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="gap:6px;align-items:center;">
          <input type="text" inputmode="decimal" class="q-input" id="qf_${f.id}_${item.id}" value="${rtVal}" autocomplete="off" spellcheck="false" style="width:80px;">
          <div class="q-toggle-group" id="qf_toggle_rental_onetime_${item.id}" style="font-size:0.72rem;">
            <button type="button" class="q-toggle-opt${!rtOneTime ? ' active' : ''}" data-val="0">Monthly</button>
            <button type="button" class="q-toggle-opt${rtOneTime ? ' active' : ''}" data-val="1">One-Time</button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="q-field-row" data-addon="${f.note || ''}">
      <span class="q-field-label">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
      <div class="q-field-value">
        <input type="text"
          inputmode="decimal"
          class="q-input"
          id="qf_${f.id}_${item.id}"
          value="${v}"
          autocomplete="off"
          spellcheck="false">
      </div>
    </div>`;
}

// ── Grouped field renderer ─────────────────────────────────
function renderFieldsGrouped(fields, item) {
  const SECTION_MAP = {
    validity: 'Plan Overview', rental: 'Plan Overview', setup: 'Plan Overview',
    channels: 'Plan Overview', brand_fee: 'Plan Overview', procurement: 'Plan Overview',
    num_months: 'Plan Overview',
    num_users: 'User Plan', free_users: 'User Plan', user_charge: 'User Plan', extra_user_cost: 'User Plan', extra_users: 'User Plan',
    user_model_exotel: 'User Plan', exotel_free_users: 'User Plan', exotel_user_charge: 'User Plan',
    user_charge_usd: 'User Plan',
    free_numbers: 'Number Plan', num_paid_numbers: 'Number Plan', extra_number: 'Number Plan',
    num_numbers: 'Number Plan', number_cost: 'Number Plan', did_numbers: 'Number Plan', add_vn: 'Number Plan',
    remove_std_numbers: 'Number Plan', num_channels: 'Number Plan', channel_cost: 'Number Plan', did_cost: 'Number Plan',
    number_charge_usd: 'Number Plan',
    credits: 'Credits & Validity', extra_credits: 'Credits & Validity', extra_validity: 'Credits & Validity', volume: 'Credits & Validity',
    prepaid_usd: 'Plan Overview', attach_intl_pdf: 'Plan Overview', attach_isd_pdf: 'Plan Overview', fee_type: 'Plan Overview',
    single_leg: 'Call Charges', incoming: 'Call Charges', outgoing: 'Call Charges',
    attempt: 'Call Charges', call_rate: 'Call Charges', sms_cost: 'Call Charges',
    wa_utility: 'Call Charges', wa_promo: 'Call Charges', wa_api: 'Call Charges',
    rcs_biz: 'Call Charges', rcs_rich: 'Call Charges', rcs_reply: 'Call Charges',
    pulse: 'Call Charges', human_handoff: 'Call Charges',
    intl_country: 'Call Charges', rm_country: 'Call Charges', voip_incoming_usd: 'Call Charges',
    voip_outgoing_usd: 'Call Charges', pstn_incoming_usd: 'Call Charges', pstn_outgoing_usd: 'Call Charges',
  };
  const sectionOrder = [];
  const sectionMap = {};
  fields.forEach(f => {
    const sec = SECTION_MAP[f.id] || 'Settings';
    if (!sectionMap[sec]) { sectionMap[sec] = []; sectionOrder.push(sec); }
    sectionMap[sec].push(f);
  });
  const multiSec = sectionOrder.length > 1;
  return sectionOrder.map(sec =>
    (multiSec ? `<div class="q-form-section-header">${sec}</div>` : '') +
    sectionMap[sec].map(f => renderFieldRow(f, item)).join('')
  ).join('');
}

// ── Approval Modal ─────────────────────────────────────────
function showApprovalModal(field, val) {
  return new Promise(resolve => {
    const modal = document.getElementById('q-approval-modal');
    const info = document.getElementById('q-modal-field-info');
    const body = document.getElementById('q-modal-body-text');
    const pw = document.getElementById('q-modal-password');
    const ok = document.getElementById('q-modal-approve');
    const cancel = document.getElementById('q-modal-cancel');

    body.textContent = `"${field.label}" breaches the stop-lock (${field.stopType === 'lower' ? 'minimum' : 'maximum'}: ${field.stopVal}). Verbal manager approval required.`;
    info.innerHTML = `Field: <strong>${field.label}</strong> &nbsp;|&nbsp; Your value: <strong>${val}</strong> &nbsp;|&nbsp; Threshold: <strong>${field.stopVal}</strong>`;
    pw.value = '';
    modal.classList.remove('hidden');
    pw.focus();

    const cleanup = (result) => {
      modal.classList.add('hidden');
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
      resolve(result);
    };

    document.getElementById('q-modal-approve').addEventListener('click', () => {
      const entered = document.getElementById('q-modal-password').value;
      if (entered === QG.APPROVAL_PASSWORD) {
        cleanup(true);
      } else {
        document.getElementById('q-modal-password').style.borderColor = '#ef4444';
        setTimeout(() => { document.getElementById('q-modal-password').style.borderColor = ''; }, 1000);
      }
    });
    document.getElementById('q-modal-cancel').addEventListener('click', () => cleanup(false));
  });
}

async function logStopLockOverride(field, val) {
  const qNum = document.getElementById('q-quote-number')?.textContent || '';
  const sku = SKUS.find(s => s.key === QG.currentSku);
  try {
    await fetch('/api/approval-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_number: qNum, sku_name: sku?.label, field_name: field.label, field_value: val })
    });
  } catch (e) { /* silent */ }
}

// -- Live Preview Renderer ----------------------------------
// ── Startup Budget Meter ────────────────────────────────────────
function calcStartupTotal() {
  const item = getActiveItem();
  if (!item) return 0;
  const v = item.values;
  const sub = item.tier || 'voice';
  const g = (k, def = 0) => parseFloat(v[k] ?? def) || 0;

  switch ('startup_' + sub) {
    case 'startup_voice':
      // credits + paid extra numbers over validity
      return g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('validity', 6);

    case 'startup_stream':
      // channels × cost × months + credits
      return g('num_channels', 2) * g('channel_cost', 1500) * g('num_months', 1)
        + g('credits');

    case 'startup_tfn':
      // TFN numbers × cost × months + credits + paid extra numbers
      return g('num_numbers', 1) * g('number_cost', 1500) * g('num_months', 1)
        + g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('num_months', 1);

    case 'startup_sms':
      // credits + paid extra numbers × cost × months
      return g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('num_months', 1);

    case 'startup_whatsapp':
      // credits + paid extra numbers × cost × months
      return g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('num_months', 1);

    case 'startup_rcs':
      // number_cost × months + credits
      return g('number_cost', 0) * g('num_months', 1)
        + g('credits');

    case 'startup_sip':
      // credits + paid extra numbers × cost × validity
      return g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('validity', 6);

    case 'startup_campaigns':
      // credits + paid extra numbers × cost × validity
      return g('credits')
        + g('num_paid_numbers') * g('extra_number', 499) * g('validity', 1);

    default:
      return g('credits');
  }
}

window.updateStartupBudget = function () {
  const fill = document.getElementById('startup-budget-fill');
  const label = document.getElementById('startup-budget-label');
  const warning = document.getElementById('startup-budget-warning');
  if (!fill || !label) return;
  const used = calcStartupTotal();
  const cap = 6000;
  const pct = Math.min((used / cap) * 100, 100);
  const over = used > cap;
  fill.style.width = pct + '%';
  fill.style.background = over ? '#dc2626' : pct > 80 ? '#f59e0b' : '#0284c7';
  label.style.color = over ? '#dc2626' : pct > 80 ? '#b45309' : '#0284c7';
  label.innerHTML = `&#8377;${Math.round(used).toLocaleString('en-IN')} / &#8377;6,000`;
  if (warning) warning.style.display = over ? 'block' : 'none';
};


// ── Bundle Compare Preview Helper ─────────────────────────────────────────
function _renderBundleItemsHTML(bundleItems) {
  let allSectionsHTML = '';
  let grandSubtotal = 0;
  const perUnit = (text) => `<span style="color:#94a3b8;font-size:0.8em;">${text}</span>`;
  const validItems = bundleItems.filter(i => i.sku_key);

  for (let idx = 0; idx < validItems.length; idx++) {
    const item = validItems[idx];
    const sku = SKUS.find(s => s.key === item.sku_key);
    const fields = getSkuFields(item.sku_key, item.tier);

    const getVal = (id) => {
      const f = fields.find(x => x.id === id);
      if (!f) return undefined;
      return item.values[id] ?? f.value;
    };
    const getSafeNum = (id) => {
      const f = fields.find(x => x.id === id);
      if (!f || f.waived) return 0;
      return parseFloat(item.values[id] ?? f.value ?? 0);
    };
    const fmtRupee = (v) => {
      if (v === null || v === undefined) return '-';
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    };
    const currentPulse = parseFloat(getVal('pulse')) || 60;
    const rateUnit = currentPulse === 60 ? 'p/min' : `p/${currentPulse}secs`;
    const fmtPaise = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/' + (currentPulse === 60 ? 'min' : currentPulse + 'secs');
      return num + ' ' + rateUnit;
    };
    const fmtPaiseMsg = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/msg';
      return num + 'p/msg';
    };

    const TICK = '<svg width="11" height="11" viewBox="0 0 12 12" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="1,6 4,10 11,2" style="fill:none;stroke:#16a34a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/></svg>';
    const W = `<span class="waived-text">${TICK} Waived</span>`;
    const FREE = `<span class="waived-text">${TICK} Free</span>`;
    let isFirstSec = true;
    const hasHTML = (s) => typeof s === 'string' && /<[a-zA-Z]/.test(s);
    const secRow = (lbl) => {
      const res = (isFirstSec ? '' : '</tbody>') + `<tbody style="page-break-inside: avoid; break-inside: avoid;"><tr class="section-header-row"><td colspan="2">${lbl}</td></tr>`;
      isFirstSec = false;
      return res;
    };
    const stdRow = (lbl, val, isWaived) => {
      const disp = isWaived ? W : hasHTML(val) ? val : sanitize(String(val ?? '-'));
      return `<tr><td class="sku-row-name">${sanitize(lbl)}</td><td>${disp}</td></tr>`;
    };
    const indRow = (lbl, val) => {
      const disp = hasHTML(val) ? val : sanitize(String(val ?? '-'));
      return `<tr class="sub-row"><td>${sanitize(lbl)}</td><td>${disp}</td></tr>`;
    };


    let tableHTML = '';
    const sk = item.sku_key;

    // Startup plan mapping: render using parent SKU's format
    // If sk is 'startup', resolve via item.tier
    const resolvedStartupKey = sk === 'startup' ? ('startup_' + (item.tier || 'voice')) : sk;
    const isStartup = sk === 'startup' || !!STARTUP_PARENT_MAP[sk];
    const effectiveSk = STARTUP_PARENT_MAP[resolvedStartupKey] || (STARTUP_PARENT_MAP[sk]) || sk;

    const isEditingThisItem = (item.id === QG.activeItemId);
    const showSms = isEditingThisItem ? document.getElementById('toggle-sms-addon_' + QG.activeItemId)?.checked : (item.smsAddon === true);
    const showWa  = isEditingThisItem ? document.getElementById('toggle-wa-addon_'  + QG.activeItemId)?.checked : (item.waAddon  === true);
    const showCt  = isEditingThisItem ? document.getElementById('toggle-ct-addon_'  + QG.activeItemId)?.checked : (item.ctAddon  === true);

    // Startup banner header (renders before the SKU-format rows)
    if (effectiveSk === 'voice_exotel_std') {
      tableHTML += secRow('Plan Details');
      const baseValidityE = parseFloat(getVal('validity')) || 0;
      const extraValidityE = getSafeNum('extra_validity') || 0;
      tableHTML += stdRow('Validity', extraValidityE > 0 ? `${baseValidityE} + ${extraValidityE} months` : getVal('validity') + ' Months');
      const rentalStd = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalStd === 0 ? null : fmtRupee(rentalStd), rentalStd === 0);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const fu = getVal('free_users');
      const fuExtra = getSafeNum('extra_users') || 0;
      const fuDisplay = (fu === null || fu === 'Unlimited') ? 'Unlimited (Included)' : (fuExtra > 0 ? `${fu} + ${fuExtra} Users (Free)` : fu + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
      const paidNumsE = getSafeNum('num_paid_numbers') || 0;
      if (paidNumsE > 0) {
        const extNumCostE = getSafeNum('extra_number');
        const vMonthsE = (parseFloat(getVal('validity')) || 0) + (getSafeNum('extra_validity') || 0);
        tableHTML += stdRow('Extra Numbers', `${paidNumsE} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsE} numbers × ${vMonthsE} months × ${fmtRupee(extNumCostE)} = <strong>${fmtRupee(paidNumsE * vMonthsE * extNumCostE)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const baseCreditsE = getSafeNum('credits');
      const extraCreditsE = getSafeNum('extra_credits') || 0;
      const creditsDisplayE = extraCreditsE > 0
        ? `${fmtRupee(baseCreditsE)} + ${fmtRupee(extraCreditsE)}`
        : fmtRupee(baseCreditsE);
      tableHTML += stdRow('Call Credits', creditsDisplayE);
      tableHTML += stdRow('Incoming Call Charges', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Call Charges', fmtPaise(getSafeNum('outgoing')));
      if (showCt) tableHTML += stdRow('Call Transfer Add-on', `${fmtRupee(getSafeNum('call_transfer'))}/month`);

      if (showSms || showWa) {
        tableHTML += secRow('Messaging & Communication Services');
        if (showSms) tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));
        if (showWa) {
          tableHTML += stdRow('WhatsApp Utility Messages', fmtPaiseMsg(getVal('wa_utility')));
          tableHTML += stdRow('WhatsApp Promotional Messages', fmtPaiseMsg(getVal('wa_promo')));
          tableHTML += stdRow('WhatsApp API Charge', fmtPaiseMsg(getSafeNum('wa_api')));
        }
      }

      // ISD PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_isd_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/country-wise-isd-pricing.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>ISD Voice Rate Card - Country-wise Outbound Pricing</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }
    } else if (effectiveSk === 'voice_veeno_std') {
      const numUsers = getSafeNum('num_users') || 0;
      const uCharge = getSafeNum('user_charge') || 1000;
      const validity = parseFloat(getVal('validity')) || 0;
      const DID_COST = getSafeNum('did_cost') || 1500;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const rentalOneTime = item.values['rental_onetime'] === 1;
      const userModelExotel = getSafeNum('user_model_exotel') === 1;
      const exoFreeUsers = getSafeNum('exotel_free_users') || 6;
      const exoUserCharge = getSafeNum('exotel_user_charge') || 1999;
      const chargedUsers = Math.max(0, numUsers - (userModelExotel ? exoFreeUsers : 0));
      const totalUserCostV = userModelExotel
        ? chargedUsers * validity * exoUserCharge
        : numUsers * validity * uCharge;

      tableHTML += secRow('Plan Details');
      const extraValidityV = getSafeNum('extra_validity') || 0;
      tableHTML += stdRow('Validity', extraValidityV > 0 ? `${validity} + ${extraValidityV} months` : validity + ' Months');
      const rVal = getSafeNum('rental');
      if (rVal === 0) {
        tableHTML += stdRow('Account Rental', W);
      } else if (rentalOneTime) {
        tableHTML += stdRow('Account Rental', fmtRupee(rVal));
      } else {
        tableHTML += stdRow('Account Rental', `${fmtRupee(rVal)} ${perUnit('/month')}`);
        tableHTML += indRow('Calculation', `${fmtRupee(rVal)}/month × ${validity} months = <strong>${fmtRupee(rVal * validity)}</strong>`);
      }
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const vStdExtraUsers = getSafeNum('extra_users') || 0;
      if (userModelExotel) {
        const freeDisplay = vStdExtraUsers > 0 ? `${exoFreeUsers} + ${vStdExtraUsers} Users (Free)` : `${exoFreeUsers} Users (Free)`;
        tableHTML += stdRow('Free Users', freeDisplay);
        tableHTML += indRow('Extra User Cost', `${fmtRupee(exoUserCharge)} ${perUnit('/user/month')}`);
        if (chargedUsers > 0) {
          tableHTML += stdRow('Charged Users', chargedUsers + ' users');
          tableHTML += indRow('Calculation', `${chargedUsers} users × ${validity} months × ${fmtRupee(exoUserCharge)} = <strong>${fmtRupee(totalUserCostV)}</strong>`);
        }
      } else {
        const vStdUserLabel = vStdExtraUsers > 0 ? `${vStdExtraUsers} Free, ${numUsers} Charged` : numUsers;
        tableHTML += stdRow('No. of Users', vStdUserLabel);
        tableHTML += stdRow('User Charge', `${fmtRupee(uCharge)} ${perUnit('/user/month')}`);
        tableHTML += indRow('Calculation', `${numUsers} users × ${validity} months × ${fmtRupee(uCharge)} = <strong>${fmtRupee(totalUserCostV)}</strong>`);
      }

      tableHTML += secRow('Number Plan');
      if (!removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsV = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsV > 0) {
          const extNumCostV = getSafeNum('extra_number');
          const effValV = validity + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${paidNumsV} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsV} numbers × ${effValV} months × ${fmtRupee(extNumCostV)} = <strong>${fmtRupee(paidNumsV * effValV * extNumCostV)}</strong>`);
        }
      }
      if (didNums > 0) {
        const didTotalV = didNums * validity * DID_COST;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/Mobile DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums} Mobile DID(s) × ${validity} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotalV)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const baseCreditsV = getSafeNum('credits');
      const extraCreditsV = getSafeNum('extra_credits') || 0;
      const creditsDisplayV = extraCreditsV > 0
        ? `${fmtRupee(baseCreditsV)} + ${fmtRupee(extraCreditsV)}`
        : fmtRupee(baseCreditsV);
      tableHTML += stdRow('Call Credits', creditsDisplayV);
      const incomingV = getSafeNum('incoming');
      tableHTML += stdRow('Incoming Call Charges', incomingV === 0 ? FREE : fmtPaise(incomingV));
      tableHTML += stdRow('Outgoing Call Charges', fmtPaise(getSafeNum('outgoing')));
      if (showCt) tableHTML += stdRow('Call Transfer Add-on', `${fmtRupee(getSafeNum('call_transfer'))}/month`);

      // ISD PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_isd_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/country-wise-isd-pricing.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>ISD Voice Rate Card - Country-wise Outbound Pricing</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }

    } else if (effectiveSk === 'sip_veeno') {
      tableHTML += secRow('Plan Details');
      const sipBaseValidity = parseFloat(getVal('validity')) || 0;
      const sipExtraValidity = getSafeNum('extra_validity') || 0;
      const sipValidityDisplay = sipExtraValidity > 0
        ? `${sipBaseValidity} + ${sipExtraValidity} Months`
        : `${sipBaseValidity} Months`;
      tableHTML += stdRow('Validity', sipValidityDisplay);
      const rentalSip = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalSip === 0 ? null : fmtRupee(rentalSip), rentalSip === 0);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const fu2 = getVal('free_users');
      const fu2Extra = getSafeNum('extra_users') || 0;
      const fu2Display = (fu2 === null || fu2 === 'Unlimited') ? 'Unlimited (Included)' : (fu2Extra > 0 ? `${fu2} + ${fu2Extra} Users (Free)` : fu2 + ' Users (Free)');
      tableHTML += stdRow('Free Users', fu2Display);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(199)} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      const removStdSip = getSafeNum('remove_std_numbers') || 0;
      const vMonthsS = sipBaseValidity;
      const effVMonthsS = vMonthsS + sipExtraValidity;

      if (!removStdSip) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(499)} ${perUnit('/number/month')}`);
        const paidNumsS = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsS > 0) {
          tableHTML += stdRow('Extra Numbers', `${paidNumsS} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsS} numbers × ${effVMonthsS} months × ${fmtRupee(499)} = <strong>${fmtRupee(paidNumsS * effVMonthsS * 499)}</strong>`);
        }
      }
      const didNums2 = getSafeNum('did_numbers') || 0;
      if (didNums2 > 0) {
        tableHTML += stdRow('Mobile DID Numbers', `${didNums2} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(1500)} ${perUnit('/Mobile DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums2} Mobile DID(s) × ${vMonthsS} months × ${fmtRupee(1500)} = <strong>${fmtRupee(didNums2 * vMonthsS * 1500)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const sipBaseCredits = getSafeNum('credits');
      const sipExtraCredits = getSafeNum('extra_credits') || 0;
      const sipCreditDisplay = sipExtraCredits > 0
        ? `${fmtRupee(sipBaseCredits)} + ${fmtRupee(sipExtraCredits)}`
        : fmtRupee(sipBaseCredits);
      tableHTML += stdRow('Call Credits', sipCreditDisplay);
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      const sipAttemptVal = getSafeNum('attempt');
      const sipAttemptDisplay = sipAttemptVal === 0 ? 'Free' : (sipAttemptVal >= 100 ? '₹' + (sipAttemptVal / 100).toFixed(2) + ' / failed call' : sipAttemptVal + 'p / failed call');
      tableHTML += stdRow('Attempt Charges', sipAttemptDisplay);

    } else if (effectiveSk === 'voice_exotel_user' || sk === 'voice_veeno_user') {
      const isVeeno = sk === 'voice_veeno_user';
      const numUsers = getSafeNum('num_users') || 0;
      const numMonths = getSafeNum('num_months') || 0;
      const userCharge = getSafeNum('user_charge') || 0;
      const totalUserCost = numUsers * numMonths * userCharge;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const DID_COST = getSafeNum('did_cost') || 1500;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const userExtraFree = getSafeNum('extra_users') || 0;
      const userLabel = userExtraFree > 0
        ? `${userExtraFree} Free, ${numUsers} Charged`
        : numUsers;
      tableHTML += stdRow('No. of Users', userLabel);
      tableHTML += stdRow('No. of Months', numMonths);
      tableHTML += stdRow('User Charge', `${fmtRupee(userCharge)} ${perUnit('/user/month')}`);
      tableHTML += indRow('Calculation', `${numUsers} users × ${numMonths} months × ${fmtRupee(userCharge)} = <strong>${fmtRupee(totalUserCost)}</strong>`);

      tableHTML += secRow('Number Plan');
      if (!isVeeno || !removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsU = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsU > 0) {
          const effValU = numMonths + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${paidNumsU} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsU} numbers × ${effValU} months × ${fmtRupee(getSafeNum('extra_number'))} = <strong>${fmtRupee(paidNumsU * effValU * getSafeNum('extra_number'))}</strong>`);
        }
      }
      if (isVeeno && didNums > 0) {
        const didTotal = didNums * numMonths * DID_COST;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/Mobile DID/month')}`);
      tableHTML += indRow('Calculation', `${didNums} Mobile DID(s) × ${numMonths} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotal)}</strong>`);
      }

      tableHTML += secRow('Call Charges');
      tableHTML += stdRow('Incoming Call Charges', W);
      tableHTML += stdRow('Outgoing Call Charges', W);

    } else if (effectiveSk === 'voice_exotel_tfn') {
      const numNums = getSafeNum('num_numbers') || 0;
      const numMonths2 = getSafeNum('num_months') || 0;
      const numCost = getSafeNum('number_cost') || 0;
      const totalNumCost = numNums * numMonths2 * numCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');
      tableHTML += stdRow('No. of Months', numMonths2);

      tableHTML += secRow('User Plan');
      const fuTfn = getVal('free_users');
      const fuTfnExtra = getSafeNum('extra_users') || 0;
      const fuTfnDisplay = (fuTfn === null || fuTfn === 'Unlimited') ? 'Unlimited (Included)' : (fuTfnExtra > 0 ? `${fuTfn} + ${fuTfnExtra} Users (Free)` : fuTfn + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuTfnDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('TFN Number Plan');
      tableHTML += stdRow('No. of TFN Numbers', numNums);
      tableHTML += stdRow('TFN Number Cost', `${fmtRupee(numCost)} ${perUnit('/number/month')}`);
      tableHTML += indRow('Calculation', `${numNums} number(s) × ${numMonths2} months × ${fmtRupee(numCost)} = <strong>${fmtRupee(totalNumCost)}</strong>`);

      const tfnVnEnabled = item.values['add_vn'] === 1;
      if (tfnVnEnabled) {
        tableHTML += secRow('Virtual Landline Number Plan');
        tableHTML += stdRow('Free Virtual Landline Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
        const tfnPaidVNs = getSafeNum('num_paid_numbers') || 0;
        if (tfnPaidVNs > 0) {
          const tfnVnCost = getSafeNum('extra_number');
          const tfnEffMonths = numMonths2 + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${tfnPaidVNs} Number(s)`);
          tableHTML += indRow('Calculation', `${tfnPaidVNs} numbers × ${tfnEffMonths} months × ${fmtRupee(tfnVnCost)} = <strong>${fmtRupee(tfnPaidVNs * tfnEffMonths * tfnVnCost)}</strong>`);
        }
      }
      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));

    } else if (effectiveSk === 'voice_exotel_stream' || effectiveSk === 'voice_exotel_voicebot') {
      const isVoicebot = effectiveSk === 'voice_exotel_voicebot';
      const numChs = getSafeNum('num_channels') || 0;
      const numMos = getSafeNum('num_months') || 0;
      const chCost = getSafeNum('channel_cost') || 0;
      const freeChs = isVoicebot ? 5 : 0;
      const paidChs = Math.max(0, numChs - freeChs);
      const totalCh = paidChs * numMos * chCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('No. of Months', Math.max(1, parseFloat(getVal('num_months') || 0)));
      const rentalStream = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalStream === 0 ? null : `${fmtRupee(rentalStream)} ${perUnit('/month')}`, rentalStream === 0);
      tableHTML += stdRow('Setup Charges', null, true);

      tableHTML += secRow(isVoicebot ? 'Voicebot Channels' : 'Streaming Channels');
      if (isVoicebot) {
        tableHTML += stdRow('No. of Channels', paidChs > 0 ? `5 Free, ${paidChs} Paid` : `5 Channels (5 Channels Included Free)`);
        tableHTML += indRow('Additional Channel Cost', `${fmtRupee(chCost)} ${perUnit('/channel/month')}`);
        if (paidChs > 0) {
          tableHTML += indRow('Channel Calculation', `${paidChs} channels × ${numMos} months × ${fmtRupee(chCost)} = <strong>${fmtRupee(totalCh)}</strong>`);
        }
      } else {
        tableHTML += stdRow('No. of Channels', numChs);
        tableHTML += stdRow('Channel Cost', `${fmtRupee(chCost)} ${perUnit('/channel/month')}`);
        tableHTML += indRow('Calculation', `${numChs} channels × ${numMos} months × ${fmtRupee(chCost)} = <strong>${fmtRupee(totalCh)}</strong>`);
      }

      tableHTML += secRow('User Plan');
      const fuStr = getVal('free_users');
      const fuStrExtra = getSafeNum('extra_users') || 0;
      const fuStrDisplay = (fuStr === null || fuStr === 'Unlimited') ? 'Unlimited (Included)' : (fuStrExtra > 0 ? `${fuStr} + ${fuStrExtra} Users (Free)` : fuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuStrDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
      const paidNumsStr = getSafeNum('num_paid_numbers') || 0;
      if (paidNumsStr > 0) {
        const streamNumMos = numMos + (getSafeNum('extra_validity') || 0);
        tableHTML += stdRow('Extra Numbers', `${paidNumsStr} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsStr} numbers × ${streamNumMos} months × ${fmtRupee(getSafeNum('extra_number'))} = <strong>${fmtRupee(paidNumsStr * streamNumMos * getSafeNum('extra_number'))}</strong>`);
      }
      const didNums = getSafeNum('did_numbers') || 0;
      if (didNums > 0) {
        const didCost = getSafeNum('did_cost') || 1500;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Number(s)`);
        tableHTML += indRow('Calculation', `${didNums} numbers × ${numMos} months × ${fmtRupee(didCost)} = <strong>${fmtRupee(didNums * numMos * didCost)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const streamBaseCredits = getSafeNum('credits');
      const streamExtraCredits = getSafeNum('extra_credits') || 0;
      const streamCreditDisplay = streamExtraCredits > 0
        ? `${fmtRupee(streamBaseCredits)} + ${fmtRupee(streamExtraCredits)}`
        : fmtRupee(streamBaseCredits);
      tableHTML += stdRow('Call Credits', streamCreditDisplay);
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      if (getSafeNum('human_handoff') === 1) {
        tableHTML += stdRow('Human Handoff Calling Rate', fmtPaise(getSafeNum('outgoing')));
      }
      const attemptVal = getSafeNum('attempt');
      if (attemptVal > 0) {
        const attemptDisplay = attemptVal >= 100
          ? '\u20b9' + (attemptVal / 100).toFixed(2) + ' / failed call'
          : attemptVal + 'p / failed call';
        tableHTML += stdRow('Attempt Charges', attemptDisplay);
      }

    } else if (effectiveSk === 'voice_exotel_campaigns' || sk === 'voice_veeno_campaigns') {
      const campValidity = parseFloat(getVal('validity')) || 0;
      const campRate = getSafeNum('call_rate') || 0;
      const campBaseCredits = getSafeNum('credits');
      const campExtraCredits = getSafeNum('extra_credits') || 0;
      const campCreditDisplay = campExtraCredits > 0
        ? `${fmtRupee(campBaseCredits)} + ${fmtRupee(campExtraCredits)}`
        : fmtRupee(campBaseCredits);
      const campExtraValidity = getSafeNum('extra_validity') || 0;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Validity', campValidity + ' Months');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');
      const fuCamp = getVal('free_users');
      const fuCampExtra = getSafeNum('extra_users') || 0;
      const fuCampDisplay = (fuCamp === null || fuCamp === 'Unlimited') ? 'Unlimited (Included)' : (fuCampExtra > 0 ? `${fuCamp} + ${fuCampExtra} Users (Free)` : fuCamp + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuCampDisplay);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      const campPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (campPaidNums > 0) {
        const campNumCost = getSafeNum('extra_number');
        const campEffValidity = campValidity + campExtraValidity;
        tableHTML += stdRow('Extra Numbers', `${campPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${campPaidNums} × ${campEffValidity} months × ${fmtRupee(campNumCost)} = <strong>${fmtRupee(campPaidNums * campEffValidity * campNumCost)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Campaign Rate');
      if (campExtraValidity > 0) {
        tableHTML += stdRow('Validity', `${campValidity} + ${campExtraValidity} months`);
      }
      tableHTML += stdRow('Call Credits', campCreditDisplay);
      tableHTML += stdRow('Campaign Call Charges', fmtPaise(campRate));

    } else if (effectiveSk === 'sms_exotel') {
      tableHTML += secRow('Plan Details');
      const rentalVal = getSafeNum('rental');
      const isRentalWaived = rentalVal === 0;
      tableHTML += stdRow('Account Rental', isRentalWaived ? null : (fmtRupee(rentalVal) + '/month'), isRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const smsFuStr = getVal('free_users');
      const smsExtraUsers = getSafeNum('extra_users') || 0;
      const smsFuDisplay = (smsFuStr === null || smsFuStr === 'Unlimited') ? 'Unlimited (Included)' : (smsExtraUsers > 0 ? `${smsFuStr} + ${smsExtraUsers} Users (Free)` : smsFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', smsFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
      const smsPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (smsPaidNums > 0) {
        const smsNumMonths = (getSafeNum('num_months') || 0) + (getSafeNum('extra_validity') || 0);
        const smsExtraCost = getSafeNum('extra_number');
        tableHTML += stdRow('Extra Numbers', `${smsPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${smsPaidNums} numbers × ${smsNumMonths} months × ${fmtRupee(smsExtraCost)} = <strong>${fmtRupee(smsPaidNums * smsNumMonths * smsExtraCost)}</strong>`);
      }

      tableHTML += secRow('SMS Credits & Rates');
      tableHTML += stdRow('SMS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));

    } else if (effectiveSk === 'whatsapp_exotel') {
      tableHTML += secRow('Plan Details');
      const waRentalVal = getSafeNum('rental');
      const isWaRentalWaived = waRentalVal === 0;
      tableHTML += stdRow('Account Rental', isWaRentalWaived ? null : (`${fmtRupee(waRentalVal)} per month`), isWaRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const waFuStr = getVal('free_users');
      const waExtraUsers = getSafeNum('extra_users') || 0;
      const waFuDisplay = (waFuStr === null || waFuStr === 'Unlimited') ? 'Unlimited (Included)' : (waExtraUsers > 0 ? `${waFuStr} + ${waExtraUsers} Users (Free)` : waFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', waFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
      const waPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (waPaidNums > 0) {
        const waNumMonths = (getSafeNum('num_months') || 0) + (getSafeNum('extra_validity') || 0);
        const waExtraCost = getSafeNum('extra_number');
        tableHTML += stdRow('Extra Numbers', `${waPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${waPaidNums} numbers × ${waNumMonths} months × ${fmtRupee(waExtraCost)} = <strong>${fmtRupee(waPaidNums * waNumMonths * waExtraCost)}</strong>`);
      }

      tableHTML += secRow('WhatsApp Credits & Rates');
      tableHTML += stdRow('WA Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Utility Message Cost', fmtPaiseMsg(getSafeNum('wa_utility')));
      tableHTML += stdRow('Promotional Message Cost', fmtPaiseMsg(getSafeNum('wa_promo')));
      tableHTML += stdRow('API Charge (per msg)', fmtPaiseMsg(getSafeNum('wa_api')));

    } else if (effectiveSk === 'rcs_exotel') {
      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Brand Registration Fee', fmtRupee(getSafeNum('brand_fee')));
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const rcsFuStr = getVal('free_users');
      const rcsExtraUsers = getSafeNum('extra_users') || 0;
      const rcsFuDisplay = (rcsFuStr === null || rcsFuStr === 'Unlimited') ? 'Unlimited (Included)' : (rcsExtraUsers > 0 ? `${rcsFuStr} + ${rcsExtraUsers} Users (Free)` : rcsFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', rcsFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      const rcsNumCost = getSafeNum('number_cost');
      const isRcsNumWaived = rcsNumCost === 0;
      tableHTML += stdRow('Number Cost', isRcsNumWaived ? null : (fmtRupee(rcsNumCost) + '/month'), isRcsNumWaived);
      tableHTML += secRow('RCS Credits & Rates');
      tableHTML += stdRow('RCS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Business Messaging', fmtPaiseMsg(getSafeNum('rcs_biz')));
      tableHTML += stdRow('Rich Media Messaging', fmtPaiseMsg(getSafeNum('rcs_rich')));
      tableHTML += stdRow('User Reply Charge', fmtPaiseMsg(getSafeNum('rcs_reply')));

    } else if (effectiveSk === 'num_1400' || sk === 'num_1600') {
      const numRental = getSafeNum('rental') || 0;
      const numMosN = getSafeNum('num_months') || 0;
      const numChsN = getSafeNum('num_channels') || 0;
      const chCostN = getSafeNum('channel_cost') || 0;
      const procurement = getSafeNum('procurement') || 0;
      const totalRental = numRental * numMosN;
      const totalChs = numChsN * numMosN * chCostN;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Number Procurement', fmtRupee(procurement));
      tableHTML += stdRow('Number Rental', `${fmtRupee(numRental)}&nbsp;<span style="color:#94a3b8;font-size:0.8em;">per month</span>`);
      tableHTML += indRow('Rental Calculation', `${numMosN} months × ${fmtRupee(numRental)} = <strong>${fmtRupee(totalRental)}</strong>`);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', numMosN);
      tableHTML += secRow('Channels');
      tableHTML += stdRow('No. of Channels', numChsN);
      tableHTML += stdRow('Channel Cost', `${fmtRupee(chCostN)}&nbsp;<span style="color:#94a3b8;font-size:0.8em;">per month</span>`);
      tableHTML += indRow('Channel Calculation', `${numChsN} channels × ${numMosN} months × ${fmtRupee(chCostN)} = <strong>${fmtRupee(totalChs)}</strong>`);
      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));

    } else if (sk === 'voice_intl') {
      // ── International Commercial (USD pricing) ──────────────────
      const fmtUsd = (v) => {
        if (v === null || v === undefined) return '-';
        const n = parseFloat(v);
        if (isNaN(n)) return String(v);
        return '$' + n.toFixed(4).replace(/\.?0+$/, '');
      };
      const fmtUsdFixed = (v, dec = 2) => {
        if (v === null || v === undefined) return '-';
        return '$' + parseFloat(v).toFixed(dec);
      };
      const prepaid = getSafeNum('prepaid_usd') || 400;
      const numUsers = getSafeNum('num_users') || 1;
      const numNumbers = getSafeNum('num_numbers') || 1;
      const userCharge = getSafeNum('user_charge_usd') || 15;
      const numCharge = getSafeNum('number_charge_usd') || 15;
      const country = getVal('intl_country') || 'United States';
      const rmCountry = getVal('rm_country') || 'India';
      const rmRate = getSafeNum('_rm_rate') || 0.08;
      const voipOut = getSafeNum('voip_outgoing_usd');
      const pstnInc = getSafeNum('pstn_incoming_usd');
      const pstnOut = getSafeNum('pstn_outgoing_usd');

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Credits (USD)', `${fmtUsdFixed(prepaid)}`);
      tableHTML += stdRow('Setup Charges', null, true);

      tableHTML += secRow('User Plan');
      tableHTML += stdRow('No. of Agents', `${numUsers}`);
      tableHTML += stdRow('User Charge', `${fmtUsdFixed(userCharge)} / agent / month`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('No. of Numbers', `${numNumbers}`);
      tableHTML += stdRow('Number Rental', `${fmtUsdFixed(numCharge)} / number / month`);

      tableHTML += secRow(`Call Charges (${sanitize(country)})`);
      tableHTML += stdRow('VoIP Incoming', FREE);
      tableHTML += stdRow('VoIP Outgoing', `${fmtUsd(voipOut)} / min`);
      tableHTML += indRow(`${sanitize(country)} outgoing leg`, `Destination rate - billed to ${sanitize(country)} number`);
      tableHTML += stdRow('PSTN Incoming', `${fmtUsd(pstnInc)} / min`);
      tableHTML += indRow(`${sanitize(rmCountry)} agent leg`, `${sanitize(country)} leg is free; ${sanitize(rmCountry)} agent leg charged at ${fmtUsd(rmRate)}/min`);
      tableHTML += stdRow('PSTN Outgoing', `${fmtUsd(pstnOut)} / min`);
      tableHTML += indRow('Breakdown', `${sanitize(country)} leg (${fmtUsd(voipOut)}) + ${sanitize(rmCountry)} agent leg (${fmtUsd(rmRate)}) = <strong>${fmtUsd(pstnOut)}/min</strong>`);

      // PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_intl_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/intl-voice-rates.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>International Voice Rate Card - Outbound Pricing (USD)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }

      // Convenience fee / GST subtotal card
      const feeTypeB = getSafeNum('fee_type'); // 0=none, 1=3% conv fee, 2=18% GST
      const convFeeB = feeTypeB === 1 ? Math.round(prepaid * 0.03 * 100) / 100 : 0;
      const gstFeeB  = feeTypeB === 2 ? Math.round(prepaid * 0.18 * 100) / 100 : 0;
      const totalFeeB = convFeeB + gstFeeB;
      const totalWithFeeB = Math.round((prepaid + totalFeeB) * 100) / 100;
      tableHTML += `<tr><td colspan="2" style="padding:0;"></td></tr>`; // spacer

      // Build the subtotal card inline (appended as a section below the table)
      const intlSubtotalCardB = `<div style="margin-top:10px; padding:12px; background:#f8fafc; border-radius:6px; border:1px solid #e0f2fe; text-align:right;">
        <div style="font-size:0.8rem; color:#64748b;">Subtotal: <strong>$${prepaid.toFixed(2)}</strong></div>
        ${feeTypeB === 1 ? `<div style="font-size:0.8rem; color:#64748b; margin-top:2px;">Convenience Fee (3%): $${convFeeB.toFixed(2)}</div>` : ''}
        ${feeTypeB === 2 ? `<div style="font-size:0.8rem; color:#64748b; margin-top:2px;">GST (18%): $${gstFeeB.toFixed(2)}</div>` : ''}
        ${feeTypeB > 0 ? `<div style="font-size:0.95rem; font-weight:700; color:#0284c7; margin-top:4px; padding-top:4px; border-top:1px solid #e2e8f0;">Total: $${totalWithFeeB.toFixed(2)}</div>` : ''}
      </div>`;

      // Inject subtotal card as a trailing element (stored for allSectionsHTML)
      item._intlSubtotalCardB = intlSubtotalCardB;

    } else if (sk.startsWith('startup_')) {
      // ── Startup Plan: all rows shown as complimentary ────────
      tableHTML += `<tr><td colspan="2" style="padding:8px 14px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-weight:700; font-size:0.88rem; border-radius:4px 4px 0 0;">
        🌱  Complimentary Startup Bundle - ₹0 to client
      </td></tr>`;
      fields.forEach(f => {
        const val = item.values[f.id] ?? f.value;
        let displayVal = val;
        if (f.type === 'boolean') {
          displayVal = val === 1 ? 'Yes' : 'No';
        }
        tableHTML += `<tr style="background:#f0fdf4;">
          <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0; width:45%;">${sanitize(cleanLabel(f.label))}</td>
          <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0;">${f.waived ? '<span style="color:#16a34a;font-weight:600;">Waived</span>' : `<strong>${displayVal}</strong>`}</td>
        </tr>`;
        if (f.id === 'human_handoff' && val === 1) {
          tableHTML += `<tr style="background:#f0fdf4;">
            <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0; width:45%;">Human Handoff Calling Rate</td>
            <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0;"><strong>${fmtPaise(getSafeNum('outgoing'))}</strong></td>
          </tr>`;
        }
      });
      tableHTML += `<tr style="background:#dcfce7;"><td style="padding:8px 14px; font-size:0.85rem; font-weight:700; color:#15803d;">Total Cost to Client</td>
        <td style="padding:8px 14px; font-size:0.9rem; font-weight:700; color:#15803d;">Complimentary (₹0)</td></tr>`;

    } else {
      fields.forEach(f => {
        if (f.note === 'SMS Add-on' && !showSms) return;
        if (f.note === 'WA Add-on'  && !showWa)  return;
        if (f.note === 'CT Add-on'  && !showCt)  return;
        const val = item.values[f.id] ?? f.value;
        tableHTML += stdRow(cleanLabel(f.label), f.waived ? null : val, f.waived === true);
      });
    }


    if (!isFirstSec) tableHTML += '</tbody>';

    const months = parseFloat(item.values['num_months'] ?? item.values['validity'] ?? 1);
    const credits = getSafeNum('credits');
    let rental = getSafeNum('rental');
    const rentalF = fields.find(x => x.id === 'rental');
    // voice_exotel_std rental is always a one-time flat fee in the subtotal (not × months)
    const isRentalOneTime = item.values['rental_onetime'] === 1 || item.sku_key === 'voice_exotel_std';
    if (rentalF && rentalF.type === 'rental_toggle' && !isRentalOneTime) {
      rental = rental * months;
    } else if (rentalF && rentalF.label.toLowerCase().includes('/month')) {
      rental = rental * months;
    }
    const brand = getSafeNum('brand_fee');
    const procure = getSafeNum('procurement');
    const setup = getSafeNum('setup');
    const isVoicebotItem = item.sku_key === 'voice_exotel_voicebot';
    const freeChsItem = isVoicebotItem ? 5 : 0;
    const paidChsItem = Math.max(0, parseFloat(item.values['num_channels'] ?? (isVoicebotItem ? 5 : 0)) - freeChsItem);
    const chCostItem = getSafeNum('channel_cost') * paidChsItem * months;
    const numUsersItem = parseFloat(item.values['num_users'] ?? 0);
    const userChargeItem = getSafeNum('user_charge');
    const numNumbersItem = parseFloat(item.values['num_numbers'] ?? 1);
    const numberCostItem = getSafeNum('number_cost') * numNumbersItem * months;

    let subtotal = credits + rental + brand + procure + setup + chCostItem + numberCostItem;
    if (item.sku_key === 'voice_veeno_std') {
      const useExotelModel = item.values['user_model_exotel'] === 1;
      if (useExotelModel) {
        const exoFree = parseFloat(item.values['exotel_free_users'] ?? 6) || 6;
        const exoCharge = parseFloat(item.values['exotel_user_charge'] ?? 199) || 199;
        const charged = Math.max(0, numUsersItem - exoFree);
        if (charged > 0) subtotal += charged * exoCharge * months;
      } else {
        if (numUsersItem && userChargeItem) subtotal += numUsersItem * userChargeItem * months;
      }
    } else {
      if (numUsersItem && userChargeItem) subtotal += numUsersItem * userChargeItem * months;
    }
    const numPaidNumsItem = parseFloat(item.values['num_paid_numbers'] ?? 0);
    const extraNumCostItem = getSafeNum('extra_number');
    if (numPaidNumsItem && extraNumCostItem) subtotal += numPaidNumsItem * extraNumCostItem * (months + (getSafeNum('extra_validity') || 0));
    const didNumbersItem = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNumbersItem > 0) subtotal += didNumbersItem * (parseFloat(item.values['did_cost']) || 1500) * months;

    grandSubtotal += isStartup ? 0 : subtotal;

    const tierLabel = sku.hasTiers && item.tier
      ? ' - ' + (item.customName || TIER_DISPLAY_NAMES[item.tier] || (item.tier.charAt(0).toUpperCase() + item.tier.slice(1)))
      : '';
    const sectionTitle = (!sku.hasTiers && item.customName) ? item.customName : `${sku.label}${tierLabel}`;

    allSectionsHTML += `
    <div class="quote-doc-section sku-card" style="margin-top:24px;">
      <div class="quote-doc-section-title" style="font-size:1.05rem; background:#f0f9ff; padding:10px 14px; border-radius:6px; margin-bottom:12px; border-left:4px solid #0284c7;">
        ${sanitize(sectionTitle)}
      </div>
      <table class="quote-sku-table">
        <thead><tr><th style="width: 45%;">Component</th><th>Details</th></tr></thead>
        ${tableHTML}
      </table>
      ${sk === 'voice_intl' ? (item._intlSubtotalCardB || '') : (subtotal > 0 ? `<div style="text-align:right; font-weight:600; padding:10px 14px; font-size:0.88rem; color:#0f172a; border-top:1px solid #f1f5f9;">Item Subtotal: ${fmtRupee(subtotal)}</div>` : '')}
    </div>`;
  }

  return { allSectionsHTML, grandSubtotal };
}


function updatePreview() {
  if (QG.currentSku === 'startup') window.updateStartupBudget();
  const doc = document.getElementById('quote-document');
  if (!doc) return;
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) {
    doc.innerHTML = `<div class="q-empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><h3>Preview will appear here</h3><p>Select a SKU and fill in client details.</p></div>`;
    return;
  }

  const firstSkuObj = SKUS.find(s => s.key === validItems[0].sku_key);
  const firstSku = { ...firstSkuObj };

  // Dynamic entity override for streaming/voicebot SKUs if they have Mobile DID numbers
  let effectiveEntity = firstSku.entity;
  const isStreamSku = ['voice_exotel_stream', 'startup_stream', 'voice_exotel_voicebot'].includes(validItems[0].sku_key);
  if (isStreamSku) {
    const item = validItems[0];
    const didNums = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNums > 0) {
      effectiveEntity = 'Veeno';
    } else {
      effectiveEntity = 'Exotel';
    }
  }
  firstSku.entity = effectiveEntity;
  const logoSrc = firstSku.entity === 'Veeno' ? '/veeno-logo.png' : '/exotel-logo.png';
  const company = document.getElementById('q-client-company')?.value || 'Client Company';
  const contact = document.getElementById('q-client-contact')?.value || '';
  const clientEmail = document.getElementById('q-client-email')?.value || '';
  const clientPhone = document.getElementById('q-client-phone')?.value || '';
  const tenantId = document.getElementById('q-client-tenantid')?.value || '';
  const seName = document.getElementById('q-se-name')?.textContent || '';
  const seEmail = document.getElementById('q-se-email')?.textContent || '';
  const sePhone = (document.getElementById('q-se-phone-text')?.textContent || '').replace(/—/g, '').trim()
                   || document.getElementById('q-se-phone')?.value || '';
  const quoteNum = document.getElementById('q-quote-number')?.textContent || '';
  const dateStr = document.getElementById('q-date')?.textContent || today();

  const introMap = {
    'Exotel': 'Exotel is a cloud-based customer engagement platform enabling enterprises to build secure, scalable communication ecosystems. Our solutions unify Voice, SMS, WhatsApp, Voicebots, Streaming, Enterprise Contact Center, RCS, AI-powered automation, and Truecaller on a single platform.',
    'Veeno': 'Veeno provides a comprehensive, fully IP-based contact center solution designed for modern enterprises. Our platform enables teams to manage all customer interactions efficiently through a unified, cloud-native interface.'
  };

  // ── Compare Mode: side-by-side tier comparison table ─────────────────────
  const userBasedCompareSkus = ['voice_exotel_user', 'voice_veeno_user', 'voice_veeno_std'];
  const isUserCompare = QG.compareMode && validItems.length >= 2 &&
    validItems.every(i => i.sku_key === validItems[0].sku_key) &&
    userBasedCompareSkus.includes(validItems[0].sku_key);

  const isCompareTiers = !isUserCompare && QG.compareMode && validItems.length >= 2 &&
    validItems.every(i => i.sku_key === validItems[0].sku_key) &&
    ['voice_exotel_std', 'sip_veeno', 'voice_exotel_stream', 'voice_exotel_voicebot'].includes(validItems[0].sku_key);

  // ── User-based comparison (side-by-side configs) ─────────────────────────
  if (isUserCompare) {
    const skuDef = SKUS.find(s => s.key === validItems[0].sku_key);
    const fmtR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    const W = `<span class="waived-text">✓ Waived</span>`;

    const colData = validItems.map(item => {
      const fields = getSkuFields(item.sku_key, item.tier);
      const getVal = (id) => { const f = fields.find(x => x.id === id); if (!f) return undefined; return item.values[id] ?? f.value; };
      const getSN = (id) => { const f = fields.find(x => x.id === id); if (!f || f.waived) return 0; return parseFloat(item.values[id] ?? f.value ?? 0); };
      return { item, fields, getVal, getSN };
    });

    const cmpRow = (label, vals, isSection = false) => {
      if (isSection) return `<tr class="section-header-row"><td colspan="${validItems.length + 1}">${label}</td></tr>`;
      return `<tr><td class="sku-row-name">${sanitize(label)}</td>${vals.map(v => `<td>${typeof v === 'string' && /^</.test(v) ? v : sanitize(String(v ?? '-'))}</td>`).join('')}</tr>`;
    };

    const subtotals = colData.map(({ item, getVal, getSN }) => {
      const u = getSN('num_users'), m = getSN('num_months'), c = getSN('user_charge');
      const nums = getSN('num_paid_numbers') * getSN('extra_number') * m;
      const did = (getSN('did_numbers') || 0) * (getSN('did_cost') || 1500) * m;
      return getSN('credits') + (u * m * c) + nums + did;
    });

    const optionLabels = validItems.map((item, i) => item.customName || `Option ${String.fromCharCode(65 + i)}`);

    // Recalculate subtotals without call credits (user SKU has no call credits)
    const userSubtotals = colData.map(({ getSN }) => {
      const u = getSN('num_users'), m = getSN('num_months'), c = getSN('user_charge');
      const nums = getSN('num_paid_numbers') * getSN('extra_number') * m;
      const did = (getSN('did_numbers') || 0) * (getSN('did_cost') || 1500) * m;
      return (u * m * c) + nums + did;
    });

    const FREE_CMP = `<span style="color:#16a34a;font-weight:600;">✓ Free</span>`;
    const W_CMP = `<span style="color:#16a34a;font-weight:600;">✓ Waived</span>`;
    let uRows = '';
    const allSku0 = validItems[0].sku_key;

    const cmpIndRow = (label, vals) =>
      `<tr class="sub-row"><td>${sanitize(label)}</td>${vals.map(v => `<td>${typeof v === 'string' && /^</.test(v) ? v : sanitize(String(v ?? ''))}</td>`).join('')}</tr>`;

    if (allSku0 === 'voice_veeno_std') {
      // ── Veeno STD side-by-side comparison ─────────────────────
      uRows += cmpRow('Plan Details', [], true);
      uRows += cmpRow('Validity', colData.map(({ getVal }) => getVal('validity') + ' Months'));
      uRows += cmpRow('Account Rental', colData.map(({ getSN }) => { const r = getSN('rental'); return r === 0 ? W_CMP : fmtR(r) + '/month'; }));
      uRows += cmpIndRow('Calculation', colData.map(({ getSN, getVal }) => {
        const r = getSN('rental'), v = parseFloat(getVal('validity')) || 0;
        return `${fmtR(r)}/month × ${v} months = ${fmtR(r * v)}`;
      }));
      uRows += cmpRow('Setup Charges', colData.map(() => W_CMP));
      uRows += cmpRow('CPM', colData.map(() => '200 Calls/Min (Additional Chargeable)'));
      uRows += cmpRow('User Plan', [], true);
      uRows += cmpRow('No. of Users', colData.map(({ getVal }) => getVal('num_users') + ' Users'));
      uRows += cmpRow('User Charge', colData.map(({ getSN }) => fmtR(getSN('user_charge')) + '/user/month'));
      uRows += cmpIndRow('Calculation', colData.map(({ getSN, getVal }) => {
        const u = getSN('num_users'), v = parseFloat(getVal('validity')) || 0, c = getSN('user_charge');
        return `${u} users × ${v} months × ${fmtR(c)} = ${fmtR(u*v*c)}`;
      }));
      uRows += cmpRow('Number Plan', [], true);
      uRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers') + ' (Free)'));
      const anyPaidV = colData.some(({ getSN }) => getSN('num_paid_numbers') > 0);
      if (anyPaidV) {
        uRows += cmpRow('Extra Numbers', colData.map(({ getSN }) => { const p = getSN('num_paid_numbers'); return p > 0 ? `${p} Number(s)` : '—'; }));
        uRows += cmpIndRow('Calculation', colData.map(({ getSN, getVal }) => {
          const p = getSN('num_paid_numbers'), v = (parseFloat(getVal('validity')) || 0) + getSN('extra_validity'), c = getSN('extra_number');
          return p > 0 ? `${p} numbers × ${v} months × ${fmtR(c)} = ${fmtR(p*v*c)}` : '';
        }));
      }
      const anyDID = colData.some(({ getSN }) => getSN('did_numbers') > 0);
      if (anyDID) {
        uRows += cmpRow('Mobile DID Numbers', colData.map(({ getSN }) => { const d = getSN('did_numbers'); return d > 0 ? `${d} Mobile DID(s)` : '—'; }));
        uRows += cmpIndRow('Calculation', colData.map(({ getSN, getVal }) => {
          const d = getSN('did_numbers'), v = parseFloat(getVal('validity')) || 0;
          return d > 0 ? `${d} Mobile DIDs × ${v} months × ${fmtR(getSN('did_cost') || 1500)} = ${fmtR(d*v*(getSN('did_cost')||1500))}` : '';
        }));
      }
      uRows += cmpRow('Call Credits & Charges', [], true);
      uRows += cmpRow('Call Credits', colData.map(({ getSN }) => fmtR(getSN('credits'))));
      uRows += cmpRow('Incoming Call Charges', colData.map(({ getSN }) => { const inc = getSN('incoming'); return inc === 0 ? FREE_CMP : inc + 'p/min'; }));
      uRows += cmpRow('Outgoing Call Charges', colData.map(({ getSN }) => { const out = getSN('outgoing'); return out >= 100 ? '₹' + (out/100).toFixed(2) + '/min' : out + 'p/min'; }));
      const veenoSubs = colData.map(({ getSN, getVal }) => {
        const u = getSN('num_users'), v = parseFloat(getVal('validity')) || 0, c = getSN('user_charge');
        const r = getSN('rental') * v;
        const nums = getSN('num_paid_numbers') * getSN('extra_number') * (v + getSN('extra_validity'));
        const did = getSN('did_numbers') * (getSN('did_cost') || 1500) * v;
        return getSN('credits') + r + (u * v * c) + nums + did;
      });
      uRows += `<tr style="border-top:2px solid #0284c7;"><td style="font-weight:700;">Subtotal (excl. GST)</td>${veenoSubs.map(s => `<td style="font-weight:700;color:#0284c7;">${fmtR(s)}</td>`).join('')}</tr>`;
      uRows += `<tr><td style="color:#64748b;">GST @ 18%</td>${veenoSubs.map(s => `<td style="color:#64748b;">${fmtR(Math.round(s*0.18))}</td>`).join('')}</tr>`;
      uRows += `<tr style="background:#f0f9ff;"><td style="font-weight:800;color:#0284c7;">Total (incl. GST)</td>${veenoSubs.map(s => `<td style="font-weight:800;color:#0284c7;">${fmtR(Math.round(s*1.18))}</td>`).join('')}</tr>`;

    } else {
      // ── Exotel User / Veeno User side-by-side comparison ──────
      uRows += cmpRow('Plan Details', [], true);
      uRows += cmpRow('Account Rental', colData.map(() => W_CMP));
      uRows += cmpRow('Setup Charges', colData.map(() => W_CMP));
      uRows += cmpRow('CPM', colData.map(() => '200 Calls/Min (Additional Chargeable)'));
      uRows += cmpRow('User Plan', [], true);
      uRows += cmpRow('No. of Users', colData.map(({ getVal }) => getVal('num_users') + ' Users'));
      uRows += cmpRow('No. of Months', colData.map(({ getVal }) => getVal('num_months') + ' Months'));
      uRows += cmpRow('User Charge', colData.map(({ getSN }) => fmtR(getSN('user_charge')) + '/user/month'));
      uRows += cmpIndRow('Calculation', colData.map(({ getSN }) => {
        const u = getSN('num_users'), m = getSN('num_months'), c = getSN('user_charge');
        return `${u} users × ${m} months × ${fmtR(c)} = ${fmtR(u*m*c)}`;
      }));
      uRows += cmpRow('Number Plan', [], true);
      uRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers') + ' (Free)'));
      const anyPaidNums = colData.some(({ getSN }) => getSN('num_paid_numbers') > 0);
      if (anyPaidNums) {
        uRows += cmpRow('Extra Numbers', colData.map(({ getSN }) => { const p = getSN('num_paid_numbers'); return p > 0 ? `${p} Number(s)` : '—'; }));
        uRows += cmpIndRow('Calculation', colData.map(({ getSN }) => {
          const p = getSN('num_paid_numbers'), m = getSN('num_months') + getSN('extra_validity'), c = getSN('extra_number');
          return p > 0 ? `${p} numbers × ${m} months × ${fmtR(c)} = ${fmtR(p*m*c)}` : '';
        }));
      }
      const anyDIDu = colData.some(({ getSN }) => getSN('did_numbers') > 0);
      if (anyDIDu) {
        uRows += cmpRow('Mobile DID Numbers', colData.map(({ getSN }) => { const d = getSN('did_numbers'); return d > 0 ? `${d} Mobile DID(s)` : '—'; }));
        uRows += cmpIndRow('Calculation', colData.map(({ getSN }) => {
          const d = getSN('did_numbers'), m = getSN('num_months');
          return d > 0 ? `${d} Mobile DIDs × ${m} months × ${fmtR(getSN('did_cost') || 1500)} = ${fmtR(d*m*(getSN('did_cost')||1500))}` : '';
        }));
      }
      const userSubs = colData.map(({ getSN }) => {
        const u = getSN('num_users'), m = getSN('num_months'), c = getSN('user_charge');
        const nums = getSN('num_paid_numbers') * getSN('extra_number') * (m + getSN('extra_validity'));
        const did = getSN('did_numbers') * (getSN('did_cost') || 1500) * m;
        return (u * m * c) + nums + did;
      });
      uRows += `<tr style="border-top:2px solid #0284c7;"><td style="font-weight:700;">Subtotal (excl. GST)</td>${userSubs.map(s => `<td style="font-weight:700;color:#0284c7;">${fmtR(s)}</td>`).join('')}</tr>`;
      uRows += `<tr><td style="color:#64748b;">GST @ 18%</td>${userSubs.map(s => `<td style="color:#64748b;">${fmtR(Math.round(s*0.18))}</td>`).join('')}</tr>`;
      uRows += `<tr style="background:#f0f9ff;"><td style="font-weight:800;color:#0284c7;">Total (incl. GST)</td>${userSubs.map(s => `<td style="font-weight:800;color:#0284c7;">${fmtR(Math.round(s*1.18))}</td>`).join('')}</tr>`;
    }

    // Now build the shared doc.innerHTML (used by both paths)
    doc.innerHTML = `<table class="print-master-table"><thead><tr><td><div class="print-master-header"></div></td></tr></thead><tbody><tr><td>
    <div class="quote-doc-header">
      <img src="${logoSrc}" class="quote-doc-logo ${firstSku.entity.toLowerCase()}-logo" alt="${firstSku.entity}">
      <div class="quote-doc-meta">
        <div class="quote-number-badge">${sanitize(quoteNum)}</div>
        <div style="margin-top:4px;">Date: ${sanitize(dateStr)}</div>
        <div style="margin-top:2px;font-weight:600;color:#0284c7;">${firstSku.entity}</div>
      </div>
    </div>
    <div class="quote-doc-title">Commercial Proposal: ${validItems[0].sku_key === 'voice_veeno_std' ? 'Veeno Voice STD' : 'User Plan'} Comparison</div>
    <div class="quote-doc-section" style="margin-top:16px;margin-bottom:4px;">
      <div class="quote-doc-section-title">Parties</div>
      <div class="quote-participant-grid">
        <div class="quote-participant-box"><div class="label">Prepared By (${firstSku.entity})</div><div class="value">${sanitize(seName || firstSku.entity + ' Sales')}</div><div class="sub">${sanitize(seEmail)}</div>${sePhone ? `<div class="sub">${sanitize(sePhone)}</div>` : ''}</div>
        <div class="quote-participant-box"><div class="label">Prepared For (Client)</div><div class="value">${sanitize(company)}</div>${contact ? `<div class="sub">${sanitize(contact)}</div>` : ''} ${clientEmail ? `<div class="sub">${sanitize(clientEmail)}</div>` : ''} ${clientPhone ? `<div class="sub">${sanitize(clientPhone)}</div>` : ''} ${tenantId ? `<div class="sub" style="color:#0284c7;font-weight:600;">Tenant ID: ${sanitize(tenantId)}</div>` : ''}</div>
      </div>
    </div>
    <div class="quote-doc-section" style="margin-top:24px;">
      <div style="overflow-x:auto;">
      <table class="quote-sku-table" style="table-layout:auto;">
        <thead><tr>
          <th style="width:32%;background:#0f172a;color:#fff;">Component</th>
          ${optionLabels.map((l,i) => `<th style="background:${i===0?'#0284c7':'#0369a1'};color:#fff;text-align:center;">${l}</th>`).join('')}
        </tr></thead>
        <tbody>${uRows}</tbody>
      </table></div>
    </div>
    <div class="quote-doc-section" style="margin-top:30px;">
      <div class="quote-doc-section-title">Terms &amp; Conditions</div>
      <div class="quote-tnc" style="font-size:0.85rem;color:#475569;line-height:1.5;">${generateTncHtml(validItems, firstSku.entity)}</div>
    </div>
    </td></tr></tbody><tfoot><tr><td><div class="print-master-footer"></div></td></tr></tfoot></table>`;
    return;
  }
  // ── End User Compare Mode ──────────────────────────────────────────────────

  if (isCompareTiers) {
    const skuKey0 = validItems[0].sku_key;
    const sku0 = SKUS.find(s => s.key === skuKey0);
    const isNonTierSku = skuKey0 === 'voice_exotel_stream' || skuKey0 === 'voice_exotel_voicebot';
    // For non-tier SKUs use item index as key; for tier SKUs use the tier string
    const tiers = isNonTierSku
      ? validItems.map((_, idx) => String(idx))
      : validItems.map(i => i.tier);
    const tierLabels = isNonTierSku
      ? Object.fromEntries(validItems.map((item, idx) => [String(idx), item.customName || `Option ${String.fromCharCode(65 + idx)}`]))
      : Object.fromEntries(tiers.map(t => [t, (QG.skuItems.find(i=>i.tier===t)?.customName) || TIER_DISPLAY_NAMES[t] || (t.charAt(0).toUpperCase()+t.slice(1))]));
    void 0; // (tierLabels defined above)
    const fmtR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    const fmtP = (v, pulse = 60) => {
      if (v === null || v === undefined) return '-';
      const n = parseFloat(v); if (isNaN(n)) return String(v);
      if (n >= 100) return '₹' + (n / 100).toFixed(2) + '/' + (pulse === 60 ? 'min' : pulse + 'secs');
      return pulse === 60 ? n + 'p/min' : n + `p/${pulse}secs`;
    };
    const fmtMsg = (v) => {
      if (v === null || v === undefined) return '-';
      const n = parseFloat(v); if (isNaN(n)) return String(v);
      return n >= 100 ? '₹' + (n / 100).toFixed(2) + '/msg' : n + 'p/msg';
    };
    const TICK = '<svg width="11" height="11" viewBox="0 0 12 12" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="1,6 4,10 11,2" style="fill:none;stroke:#16a34a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/></svg>';
    const W = `<span class="waived-text">${TICK} Waived</span>`;
    const FREE = `<span class="waived-text">${TICK} Free</span>`;
    const perUnit = (text) => `<span style="color:#94a3b8;font-size:0.8em;">${text}</span>`;

    // Build row data per item
    const colData = validItems.map(item => {
      const fields = getSkuFields(item.sku_key, item.tier);
      const getVal = (id) => { const f = fields.find(x => x.id === id); if (!f) return undefined; return item.values[id] ?? f.value; };
      const getSN = (id) => { const f = fields.find(x => x.id === id); if (!f || f.waived) return 0; return parseFloat(item.values[id] ?? f.value ?? 0); };
      return { item, fields, getVal, getSN };
    });

    // Calc subtotals per tier
    const subtotals = colData.map(({ item, fields, getVal, getSN }) => {
      const months = parseFloat(getVal('num_months') ?? getVal('validity') ?? 1);
      const credits = getSN('credits');
      let rental = getSN('rental');
      const rentalF = fields.find(x => x.id === 'rental');
      if (rentalF && rentalF.label.toLowerCase().includes('/month')) rental = rental * months;
      const brand = getSN('brand_fee');
      const procure = getSN('procurement');
      const setup = getSN('setup');
      const chCost = getSN('channel_cost') * parseFloat(item.values['num_channels'] ?? 0) * months;
      const numUsers = parseFloat(item.values['num_users'] ?? 0);
      const userCharge = getSN('user_charge');
      const numNumbers = parseFloat(item.values['num_numbers'] ?? 1);
      const numberCost = getSN('number_cost') * numNumbers * months;
      let sub = credits + rental + brand + procure + setup + chCost + numberCost;
      if (numUsers && userCharge) sub += numUsers * userCharge * months;
      const numPaidNums = parseFloat(item.values['num_paid_numbers'] ?? 0);
      const extraNumCost = getSN('extra_number');
      const extraVal = parseFloat(item.values['extra_validity'] ?? 0);
      if (numPaidNums && extraNumCost) sub += numPaidNums * extraNumCost * (months + extraVal);
      const didNums = parseFloat(item.values['did_numbers'] ?? 0);
      if (didNums > 0) sub += didNums * (parseFloat(item.values['did_cost']) || 1500) * months;
      return sub;
    });
    const grandSub = subtotals.reduce((a, b) => a + b, 0);

    // Helper to build a comparison row
    const cmpRow = (label, vals, isSection = false, isSub = false) => {
      if (isSection) return `<tr class="section-header-row"><td colspan="${validItems.length + 1}">${label}</td></tr>`;
      const prefixSub = isSub ? '<span style="color:#94a3b8;font-size:0.75em;">└ </span>' : '';
      return `<tr ${isSub ? 'class="sub-row"' : ''}><td class="sku-row-name" ${isSub ? 'style="padding-left:20px;"' : ''}>${prefixSub}${sanitize(label)}</td>${vals.map(v => `<td>${hasHTML(v) ? v : sanitize(String(v ?? '-'))}</td>`).join('')}</tr>`;
    };
    const hasHTML = (s) => typeof s === 'string' && /<[a-zA-Z]/.test(s);

    let tableRows = '';

    if (skuKey0 === 'voice_exotel_std') {
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('Validity', colData.map(({ getVal, item }) => {
        const base = parseFloat(getVal('validity') ?? 0);
        const extra = parseFloat(item.values['extra_validity'] ?? 0);
        return extra > 0 ? `${base} + ${extra} Months` : `${base} Months`;
      }));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('CPM', colData.map(() => '200 Calls/Min (Additional Chargeable)'));
      tableRows += cmpRow('Plan', [], true);
      tableRows += cmpRow('Free Users', colData.map(({ getVal, item }) => { const fu = getVal('free_users'); const fuEx = parseFloat(item.values['extra_users'] ?? 0); return (fu === null || fu === 'Unlimited') ? 'Unlimited' : (fuEx > 0 ? `${fu} + ${fuEx} Users (Free)` : fu + ' Users (Free)'); }));
      tableRows += cmpRow('Extra User Cost', colData.map(({ getSN }) => fmtR(getSN('extra_user_cost')) + perUnit('/user/month')), false, true);
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(({ getSN }) => fmtR(getSN('extra_number')) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN, item }) => {
        const base = getSN('credits');
        const extra = parseFloat(item.values['extra_credits'] ?? 0);
        return extra > 0 ? `${fmtR(base)} + ${fmtR(extra)}` : fmtR(base);
      }));
      tableRows += cmpRow('Incoming Call Charges', colData.map(({ getSN, getVal }) => fmtP(getSN('incoming'), parseFloat(getVal('pulse')) || 60)));
      tableRows += cmpRow('Outgoing Call Charges', colData.map(({ getSN, getVal }) => fmtP(getSN('outgoing'), parseFloat(getVal('pulse')) || 60)));

      // Messaging Services (Add-ons) - only shown if explicitly opted in by the user
      const hasSms = colData.some(({ item }) => item.smsAddon === true);
      const hasWa  = colData.some(({ item }) => item.waAddon  === true);
      if (hasSms || hasWa) {
        tableRows += cmpRow('Messaging Services', [], true);
        if (hasSms) {
          tableRows += cmpRow('SMS Cost', colData.map(({ item }) =>
            item.smsAddon ? fmtMsg(item.values['sms_cost']) : '<span style="color:#94a3b8;">-</span>'
          ));
        }
        if (hasWa) {
          tableRows += cmpRow('WhatsApp Utility Messages', colData.map(({ item }) =>
            item.waAddon ? fmtMsg(item.values['wa_utility']) : '<span style="color:#94a3b8;">-</span>'
          ));
          tableRows += cmpRow('WhatsApp Promotional Messages', colData.map(({ item }) =>
            item.waAddon ? fmtMsg(item.values['wa_promo']) : '<span style="color:#94a3b8;">-</span>'
          ));
          tableRows += cmpRow('WhatsApp API Charge', colData.map(({ item }) =>
            item.waAddon ? fmtMsg(item.values['wa_api']) : '<span style="color:#94a3b8;">-</span>'
          ));
        }
      }
    } else if (skuKey0 === 'voice_veeno_std') {
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('Validity', colData.map(({ getVal, item }) => {
        const base = parseFloat(getVal('validity') ?? 0);
        const extra = parseFloat(item.values['extra_validity'] ?? 0);
        return extra > 0 ? `${base} + ${extra} Months` : `${base} Months`;
      }));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('CPM', colData.map(() => '200 Calls/Min (Additional Chargeable)'));
      tableRows += cmpRow('User Plan', [], true);
      tableRows += cmpRow('No. of Users', colData.map(({ getVal, item }) => { const nu = parseInt(getVal('num_users')) || 0; const eu = parseInt(item.values['extra_users'] ?? 0); return eu > 0 ? `${eu} Free, ${nu} Charged` : nu; }));
      tableRows += cmpRow('User Charge', colData.map(({ getSN }) => fmtR(getSN('user_charge')) + perUnit('/user/month')));
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(({ getSN }) => fmtR(getSN('extra_number')) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN, item }) => {
        const base = getSN('credits');
        const extra = parseFloat(item.values['extra_credits'] ?? 0);
        return extra > 0 ? `${fmtR(base)} + ${fmtR(extra)}` : fmtR(base);
      }));
      tableRows += cmpRow('Incoming Call Charges', colData.map(() => FREE));
      tableRows += cmpRow('Outgoing Call Charges', colData.map(({ getSN, getVal }) => fmtP(getSN('outgoing'), parseFloat(getVal('pulse')) || 60)));
    } else if (skuKey0 === 'sip_veeno') {
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('Validity', colData.map(({ getVal, item }) => {
        const base = parseFloat(getVal('validity') ?? 0);
        const extra = parseFloat(item.values['extra_validity'] ?? 0);
        return extra > 0 ? `${base} + ${extra} Months` : `${base} Months`;
      }));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('CPM', colData.map(() => '200 Calls/Min (Additional Chargeable)'));
      tableRows += cmpRow('User Plan', [], true);
      tableRows += cmpRow('Free Users', colData.map(({ getVal, item }) => { const fu = getVal('free_users'); const fuEx = parseFloat(item.values['extra_users'] ?? 0); return (fu === null || fu === 'Unlimited') ? 'Unlimited' : (fuEx > 0 ? `${fu} + ${fuEx} Users (Free)` : fu + ' Users (Free)'); }));
      tableRows += cmpRow('Extra User Cost', colData.map(() => fmtR(199) + perUnit('/user/month')), false, true);
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(() => fmtR(499) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN, item }) => {
        const base = getSN('credits');
        const extra = parseFloat(item.values['extra_credits'] ?? 0);
        return extra > 0 ? `${fmtR(base)} + ${fmtR(extra)}` : fmtR(base);
      }));
      tableRows += cmpRow('Incoming Call Charges', colData.map(({ getSN, getVal }) => fmtP(getSN('incoming'), parseFloat(getVal('pulse')) || 60)));
      tableRows += cmpRow('Outgoing Call Charges', colData.map(({ getSN, getVal }) => fmtP(getSN('outgoing'), parseFloat(getVal('pulse')) || 60)));
      tableRows += cmpRow('Attempt Charges', colData.map(({ getSN }) => {
        const a = getSN('attempt');
        return a === 0 ? FREE : (a >= 100 ? '₹' + (a/100).toFixed(2) + '/failed call' : a + 'p / failed call');
      }));
    } else if (skuKey0 === 'voice_exotel_stream' || skuKey0 === 'voice_exotel_voicebot') {
      const isVBotCmp = skuKey0 === 'voice_exotel_voicebot';
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('No. of Months', colData.map(({ getSN }) => getSN('num_months') + ' Months'));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => {
        const r = getSN('rental');
        return r === 0 ? W : fmtR(r) + perUnit('/month');
      }));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));

      tableRows += cmpRow(isVBotCmp ? 'Voicebot Channels' : 'Streaming Channels', [], true);
      tableRows += cmpRow('No. of Channels', colData.map(({ getSN }) => {
        const chs = getSN('num_channels');
        if (isVBotCmp) {
          const paid = Math.max(0, chs - 5);
          return paid > 0 ? `5 Free, ${paid} Paid` : `5 Channels (Free)`;
        }
        return chs;
      }));
      tableRows += cmpRow('Channel Cost', colData.map(({ getSN }) => fmtR(getSN('channel_cost')) + perUnit('/channel/month')));
      tableRows += cmpRow('Channel Calculation', colData.map(({ getSN }) => {
        const mos = getSN('num_months');
        const cost = getSN('channel_cost');
        const chs = getSN('num_channels');
        const paid = isVBotCmp ? Math.max(0, chs - 5) : chs;
        return `${paid} ch × ${mos} mo × ${fmtR(cost)} = ${fmtR(paid * mos * cost)}`;
      }), false, true);

      tableRows += cmpRow('User Plan', [], true);
      tableRows += cmpRow('Free Users', colData.map(({ getVal, item }) => {
        const fu = getVal('free_users');
        const fuEx = parseFloat(item.values['extra_users'] ?? 0);
        return (fu === null || fu === 'Unlimited') ? 'Unlimited (Included)' : (fuEx > 0 ? `${fu} + ${fuEx} Users (Free)` : fu + ' Users (Free)');
      }));
      tableRows += cmpRow('Extra User Cost', colData.map(({ getSN }) => fmtR(getSN('extra_user_cost')) + perUnit('/user/month')), false, true);

      tableRows += cmpRow('Number Plan', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => (getVal('free_numbers') ?? '-') + ' Number(s) (Free)'));
      tableRows += cmpRow('Extra Number Cost', colData.map(({ getSN }) => fmtR(getSN('extra_number')) + perUnit('/number/month')), false, true);
      const anyPaidStreamNums = colData.some(({ getSN }) => getSN('num_paid_numbers') > 0);
      if (anyPaidStreamNums) {
        tableRows += cmpRow('Extra Numbers', colData.map(({ getSN }) => { const p = getSN('num_paid_numbers'); return p > 0 ? `${p} Number(s)` : '—'; }));
        tableRows += cmpRow('Num. Calculation', colData.map(({ getSN }) => {
          const p = getSN('num_paid_numbers'), m = getSN('num_months') + (getSN('extra_validity') || 0), c = getSN('extra_number');
          return p > 0 ? `${p} × ${m} mo × ${fmtR(c)} = ${fmtR(p * m * c)}` : '';
        }), false, true);
      }

      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN, item }) => {
        const base = getSN('credits');
        const extra = parseFloat(item.values['extra_credits'] ?? 0);
        return extra > 0 ? `${fmtR(base)} + ${fmtR(extra)}` : fmtR(base);
      }));
      tableRows += cmpRow('Incoming Calls', colData.map(({ getSN, getVal }) => fmtP(getSN('incoming'), parseFloat(getVal('pulse')) || 60)));
      tableRows += cmpRow('Outgoing Calls', colData.map(({ getSN, getVal }) => fmtP(getSN('outgoing'), parseFloat(getVal('pulse')) || 60)));
      const hasAttempt = colData.some(({ getSN }) => getSN('attempt') > 0);
      if (hasAttempt) {
        tableRows += cmpRow('Attempt Charges', colData.map(({ getSN }) => {
          const a = getSN('attempt');
          return a === 0 ? FREE : (a >= 100 ? '₹' + (a/100).toFixed(2) + '/failed call' : a + 'p/failed call');
        }));
      }
    }


    // Totals row
    tableRows += `<tr style="border-top:2px solid #0284c7;"><td style="font-weight:700;color:#0f172a;">Subtotal (excl. GST)</td>${subtotals.map(s => `<td style="font-weight:700;color:#0284c7;">${fmtR(s)}</td>`).join('')}</tr>`;
    tableRows += `<tr><td style="color:#64748b;">GST @ 18%</td>${subtotals.map(s => `<td style="color:#64748b;">${fmtR(Math.round(s * 0.18))}</td>`).join('')}</tr>`;
    tableRows += `<tr style="background:#f0f9ff;"><td style="font-weight:800;color:#0284c7;">Total (incl. GST)</td>${subtotals.map(s => `<td style="font-weight:800;color:#0284c7;">${fmtR(Math.round(s * 1.18))}</td>`).join('')}</tr>`;

    doc.innerHTML = `
    <table class="print-master-table">
      <thead><tr><td><div class="print-master-header"></div></td></tr></thead>
      <tbody><tr><td>
      <div class="quote-doc-header">
        <img src="${logoSrc}" class="quote-doc-logo ${firstSku.entity.toLowerCase()}-logo" alt="${firstSku.entity} Logo"
          onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div style=\\'font-size:1.6rem;font-weight:800;color:#0284c7;\\'>${sanitize(firstSku.entity)}</div>')">
        <div class="quote-doc-meta">
          <div class="quote-number-badge">${sanitize(quoteNum)}</div>
          <div style="margin-top:4px;">Date: ${sanitize(dateStr)}</div>
          <div style="margin-top:2px;font-weight:600;color:#0284c7;">${firstSku.entity}</div>
        </div>
      </div>
      <div class="quote-doc-title">Commercial Proposal: Plan Comparison</div>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:18px;">Prepared For: ${sanitize(company)}</p>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Introduction</div>
        <div class="quote-intro-text">${introMap[firstSku.entity]}</div>
      </div>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Parties</div>
        <div class="quote-participant-grid">
          <div class="quote-participant-box"><div class="label">Prepared By (${firstSku.entity})</div><div class="value">${sanitize(seName || firstSku.entity + ' Sales')}</div><div class="sub">${sanitize(seEmail)}</div>${sePhone ? `<div class="sub">${sanitize(sePhone)}</div>` : ''}</div>
          <div class="quote-participant-box"><div class="label">Prepared For (Client)</div><div class="value">${sanitize(company)}</div>${contact ? `<div class="sub">${sanitize(contact)}</div>` : ''} ${clientEmail ? `<div class="sub">${sanitize(clientEmail)}</div>` : ''} ${clientPhone ? `<div class="sub">${sanitize(clientPhone)}</div>` : ''} ${tenantId ? `<div class="sub" style="color:#0284c7;font-weight:600;">Tenant ID: ${sanitize(tenantId)}</div>` : ''}</div>
        </div>
      </div>

      <div class="quote-doc-section" style="margin-top:24px;">
        <div class="quote-doc-section-title" style="font-size:1.05rem;background:#f0f9ff;padding:10px 14px;border-radius:6px;margin-bottom:16px;border-left:4px solid #0284c7;">
          ${sanitize(sku0.label)}: Side-by-Side Plan Comparison
        </div>
        <div style="overflow-x:auto;">
        <table class="quote-sku-table" style="table-layout:auto;">
          <thead>
            <tr>
              <th style="width:32%;background:#0f172a;color:#fff;">Component</th>
              ${tiers.map((t, tidx) => `<th style="background:${skuKey0 === 'voice_exotel_stream' || skuKey0 === 'voice_exotel_voicebot' ? (tidx === 0 ? '#0284c7' : tidx === 1 ? '#0369a1' : '#38bdf8') : (t === 'believer' ? '#0284c7' : t === 'influencer' ? '#0369a1' : '#38bdf8')};color:#fff;text-align:center;">${tierLabels[t] || t}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        </div>
      </div>

      <div class="quote-doc-section" style="margin-top:30px;">
        <div class="quote-doc-section-title">Terms &amp; Conditions</div>
        <div class="quote-tnc" style="font-size:0.85rem; color:#475569; line-height:1.5;">
          ${generateTncHtml(validItems, firstSku.entity)}
        </div>
      </div>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0f2fe;font-size:0.78rem;color:#94a3b8;text-align:center;">
        This is a system-generated commercial proposal. For queries, contact your ${firstSku.entity} account manager.
      </div>
      </td></tr></tbody>
      <tfoot><tr><td><div class="print-master-footer"></div></td></tr></tfoot>
    </table>
    `;
    return;
  }
  // ── End Compare Mode ──────────────────────────────────────────────────────

  // ── Bundle Compare Mode ─────────────────────────────────────────────────
  if (QG.bundleCompareMode) {
    const curBundle = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
    if (curBundle) { curBundle.skuItems = QG.skuItems; curBundle.activeItemId = QG.activeItemId; }

    const itemsA = QG.bundleA?.skuItems || [];
    const itemsB = QG.bundleB?.skuItems || [];
    const fmtR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

    // Compute human-readable labels for each bundle column (same logic as renderBundleTabSwitcher)
    const _bundleLabel = (items, fallback) => {
      const configured = items.filter(i => i.sku_key);
      if (configured.length === 0) return fallback;
      if (configured.length === 1) {
        const item = configured[0];
        const sku = SKUS.find(s => s.key === item.sku_key);
        const skuName = item.customName || sku?.label || item.sku_key;
        const tier = item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : '';
        return tier ? `${skuName} · ${tier}` : skuName;
      }
      return `${fallback} (${configured.length} SKUs)`;
    };
    const labelA = _bundleLabel(itemsA, 'Option A');
    const labelB = _bundleLabel(itemsB, 'Option B');

    const resultA = _renderBundleItemsHTML(itemsA);
    const resultB = _renderBundleItemsHTML(itemsB);
    const gstA = Math.round(resultA.grandSubtotal * 0.18);
    const totalA = resultA.grandSubtotal + gstA;
    const gstB = Math.round(resultB.grandSubtotal * 0.18);
    const totalB = resultB.grandSubtotal + gstB;
    const hasA = itemsA.filter(i => i.sku_key).length > 0;
    const hasB = itemsB.filter(i => i.sku_key).length > 0;

    const emptyMsg = (label) => `<div style="text-align:center;color:#94a3b8;font-style:italic;padding:40px 20px;border:1.5px dashed #e2e8f0;border-radius:10px;margin-top:24px;background:#fafbfc;">No SKUs in ${label} yet — switch to this option and add SKUs</div>`;

    doc.innerHTML = `
    <table class="print-master-table">
      <thead><tr><td><div class="print-master-header"></div></td></tr></thead>
      <tbody><tr><td>
      <div class="quote-doc-header">
        <img src="${logoSrc}" class="quote-doc-logo ${firstSku.entity.toLowerCase()}-logo" alt="${firstSku.entity} Logo" onerror="this.style.display='none'">
        <div class="quote-doc-meta">
          <div class="quote-number-badge">${sanitize(quoteNum)}</div>
          <div style="margin-top:4px;">Date: ${sanitize(dateStr)}</div>
          <div style="margin-top:2px;font-weight:600;color:#0284c7;">${firstSku.entity}</div>
        </div>
      </div>
      <div class="quote-doc-title">Commercial Proposal: Bundle Comparison</div>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:18px;">Prepared For: ${sanitize(company)}</p>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Introduction</div>
        <div class="quote-intro-text">${introMap[firstSku.entity]}</div>
      </div>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Parties</div>
        <div class="quote-participant-grid">
          <div class="quote-participant-box">
            <div class="label">Prepared By (${firstSku.entity})</div>
            <div class="value">${sanitize(seName || firstSku.entity + ' Sales')}</div>
            <div class="sub">${sanitize(seEmail)}</div>
            ${sePhone ? `<div class="sub">${sanitize(sePhone)}</div>` : ''}
          </div>
          <div class="quote-participant-box">
            <div class="label">Prepared For (Client)</div>
            <div class="value">${sanitize(company)}</div>
            ${contact ? `<div class="sub">${sanitize(contact)}</div>` : ''}
            ${clientEmail ? `<div class="sub">${sanitize(clientEmail)}</div>` : ''}
            ${clientPhone ? `<div class="sub">${sanitize(clientPhone)}</div>` : ''}
            ${tenantId ? `<div class="sub" style="color:#0284c7;font-weight:600;">Tenant ID: ${sanitize(tenantId)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="quote-doc-section" style="margin-top:24px;">
        <div class="quote-doc-section-title" style="margin-bottom:18px;">Comparative Packages</div>
        <div class="bundle-compare-container">
          <div class="bundle-col">
            <div>${hasA ? resultA.allSectionsHTML : emptyMsg(labelA)}</div>
            ${hasA ? `<div class="bundle-subtotal-card" style="border-color:#bae6fd;page-break-inside:avoid;break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;font-size:0.87rem;color:#475569;margin-bottom:5px;"><span>Subtotal (excl. GST)</span><strong>${fmtR(resultA.grandSubtotal)}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:0.87rem;color:#64748b;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #cbd5e1;"><span>GST @ 18%</span><strong>${fmtR(gstA)}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;color:#0284c7;margin-top:8px;padding-top:8px;border-top:2px solid #0284c7;"><span>Total (incl. GST)</span><span>${fmtR(totalA)}</span></div>
            </div>` : ''}
          </div>
          <div class="bundle-compare-divider"><div class="bundle-compare-divider-badge">VS</div></div>
          <div class="bundle-col">
            <div>${hasB ? resultB.allSectionsHTML : emptyMsg(labelB)}</div>
            ${hasB ? `<div class="bundle-subtotal-card" style="border-color:#ede9fe;page-break-inside:avoid;break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;font-size:0.87rem;color:#475569;margin-bottom:5px;"><span>Subtotal (excl. GST)</span><strong>${fmtR(resultB.grandSubtotal)}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:0.87rem;color:#64748b;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #c4b5fd;"><span>GST @ 18%</span><strong>${fmtR(gstB)}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;color:#7c3aed;margin-top:8px;padding-top:8px;border-top:2px solid #7c3aed;"><span>Total (incl. GST)</span><span>${fmtR(totalB)}</span></div>
            </div>` : ''}
          </div>
        </div>
      </div>
      <div class="quote-doc-section" style="margin-top:30px;">
        <div class="quote-doc-section-title">Terms &amp; Conditions</div>
        <div class="quote-tnc" style="font-size:0.85rem;color:#475569;line-height:1.5;">
          ${generateTncHtml([...itemsA, ...itemsB].filter(i => i.sku_key), firstSku.entity)}
        </div>
      </div>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0f2fe;font-size:0.78rem;color:#94a3b8;text-align:center;">
        This is a system-generated commercial proposal. For queries, contact your ${firstSku.entity} account manager.
      </div>
      </td></tr></tbody>
      <tfoot><tr><td><div class="print-master-footer"></div></td></tr></tfoot>
    </table>`;
    return;
  }
  // ── End Bundle Compare Mode ────────────────────────────────────

  let allSectionsHTML = '';
  let grandSubtotal = 0;
  const perUnit = (text) => `<span style="color:#94a3b8;font-size:0.8em;">${text}</span>`;

  for (let idx = 0; idx < validItems.length; idx++) {
    const item = validItems[idx];
    const sku = SKUS.find(s => s.key === item.sku_key);
    const fields = getSkuFields(item.sku_key, item.tier);

    // Values explicitly from this item
    const getVal = (id) => {
      const f = fields.find(x => x.id === id);
      if (!f) return undefined;
      return item.values[id] ?? f.value;
    };
    const getSafeNum = (id) => {
      const f = fields.find(x => x.id === id);
      if (!f || f.waived) return 0;
      return parseFloat(item.values[id] ?? f.value ?? 0);
    };

    const fmtRupee = (v) => {
      if (v === null || v === undefined) return '-';
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    };
    const currentPulse = parseFloat(getVal('pulse')) || 60;
    const rateUnit = currentPulse === 60 ? 'p/min' : `p/${currentPulse}secs`;
    const fmtPaise = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/' + (currentPulse === 60 ? 'min' : currentPulse + 'secs');
      return num + ' ' + rateUnit;
    };
    const fmtPaiseMsg = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/msg';
      return num + 'p/msg';
    };

    const TICK = '<svg width="11" height="11" viewBox="0 0 12 12" style="display:inline;vertical-align:middle;margin-right:3px"><polyline points="1,6 4,10 11,2" style="fill:none;stroke:#16a34a;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/></svg>';
    const W = `<span class="waived-text">${TICK} Waived</span>`;
    const FREE = `<span class="waived-text">${TICK} Free</span>`;
    let isFirstSec = true;
    const hasHTML = (s) => typeof s === 'string' && /<[a-zA-Z]/.test(s);
    const secRow = (lbl) => {
      const res = (isFirstSec ? '' : '</tbody>') + `<tbody style="page-break-inside: avoid; break-inside: avoid;"><tr class="section-header-row"><td colspan="2">${lbl}</td></tr>`;
      isFirstSec = false;
      return res;
    };
    const stdRow = (lbl, val, isWaived) => {
      const disp = isWaived ? W : hasHTML(val) ? val : sanitize(String(val ?? '-'));
      return `<tr><td class="sku-row-name">${sanitize(lbl)}</td><td>${disp}</td></tr>`;
    };
    const indRow = (lbl, val) => {
      const disp = hasHTML(val) ? val : sanitize(String(val ?? '-'));
      return `<tr class="sub-row"><td>${sanitize(lbl)}</td><td>${disp}</td></tr>`;
    };

    let tableHTML = '';
    const sk = item.sku_key;

    // Startup plan mapping: render using parent SKU's format
    // If sk is 'startup', resolve via item.tier
    const resolvedStartupKey = sk === 'startup' ? ('startup_' + (item.tier || 'voice')) : sk;
    const isStartup = sk === 'startup' || !!STARTUP_PARENT_MAP[sk];
    const effectiveSk = STARTUP_PARENT_MAP[resolvedStartupKey] || (STARTUP_PARENT_MAP[sk]) || sk;

    const isEditingThisItem = (item.id === QG.activeItemId);
    const showSms = isEditingThisItem ? document.getElementById('toggle-sms-addon_' + QG.activeItemId)?.checked : (item.smsAddon === true);
    const showWa  = isEditingThisItem ? document.getElementById('toggle-wa-addon_'  + QG.activeItemId)?.checked : (item.waAddon  === true);
    const showCt  = isEditingThisItem ? document.getElementById('toggle-ct-addon_'  + QG.activeItemId)?.checked : (item.ctAddon  === true);

    // Startup banner header (renders before the SKU-format rows)
    if (effectiveSk === 'voice_exotel_std') {
      tableHTML += secRow('Plan Details');
      const baseValidityE = parseFloat(getVal('validity')) || 0;
      const extraValidityE = getSafeNum('extra_validity') || 0;
      tableHTML += stdRow('Validity', extraValidityE > 0 ? `${baseValidityE} + ${extraValidityE} months` : getVal('validity') + ' Months');
      const rentalStd = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalStd === 0 ? null : fmtRupee(rentalStd), rentalStd === 0);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const fu = getVal('free_users');
      const fuExtra = getSafeNum('extra_users') || 0;
      const fuDisplay = (fu === null || fu === 'Unlimited') ? 'Unlimited (Included)' : (fuExtra > 0 ? `${fu} + ${fuExtra} Users (Free)` : fu + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
      const paidNumsE = getSafeNum('num_paid_numbers') || 0;
      if (paidNumsE > 0) {
        const extNumCostE = getSafeNum('extra_number');
        const vMonthsE = (parseFloat(getVal('validity')) || 0) + (getSafeNum('extra_validity') || 0);
        tableHTML += stdRow('Extra Numbers', `${paidNumsE} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsE} numbers × ${vMonthsE} months × ${fmtRupee(extNumCostE)} = <strong>${fmtRupee(paidNumsE * vMonthsE * extNumCostE)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const baseCreditsE = getSafeNum('credits');
      const extraCreditsE = getSafeNum('extra_credits') || 0;
      const creditsDisplayE = extraCreditsE > 0
        ? `${fmtRupee(baseCreditsE)} + ${fmtRupee(extraCreditsE)}`
        : fmtRupee(baseCreditsE);
      tableHTML += stdRow('Call Credits', creditsDisplayE);
      tableHTML += stdRow('Incoming Call Charges', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Call Charges', fmtPaise(getSafeNum('outgoing')));
      if (showCt) tableHTML += stdRow('Call Transfer Add-on', `${fmtRupee(getSafeNum('call_transfer'))}/month`);

      if (showSms || showWa) {
        tableHTML += secRow('Messaging & Communication Services');
        if (showSms) tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));
        if (showWa) {
          tableHTML += stdRow('WhatsApp Utility Messages', fmtPaiseMsg(getVal('wa_utility')));
          tableHTML += stdRow('WhatsApp Promotional Messages', fmtPaiseMsg(getVal('wa_promo')));
          tableHTML += stdRow('WhatsApp API Charge', fmtPaiseMsg(getSafeNum('wa_api')));
        }
      }

      // ISD PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_isd_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/country-wise-isd-pricing.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>ISD Voice Rate Card - Country-wise Outbound Pricing</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }
    } else if (effectiveSk === 'voice_veeno_std') {
      const numUsers = getSafeNum('num_users') || 0;
      const uCharge = getSafeNum('user_charge') || 1000;
      const validity = parseFloat(getVal('validity')) || 0;
      const DID_COST = getSafeNum('did_cost') || 1500;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const rentalOneTime = item.values['rental_onetime'] === 1;
      const userModelExotel = getSafeNum('user_model_exotel') === 1;
      const exoFreeUsers = getSafeNum('exotel_free_users') || 6;
      const exoUserCharge = getSafeNum('exotel_user_charge') || 1999;
      const chargedUsers = Math.max(0, numUsers - (userModelExotel ? exoFreeUsers : 0));
      const totalUserCostV = userModelExotel
        ? chargedUsers * validity * exoUserCharge
        : numUsers * validity * uCharge;

      tableHTML += secRow('Plan Details');
      const extraValidityV = getSafeNum('extra_validity') || 0;
      tableHTML += stdRow('Validity', extraValidityV > 0 ? `${validity} + ${extraValidityV} months` : validity + ' Months');
      const rVal = getSafeNum('rental');
      if (rVal === 0) {
        tableHTML += stdRow('Account Rental', W);
      } else if (rentalOneTime) {
        tableHTML += stdRow('Account Rental', fmtRupee(rVal));
      } else {
        tableHTML += stdRow('Account Rental', `${fmtRupee(rVal)} ${perUnit('/month')}`);
        tableHTML += indRow('Calculation', `${fmtRupee(rVal)}/month × ${validity} months = <strong>${fmtRupee(rVal * validity)}</strong>`);
      }
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const vStdExtraUsers = getSafeNum('extra_users') || 0;
      if (userModelExotel) {
        const freeDisplay = vStdExtraUsers > 0 ? `${exoFreeUsers} + ${vStdExtraUsers} Users (Free)` : `${exoFreeUsers} Users (Free)`;
        tableHTML += stdRow('Free Users', freeDisplay);
        tableHTML += indRow('Extra User Cost', `${fmtRupee(exoUserCharge)} ${perUnit('/user/month')}`);
        if (chargedUsers > 0) {
          tableHTML += stdRow('Charged Users', chargedUsers + ' users');
          tableHTML += indRow('Calculation', `${chargedUsers} users × ${validity} months × ${fmtRupee(exoUserCharge)} = <strong>${fmtRupee(totalUserCostV)}</strong>`);
        }
      } else {
        const vStdUserLabel = vStdExtraUsers > 0 ? `${vStdExtraUsers} Free, ${numUsers} Charged` : numUsers;
        tableHTML += stdRow('No. of Users', vStdUserLabel);
        tableHTML += stdRow('User Charge', `${fmtRupee(uCharge)} ${perUnit('/user/month')}`);
        tableHTML += indRow('Calculation', `${numUsers} users × ${validity} months × ${fmtRupee(uCharge)} = <strong>${fmtRupee(totalUserCostV)}</strong>`);
      }

      tableHTML += secRow('Number Plan');
      if (!removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsV = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsV > 0) {
          const extNumCostV = getSafeNum('extra_number');
          const effValV = validity + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${paidNumsV} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsV} numbers × ${effValV} months × ${fmtRupee(extNumCostV)} = <strong>${fmtRupee(paidNumsV * effValV * extNumCostV)}</strong>`);
        }
      }
      if (didNums > 0) {
        const didTotalV = didNums * validity * DID_COST;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/Mobile DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums} Mobile DID(s) × ${validity} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotalV)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const baseCreditsV = getSafeNum('credits');
      const extraCreditsV = getSafeNum('extra_credits') || 0;
      const creditsDisplayV = extraCreditsV > 0
        ? `${fmtRupee(baseCreditsV)} + ${fmtRupee(extraCreditsV)}`
        : fmtRupee(baseCreditsV);
      tableHTML += stdRow('Call Credits', creditsDisplayV);
      const incomingV = getSafeNum('incoming');
      tableHTML += stdRow('Incoming Call Charges', incomingV === 0 ? FREE : fmtPaise(incomingV));
      tableHTML += stdRow('Outgoing Call Charges', fmtPaise(getSafeNum('outgoing')));
      if (showCt) tableHTML += stdRow('Call Transfer Add-on', `${fmtRupee(getSafeNum('call_transfer'))}/month`);

      // ISD PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_isd_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/country-wise-isd-pricing.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>ISD Voice Rate Card - Country-wise Outbound Pricing</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }

    } else if (effectiveSk === 'sip_veeno') {
      tableHTML += secRow('Plan Details');
      const sipBaseValidity = parseFloat(getVal('validity')) || 0;
      const sipExtraValidity = getSafeNum('extra_validity') || 0;
      const sipValidityDisplay = sipExtraValidity > 0
        ? `${sipBaseValidity} + ${sipExtraValidity} Months`
        : `${sipBaseValidity} Months`;
      tableHTML += stdRow('Validity', sipValidityDisplay);
      const rentalSip = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalSip === 0 ? null : fmtRupee(rentalSip), rentalSip === 0);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const fu2 = getVal('free_users');
      const fu2Extra = getSafeNum('extra_users') || 0;
      const fu2Display = (fu2 === null || fu2 === 'Unlimited') ? 'Unlimited (Included)' : (fu2Extra > 0 ? `${fu2} + ${fu2Extra} Users (Free)` : fu2 + ' Users (Free)');
      tableHTML += stdRow('Free Users', fu2Display);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(199)} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      const removStdSip = getSafeNum('remove_std_numbers') || 0;
      const vMonthsS = sipBaseValidity;
      const effVMonthsS = vMonthsS + sipExtraValidity;

      if (!removStdSip) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(499)} ${perUnit('/number/month')}`);
        const paidNumsS = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsS > 0) {
          tableHTML += stdRow('Extra Numbers', `${paidNumsS} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsS} numbers × ${effVMonthsS} months × ${fmtRupee(499)} = <strong>${fmtRupee(paidNumsS * effVMonthsS * 499)}</strong>`);
        }
      }
      const didNums2 = getSafeNum('did_numbers') || 0;
      if (didNums2 > 0) {
        tableHTML += stdRow('Mobile DID Numbers', `${didNums2} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(1500)} ${perUnit('/Mobile DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums2} Mobile DID(s) × ${vMonthsS} months × ${fmtRupee(1500)} = <strong>${fmtRupee(didNums2 * vMonthsS * 1500)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const sipBaseCredits = getSafeNum('credits');
      const sipExtraCredits = getSafeNum('extra_credits') || 0;
      const sipCreditDisplay = sipExtraCredits > 0
        ? `${fmtRupee(sipBaseCredits)} + ${fmtRupee(sipExtraCredits)}`
        : fmtRupee(sipBaseCredits);
      tableHTML += stdRow('Call Credits', sipCreditDisplay);
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      const sipAttemptVal = getSafeNum('attempt');
      const sipAttemptDisplay = sipAttemptVal === 0 ? 'Free' : (sipAttemptVal >= 100 ? '₹' + (sipAttemptVal / 100).toFixed(2) + ' / failed call' : sipAttemptVal + 'p / failed call');
      tableHTML += stdRow('Attempt Charges', sipAttemptDisplay);

    } else if (effectiveSk === 'voice_exotel_user' || sk === 'voice_veeno_user') {
      const isVeeno = sk === 'voice_veeno_user';
      const numUsers = getSafeNum('num_users') || 0;
      const numMonths = getSafeNum('num_months') || 0;
      const userCharge = getSafeNum('user_charge') || 0;
      const totalUserCost = numUsers * numMonths * userCharge;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const DID_COST = getSafeNum('did_cost') || 1500;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');

      tableHTML += secRow('User Plan');
      const userExtraFree = getSafeNum('extra_users') || 0;
      const userLabel = userExtraFree > 0
        ? `${userExtraFree} Free, ${numUsers} Charged`
        : numUsers;
      tableHTML += stdRow('No. of Users', userLabel);
      tableHTML += stdRow('No. of Months', numMonths);
      tableHTML += stdRow('User Charge', `${fmtRupee(userCharge)} ${perUnit('/user/month')}`);
      tableHTML += indRow('Calculation', `${numUsers} users × ${numMonths} months × ${fmtRupee(userCharge)} = <strong>${fmtRupee(totalUserCost)}</strong>`);

      tableHTML += secRow('Number Plan');
      if (!isVeeno || !removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsU = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsU > 0) {
          const effValU = numMonths + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${paidNumsU} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsU} numbers × ${effValU} months × ${fmtRupee(getSafeNum('extra_number'))} = <strong>${fmtRupee(paidNumsU * effValU * getSafeNum('extra_number'))}</strong>`);
        }
      }
      if (isVeeno && didNums > 0) {
        const didTotal = didNums * numMonths * DID_COST;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Mobile DID(s)`);
        tableHTML += indRow('Mobile DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/Mobile DID/month')}`);
      tableHTML += indRow('Calculation', `${didNums} Mobile DID(s) × ${numMonths} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotal)}</strong>`);
      }

      tableHTML += secRow('Call Charges');
      tableHTML += stdRow('Incoming Call Charges', W);
      tableHTML += stdRow('Outgoing Call Charges', W);
      if (showCt) tableHTML += stdRow('Call Transfer Add-on', `${fmtRupee(getSafeNum('call_transfer'))}/month`);

    } else if (effectiveSk === 'voice_exotel_tfn') {
      const numNums = getSafeNum('num_numbers') || 0;
      const numMonths2 = getSafeNum('num_months') || 0;
      const numCost = getSafeNum('number_cost') || 0;
      const totalNumCost = numNums * numMonths2 * numCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');
      tableHTML += stdRow('No. of Months', numMonths2);

      tableHTML += secRow('User Plan');
      const fuTfn = getVal('free_users');
      const fuTfnExtra = getSafeNum('extra_users') || 0;
      const fuTfnDisplay = (fuTfn === null || fuTfn === 'Unlimited') ? 'Unlimited (Included)' : (fuTfnExtra > 0 ? `${fuTfn} + ${fuTfnExtra} Users (Free)` : fuTfn + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuTfnDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('TFN Number Plan');
      tableHTML += stdRow('No. of TFN Numbers', numNums);
      tableHTML += stdRow('TFN Number Cost', `${fmtRupee(numCost)} ${perUnit('/number/month')}`);
      tableHTML += indRow('Calculation', `${numNums} number(s) × ${numMonths2} months × ${fmtRupee(numCost)} = <strong>${fmtRupee(totalNumCost)}</strong>`);

      const tfnVnEnabled = item.values['add_vn'] === 1;
      if (tfnVnEnabled) {
        tableHTML += secRow('Virtual Landline Number Plan');
        tableHTML += stdRow('Free Virtual Landline Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
        const tfnPaidVNs = getSafeNum('num_paid_numbers') || 0;
        if (tfnPaidVNs > 0) {
          const tfnVnCost = getSafeNum('extra_number');
          const tfnEffMonths = numMonths2 + (getSafeNum('extra_validity') || 0);
          tableHTML += stdRow('Extra Numbers', `${tfnPaidVNs} Number(s)`);
          tableHTML += indRow('Calculation', `${tfnPaidVNs} numbers × ${tfnEffMonths} months × ${fmtRupee(tfnVnCost)} = <strong>${fmtRupee(tfnPaidVNs * tfnEffMonths * tfnVnCost)}</strong>`);
        }
      }
      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));

    } else if (effectiveSk === 'voice_exotel_stream' || effectiveSk === 'voice_exotel_voicebot') {
      const isVoicebot = effectiveSk === 'voice_exotel_voicebot';
      const numChs = getSafeNum('num_channels') || 0;
      const numMos = getSafeNum('num_months') || 0;
      const chCost = getSafeNum('channel_cost') || 0;
      const freeChs = isVoicebot ? 5 : 0;
      const paidChs = Math.max(0, numChs - freeChs);
      const totalCh = paidChs * numMos * chCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('No. of Months', Math.max(1, parseFloat(getVal('num_months') || 0)));
      const rentalStream = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rentalStream === 0 ? null : `${fmtRupee(rentalStream)} ${perUnit('/month')}`, rentalStream === 0);
      tableHTML += stdRow('Setup Charges', null, true);

      tableHTML += secRow(isVoicebot ? 'Voicebot Channels' : 'Streaming Channels');
      if (isVoicebot) {
        tableHTML += stdRow('No. of Channels', paidChs > 0 ? `5 Free, ${paidChs} Paid` : `5 Channels (5 Channels Included Free)`);
        tableHTML += indRow('Additional Channel Cost', `${fmtRupee(chCost)} ${perUnit('/channel/month')}`);
        if (paidChs > 0) {
          tableHTML += indRow('Channel Calculation', `${paidChs} channels × ${numMos} months × ${fmtRupee(chCost)} = <strong>${fmtRupee(totalCh)}</strong>`);
        }
      } else {
        tableHTML += stdRow('No. of Channels', numChs);
        tableHTML += stdRow('Channel Cost', `${fmtRupee(chCost)} ${perUnit('/channel/month')}`);
        tableHTML += indRow('Calculation', `${numChs} channels × ${numMos} months × ${fmtRupee(chCost)} = <strong>${fmtRupee(totalCh)}</strong>`);
      }

      tableHTML += secRow('User Plan');
      const fuStr = getVal('free_users');
      const fuStrExtra = getSafeNum('extra_users') || 0;
      const fuStrDisplay = (fuStr === null || fuStr === 'Unlimited') ? 'Unlimited (Included)' : (fuStrExtra > 0 ? `${fuStr} + ${fuStrExtra} Users (Free)` : fuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuStrDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
      const paidNumsStr = getSafeNum('num_paid_numbers') || 0;
      if (paidNumsStr > 0) {
        const streamNumMos = numMos + (getSafeNum('extra_validity') || 0);
        tableHTML += stdRow('Extra Numbers', `${paidNumsStr} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsStr} numbers × ${streamNumMos} months × ${fmtRupee(getSafeNum('extra_number'))} = <strong>${fmtRupee(paidNumsStr * streamNumMos * getSafeNum('extra_number'))}</strong>`);
      }
      const didNums = getSafeNum('did_numbers') || 0;
      if (didNums > 0) {
        const didCost = getSafeNum('did_cost') || 1500;
        tableHTML += stdRow('Mobile DID Numbers', `${didNums} Number(s)`);
        tableHTML += indRow('Calculation', `${didNums} numbers × ${numMos} months × ${fmtRupee(didCost)} = <strong>${fmtRupee(didNums * numMos * didCost)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      const streamBaseCredits = getSafeNum('credits');
      const streamExtraCredits = getSafeNum('extra_credits') || 0;
      const streamCreditDisplay = streamExtraCredits > 0
        ? `${fmtRupee(streamBaseCredits)} + ${fmtRupee(streamExtraCredits)}`
        : fmtRupee(streamBaseCredits);
      tableHTML += stdRow('Call Credits', streamCreditDisplay);
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      if (getSafeNum('human_handoff') === 1) {
        tableHTML += stdRow('Human Handoff Calling Rate', fmtPaise(getSafeNum('outgoing')));
      }
      const attemptVal = getSafeNum('attempt');
      if (attemptVal > 0) {
        const attemptDisplay = attemptVal >= 100
          ? '\u20b9' + (attemptVal / 100).toFixed(2) + ' / failed call'
          : attemptVal + 'p / failed call';
        tableHTML += stdRow('Attempt Charges', attemptDisplay);
      }

    } else if (effectiveSk === 'voice_exotel_campaigns' || sk === 'voice_veeno_campaigns') {
      const campValidity = parseFloat(getVal('validity')) || 0;
      const campRate = getSafeNum('call_rate') || 0;
      const campBaseCredits = getSafeNum('credits');
      const campExtraCredits = getSafeNum('extra_credits') || 0;
      const campCreditDisplay = campExtraCredits > 0
        ? `${fmtRupee(campBaseCredits)} + ${fmtRupee(campExtraCredits)}`
        : fmtRupee(campBaseCredits);
      const campExtraValidity = getSafeNum('extra_validity') || 0;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Validity', campValidity + ' Months');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('CPM', '200 Calls/Min (Additional Chargeable)');
      const fuCamp = getVal('free_users');
      const fuCampExtra = getSafeNum('extra_users') || 0;
      const fuCampDisplay = (fuCamp === null || fuCamp === 'Unlimited') ? 'Unlimited (Included)' : (fuCampExtra > 0 ? `${fuCamp} + ${fuCampExtra} Users (Free)` : fuCamp + ' Users (Free)');
      tableHTML += stdRow('Free Users', fuCampDisplay);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      const campPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (campPaidNums > 0) {
        const campNumCost = getSafeNum('extra_number');
        const campEffValidity = campValidity + campExtraValidity;
        tableHTML += stdRow('Extra Numbers', `${campPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${campPaidNums} × ${campEffValidity} months × ${fmtRupee(campNumCost)} = <strong>${fmtRupee(campPaidNums * campEffValidity * campNumCost)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Campaign Rate');
      if (campExtraValidity > 0) {
        tableHTML += stdRow('Validity', `${campValidity} + ${campExtraValidity} months`);
      }
      tableHTML += stdRow('Call Credits', campCreditDisplay);
      tableHTML += stdRow('Campaign Call Charges', fmtPaise(campRate));

    } else if (effectiveSk === 'sms_exotel') {
      tableHTML += secRow('Plan Details');
      const rentalVal = getSafeNum('rental');
      const isRentalWaived = rentalVal === 0;
      tableHTML += stdRow('Account Rental', isRentalWaived ? null : (fmtRupee(rentalVal) + '/month'), isRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const smsFuStr = getVal('free_users');
      const smsExtraUsers = getSafeNum('extra_users') || 0;
      const smsFuDisplay = (smsFuStr === null || smsFuStr === 'Unlimited') ? 'Unlimited (Included)' : (smsExtraUsers > 0 ? `${smsFuStr} + ${smsExtraUsers} Users (Free)` : smsFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', smsFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
      const smsPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (smsPaidNums > 0) {
        const smsNumMonths = (getSafeNum('num_months') || 0) + (getSafeNum('extra_validity') || 0);
        const smsExtraCost = getSafeNum('extra_number');
        tableHTML += stdRow('Extra Numbers', `${smsPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${smsPaidNums} numbers × ${smsNumMonths} months × ${fmtRupee(smsExtraCost)} = <strong>${fmtRupee(smsPaidNums * smsNumMonths * smsExtraCost)}</strong>`);
      }

      tableHTML += secRow('SMS Credits & Rates');
      tableHTML += stdRow('SMS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));

    } else if (effectiveSk === 'whatsapp_exotel') {
      tableHTML += secRow('Plan Details');
      const waRentalVal = getSafeNum('rental');
      const isWaRentalWaived = waRentalVal === 0;
      tableHTML += stdRow('Account Rental', isWaRentalWaived ? null : (`${fmtRupee(waRentalVal)} per month`), isWaRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const waFuStr = getVal('free_users');
      const waExtraUsers = getSafeNum('extra_users') || 0;
      const waFuDisplay = (waFuStr === null || waFuStr === 'Unlimited') ? 'Unlimited (Included)' : (waExtraUsers > 0 ? `${waFuStr} + ${waExtraUsers} Users (Free)` : waFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', waFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', fmtRupee(getSafeNum('extra_number')) + perUnit('/number/month'));
      const waPaidNums = getSafeNum('num_paid_numbers') || 0;
      if (waPaidNums > 0) {
        const waNumMonths = (getSafeNum('num_months') || 0) + (getSafeNum('extra_validity') || 0);
        const waExtraCost = getSafeNum('extra_number');
        tableHTML += stdRow('Extra Numbers', `${waPaidNums} Number(s)`);
        tableHTML += indRow('Calculation', `${waPaidNums} numbers × ${waNumMonths} months × ${fmtRupee(waExtraCost)} = <strong>${fmtRupee(waPaidNums * waNumMonths * waExtraCost)}</strong>`);
      }

      tableHTML += secRow('WhatsApp Credits & Rates');
      tableHTML += stdRow('WA Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Utility Message Cost', fmtPaiseMsg(getSafeNum('wa_utility')));
      tableHTML += stdRow('Promotional Message Cost', fmtPaiseMsg(getSafeNum('wa_promo')));
      tableHTML += stdRow('API Charge (per msg)', fmtPaiseMsg(getSafeNum('wa_api')));

    } else if (effectiveSk === 'rcs_exotel') {
      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Brand Registration Fee', fmtRupee(getSafeNum('brand_fee')));
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));

      tableHTML += secRow('User Plan');
      const rcsFuStr = getVal('free_users');
      const rcsExtraUsers = getSafeNum('extra_users') || 0;
      const rcsFuDisplay = (rcsFuStr === null || rcsFuStr === 'Unlimited') ? 'Unlimited (Included)' : (rcsExtraUsers > 0 ? `${rcsFuStr} + ${rcsExtraUsers} Users (Free)` : rcsFuStr + ' Users (Free)');
      tableHTML += stdRow('Free Users', rcsFuDisplay);
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      const rcsNumCost = getSafeNum('number_cost');
      const isRcsNumWaived = rcsNumCost === 0;
      tableHTML += stdRow('Number Cost', isRcsNumWaived ? null : (fmtRupee(rcsNumCost) + '/month'), isRcsNumWaived);
      tableHTML += secRow('RCS Credits & Rates');
      tableHTML += stdRow('RCS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Business Messaging', fmtPaiseMsg(getSafeNum('rcs_biz')));
      tableHTML += stdRow('Rich Media Messaging', fmtPaiseMsg(getSafeNum('rcs_rich')));
      tableHTML += stdRow('User Reply Charge', fmtPaiseMsg(getSafeNum('rcs_reply')));

    } else if (effectiveSk === 'num_1400' || sk === 'num_1600') {
      const numRental = getSafeNum('rental') || 0;
      const numMosN = getSafeNum('num_months') || 0;
      const numChsN = getSafeNum('num_channels') || 0;
      const chCostN = getSafeNum('channel_cost') || 0;
      const procurement = getSafeNum('procurement') || 0;
      const totalRental = numRental * numMosN;
      const totalChs = numChsN * numMosN * chCostN;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Number Procurement', fmtRupee(procurement));
      tableHTML += stdRow('Number Rental', `${fmtRupee(numRental)}&nbsp;<span style="color:#94a3b8;font-size:0.8em;">per month</span>`);
      tableHTML += indRow('Rental Calculation', `${numMosN} months × ${fmtRupee(numRental)} = <strong>${fmtRupee(totalRental)}</strong>`);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', numMosN);
      tableHTML += secRow('Channels');
      tableHTML += stdRow('No. of Channels', numChsN);
      tableHTML += stdRow('Channel Cost', `${fmtRupee(chCostN)}&nbsp;<span style="color:#94a3b8;font-size:0.8em;">per month</span>`);
      tableHTML += indRow('Channel Calculation', `${numChsN} channels × ${numMosN} months × ${fmtRupee(chCostN)} = <strong>${fmtRupee(totalChs)}</strong>`);
      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));

    } else if (sk === 'voice_intl') {
      // ── International Commercial (USD pricing) ──────────────────
      const fmtUsd = (v) => {
        if (v === null || v === undefined) return '-';
        const n = parseFloat(v);
        if (isNaN(n)) return String(v);
        return '$' + n.toFixed(4).replace(/\.?0+$/, '');
      };
      const fmtUsdFixed = (v, dec = 2) => {
        if (v === null || v === undefined) return '-';
        return '$' + parseFloat(v).toFixed(dec);
      };
      const prepaid = getSafeNum('prepaid_usd') || 400;
      const numUsersI = getSafeNum('num_users') || 1;
      const numNumbersI = getSafeNum('num_numbers') || 1;
      const userChargeI = getSafeNum('user_charge_usd') || 15;
      const numChargeI = getSafeNum('number_charge_usd') || 15;
      const countryI = getVal('intl_country') || 'United States';
      const rmCountryI = getVal('rm_country') || 'India';
      const rmRateI = getSafeNum('_rm_rate') || 0.08;
      const voipOutI = getSafeNum('voip_outgoing_usd');
      const pstnIncI = getSafeNum('pstn_incoming_usd');
      const pstnOutI = getSafeNum('pstn_outgoing_usd');

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Credits (USD)', `${fmtUsdFixed(prepaid)}`);
      tableHTML += stdRow('Setup Charges', null, true);

      tableHTML += secRow('User Plan');
      tableHTML += stdRow('No. of Agents', `${numUsersI}`);
      tableHTML += stdRow('User Charge', `${fmtUsdFixed(userChargeI)} / agent / month`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('No. of Numbers', `${numNumbersI}`);
      tableHTML += stdRow('Number Rental', `${fmtUsdFixed(numChargeI)} / number / month`);

      tableHTML += secRow(`Call Charges (${sanitize(countryI)})`);
      tableHTML += stdRow('VoIP Incoming', FREE);
      tableHTML += stdRow('VoIP Outgoing', `${fmtUsd(voipOutI)} / min`);
      tableHTML += indRow(`${sanitize(countryI)} outgoing leg`, `Destination rate - billed to ${sanitize(countryI)} number`);
      tableHTML += stdRow('PSTN Incoming', `${fmtUsd(pstnIncI)} / min`);
      tableHTML += indRow(`${sanitize(rmCountryI)} agent leg`, `${sanitize(countryI)} leg is free; ${sanitize(rmCountryI)} agent leg charged at ${fmtUsd(rmRateI)}/min`);
      tableHTML += stdRow('PSTN Outgoing', `${fmtUsd(pstnOutI)} / min`);
      tableHTML += indRow('Breakdown', `${sanitize(countryI)} leg (${fmtUsd(voipOutI)}) + ${sanitize(rmCountryI)} agent leg (${fmtUsd(rmRateI)}) = <strong>${fmtUsd(pstnOutI)}/min</strong>`);

      // PDF attachment card (shown when toggle is on)
      if (getSafeNum('attach_intl_pdf') === 1) {
        tableHTML += `<tr><td colspan="2" style="padding:10px 14px;">
          <a href="${window.location.origin}/intl-voice-rates.pdf" target="_blank" style="display:inline-flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border:1.5px solid #7dd3fc; border-radius:8px; text-decoration:none; color:#0369a1; font-size:0.82rem; font-weight:600; box-shadow:0 1px 4px rgba(2,132,199,0.10);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
              <rect width="24" height="24" rx="4" fill="#dc2626"/>
              <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" fill="white" opacity="0.9"/>
              <path d="M14 4l4 4h-4V4z" fill="#fca5a5"/>
              <text x="7" y="17" font-family="Arial" font-size="4.5" font-weight="bold" fill="#dc2626">PDF</text>
            </svg>
            <span>International Voice Rate Card - Outbound Pricing (USD)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left:4px; opacity:0.6">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
              <polyline points="15 3 21 3 21 9" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </td></tr>`;
      }

    } else if (sk.startsWith('startup_')) {
      // ── Startup Plan: all rows shown as complimentary ────────
      tableHTML += `<tr><td colspan="2" style="padding:8px 14px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-weight:700; font-size:0.88rem; border-radius:4px 4px 0 0;">
        🌱  Complimentary Startup Bundle - ₹0 to client
      </td></tr>`;
      fields.forEach(f => {
        const val = item.values[f.id] ?? f.value;
        let displayVal = val;
        if (f.type === 'boolean') {
          displayVal = val === 1 ? 'Yes' : 'No';
        }
        tableHTML += `<tr style="background:#f0fdf4;">
          <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0; width:45%;">${sanitize(cleanLabel(f.label))}</td>
          <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0;">${f.waived ? '<span style="color:#16a34a;font-weight:600;">Waived</span>' : `<strong>${displayVal}</strong>`}</td>
        </tr>`;
        if (f.id === 'human_handoff' && val === 1) {
          tableHTML += `<tr style="background:#f0fdf4;">
            <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0; width:45%;">Human Handoff Calling Rate</td>
            <td style="padding:7px 14px; font-size:0.85rem; color:#374151; border-bottom:1px solid #bbf7d0;"><strong>${fmtPaise(getSafeNum('outgoing'))}</strong></td>
          </tr>`;
        }
      });
      tableHTML += `<tr style="background:#dcfce7;"><td style="padding:8px 14px; font-size:0.85rem; font-weight:700; color:#15803d;">Total Cost to Client</td>
        <td style="padding:8px 14px; font-size:0.9rem; font-weight:700; color:#15803d;">Complimentary (₹0)</td></tr>`;

    } else {
      fields.forEach(f => {
        if (f.note === 'SMS Add-on' && !showSms) return;
        if (f.note === 'WA Add-on'  && !showWa)  return;
        if (f.note === 'CT Add-on'  && !showCt)  return;
        const val = item.values[f.id] ?? f.value;
        tableHTML += stdRow(cleanLabel(f.label), f.waived ? null : val, f.waived === true);
      });
    }

    if (!isFirstSec) {
      tableHTML += '</tbody>';
    }

    // ── International SKU: USD subtotal (not added to INR grand total) ──────
    if (sk === 'voice_intl') {
      const prepaidV = getSafeNum('prepaid_usd') || 400;

      grandSubtotal += 0; // USD SKU excluded from INR grand total

      const feeTypeV = getSafeNum('fee_type'); // 0=none, 1=3% conv fee, 2=18% GST
      const convFeeV = feeTypeV === 1 ? Math.round(prepaidV * 0.03 * 100) / 100 : 0;
      const gstFeeV  = feeTypeV === 2 ? Math.round(prepaidV * 0.18 * 100) / 100 : 0;
      const totalFeeV = convFeeV + gstFeeV;
      const totalWithFeeV = Math.round((prepaidV + totalFeeV) * 100) / 100;

      const tierLabel = sku.hasTiers && item.tier
        ? ' - ' + (item.customName || TIER_DISPLAY_NAMES[item.tier] || (item.tier.charAt(0).toUpperCase() + item.tier.slice(1)))
        : '';
      const sectionTitle = (!sku.hasTiers && item.customName) ? item.customName : `${sku.label}${tierLabel}`;

      allSectionsHTML += `
      <div class="quote-doc-section sku-card" style="margin-top:24px;">
        <div class="quote-doc-section-title" style="font-size:1.15rem; background:#e0f2fe; padding:10px 14px; border-radius:6px; margin-bottom:12px; border-left:4px solid #0284c7;">
          ${sanitize(sectionTitle)}
        </div>
        <table class="quote-sku-table">
          <thead><tr><th style="width: 45%;">Component</th><th>Details</th></tr></thead>
          ${tableHTML}
        </table>
        <div style="margin-top:12px; padding:12px; background:#f8fafc; border-radius:6px; border:1px solid #e0f2fe; text-align:right;">
          <div style="font-size:0.8rem; color:#64748b;">Subtotal: <strong>$${prepaidV.toFixed(2)}</strong></div>
          ${feeTypeV === 1 ? `<div style="font-size:0.8rem; color:#64748b; margin-top:2px;">Convenience Fee (3%): $${convFeeV.toFixed(2)}</div>` : ''}
          ${feeTypeV === 2 ? `<div style="font-size:0.8rem; color:#64748b; margin-top:2px;">GST (18%): $${gstFeeV.toFixed(2)}</div>` : ''}
          ${feeTypeV > 0 ? `<div style="font-size:0.95rem; font-weight:700; color:#0284c7; margin-top:4px; padding-top:4px; border-top:1px solid #e2e8f0;">Total: $${totalWithFeeV.toFixed(2)}</div>` : ''}
        </div>
      </div>`;
      continue;
    }

    const months = parseFloat(item.values['num_months'] ?? item.values['validity'] ?? 1);
    const credits = getSafeNum('credits');
    let rental = getSafeNum('rental');
    const rentalF = fields.find(x => x.id === 'rental');
    // voice_exotel_std rental is always a one-time flat fee in the subtotal (not × months)
    const isRentalOneTime = item.values['rental_onetime'] === 1 || item.sku_key === 'voice_exotel_std';
    if (rentalF && rentalF.type === 'rental_toggle' && !isRentalOneTime) {
      // Veeno STD monthly rental — multiply by validity months
      rental = rental * months;
    } else if (rentalF && rentalF.label.toLowerCase().includes('/month')) {
      // Other SKUs that have '/month' in label
      rental = rental * months;
    }
    const brand = getSafeNum('brand_fee');
    const procure = getSafeNum('procurement');
    const setup = getSafeNum('setup');
    const isVoicebot = item.sku_key === 'voice_exotel_voicebot';
    const freeChs = isVoicebot ? 5 : 0;
    const paidChs = Math.max(0, parseFloat(item.values['num_channels'] ?? (isVoicebot ? 5 : 0)) - freeChs);
    const chCost = getSafeNum('channel_cost') * paidChs * months;
    const numUsers = parseFloat(item.values['num_users'] ?? 0);
    const userCharge = getSafeNum('user_charge');
    const numNumbers = parseFloat(item.values['num_numbers'] ?? 1);
    const numberCost = getSafeNum('number_cost') * numNumbers * months;

    let subtotal = credits + rental + brand + procure + setup + chCost + numberCost;
    // For Veeno STD: respect the pricing model toggle
    if (item.sku_key === 'voice_veeno_std') {
      const useExotelModel = item.values['user_model_exotel'] === 1;
      if (useExotelModel) {
        const exoFree = parseFloat(item.values['exotel_free_users'] ?? 6) || 6;
        const exoCharge = parseFloat(item.values['exotel_user_charge'] ?? 199) || 199;
        const charged = Math.max(0, numUsers - exoFree);
        if (charged > 0) subtotal += charged * exoCharge * months;
      } else {
        const userCharge = getSafeNum('user_charge');
        if (numUsers && userCharge) subtotal += numUsers * userCharge * months;
      }
    } else {
      if (numUsers && userCharge) subtotal += numUsers * userCharge * months;
    }
    const numPaidNums = parseFloat(item.values['num_paid_numbers'] ?? 0);
    const extraNumCost = getSafeNum('extra_number');
    if (numPaidNums && extraNumCost) subtotal += numPaidNums * extraNumCost * (months + (getSafeNum('extra_validity') || 0));
    const didNumbers = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNumbers > 0) subtotal += didNumbers * (parseFloat(item.values['did_cost']) || 1500) * months;

    grandSubtotal += isStartup ? 0 : subtotal;

    const tierLabel = sku.hasTiers && item.tier
      ? ' - ' + (item.customName || TIER_DISPLAY_NAMES[item.tier] || (item.tier.charAt(0).toUpperCase() + item.tier.slice(1)))
      : '';
    const sectionTitle = (!sku.hasTiers && item.customName) ? item.customName : `${sku.label}${tierLabel}`;

    allSectionsHTML += `
    <div class="quote-doc-section sku-card" style="margin-top:24px;">
      <div class="quote-doc-section-title" style="font-size:1.15rem; background:#f0f9ff; padding:10px 14px; border-radius:6px; margin-bottom:12px; border-left:4px solid #0284c7;">
        ${sanitize(sectionTitle)}
      </div>
      <table class="quote-sku-table">
        <thead><tr><th style="width: 45%;">Component</th><th>Details</th></tr></thead>
        ${tableHTML}
      </table>
      ${subtotal > 0 ? (QG.compareMode ? `
      <div style="margin-top:12px; padding:12px; background:#f8fafc; border-radius:6px; border:1px solid #e0f2fe; text-align:right;">
        <div style="font-size:0.8rem; color:#64748b;">Subtotal: ${fmtRupee(subtotal)}</div>
        <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">GST (18%): ${fmtRupee(Math.round(subtotal * 0.18))}</div>
        <div style="font-size:0.95rem; font-weight:700; color:#0284c7; margin-top:4px; padding-top:4px; border-top:1px solid #e2e8f0;">Total for this Option: ${fmtRupee(Math.round(subtotal * 1.18))}</div>
      </div>
      ` : `<div style="text-align:right; font-weight:600; padding:12px; font-size:0.9rem; color:#0f172a;">Item Subtotal: ${fmtRupee(subtotal)}</div>`) : ''}
    </div>`;
  }

  const gst = Math.round(grandSubtotal * 0.18);
  const grand = grandSubtotal + gst;

  doc.innerHTML = `
  <table class="print-master-table">
    <thead><tr><td><div class="print-master-header"></div></td></tr></thead>
    <tbody><tr><td>
    <div class="quote-doc-header">
      <img src="${logoSrc}" class="quote-doc-logo ${firstSku.entity.toLowerCase()}-logo" alt="${firstSku.entity} Logo"
        onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div style=\\'font-size:1.6rem;font-weight:800;color:#0284c7;\\'>${sanitize(firstSku.entity)}</div>')">
      <div class="quote-doc-meta">
        <div class="quote-number-badge">${sanitize(quoteNum)}</div>
        <div style="margin-top:4px;">Date: ${sanitize(dateStr)}</div>
        <div style="margin-top:2px;font-weight:600;color:#0284c7;">${firstSku.entity}</div>
      </div>
    </div>

    <div class="quote-doc-title">Commercial Proposal</div>
    <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:18px;">Prepared For: ${sanitize(company)}</p>

    <div class="quote-doc-section">
      <div class="quote-doc-section-title">Introduction</div>
      <div class="quote-intro-text">${introMap[firstSku.entity]}</div>
    </div>

    <div class="quote-doc-section">
      <div class="quote-doc-section-title">Parties</div>
      <div class="quote-participant-grid">
        <div class="quote-participant-box">
          <div class="label">Prepared By (${firstSku.entity})</div>
          <div class="value">${sanitize(seName || firstSku.entity + ' Sales')}</div>
          <div class="sub">${sanitize(seEmail)}</div>
          ${sePhone ? `<div class="sub">${sanitize(sePhone)}</div>` : ''}
        </div>
        <div class="quote-participant-box">
          <div class="label">Prepared For (Client)</div>
          <div class="value">${sanitize(company)}</div>
          ${contact ? `<div class="sub">${sanitize(contact)}</div>` : ''}
          ${clientEmail ? `<div class="sub">${sanitize(clientEmail)}</div>` : ''}
          ${clientPhone ? `<div class="sub">${sanitize(clientPhone)}</div>` : ''}
          ${tenantId ? `<div class="sub" style="color:#0284c7;font-weight:600;">Tenant ID: ${sanitize(tenantId)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="quote-skus-grid">
      ${allSectionsHTML}
    </div>

    ${(grandSubtotal > 0 && !QG.compareMode) ? `
    <div class="quote-totals" style="margin-top:24px; border-top:2px solid #0f172a; padding-top:16px;">
      <div class="quote-total-row subtotal"><span>Combined Subtotal (excl. GST)</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(grandSubtotal)}</span></div>
      <div class="quote-total-row gst"><span>GST @ 18%</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gst)}</span></div>
      <div class="quote-total-row grand-total"><span>Grand Total (incl. GST)</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(grand)}</span></div>
    </div>` : ''}

    <div class="quote-doc-section" style="margin-top:30px;">
      <div class="quote-doc-section-title">Terms &amp; Conditions</div>
      <div class="quote-tnc" style="font-size:0.85rem; color:#475569; line-height:1.5;">
        ${generateTncHtml(validItems, firstSku.entity)}
      </div>
    </div>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0f2fe;font-size:0.78rem;color:#94a3b8;text-align:center;">
      This is a system-generated commercial proposal. For queries, contact your ${firstSku.entity} account manager.
    </div>
    </td></tr></tbody>
    <tfoot><tr><td><div class="print-master-footer"></div></td></tr></tfoot>
  </table>
  `;
}
window.printQuote = async function () {
    const docElement = document.getElementById('quote-document');
    if (!docElement) return;

    // Determine default company name for a better default filename if available
    const companyInput = document.getElementById('q-client-company');
    const companyStr = companyInput && companyInput.value ? `_${companyInput.value.replace(/[^a-z0-9]/gi, '')}` : '';
    const defaultFilename = `Exotel_Quote_${QG.quoteNumber || 'Generated'}${companyStr}.pdf`;
    
    let userFilename = await showPrompt("Enter a filename for the Quote PDF:", defaultFilename, { title: 'Save PDF As' });
    if (userFilename === null) return; // Cancelled
    if (!userFilename.trim()) userFilename = defaultFilename;
    else if (!userFilename.toLowerCase().endsWith('.pdf')) userFilename += '.pdf';

    const renderBtn = document.getElementById('q-generate-btn') || document.querySelector('.qprev-btn.blue');
    const originalText = renderBtn ? renderBtn.innerHTML : '';
    if(renderBtn) renderBtn.innerHTML = '⚙️ Generating Perfect PDF...';

    // Force a fresh render of the preview RIGHT NOW so the PDF snapshot
    // exactly matches what the user sees — the async prompt above could have
    // allowed a background updatePreview() to change the DOM.
    updatePreview();

    // Compile robust backend HTML payload leveraging the exact live DOM state
    let htmlPayload = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${userFilename.replace('.pdf', '')}</title>
  <base href="${window.location.origin}/">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${window.location.origin}/style.css">
  <link rel="stylesheet" href="${window.location.origin}/quote-generator.css">
  <style>
     /* ── Global PDF Reset ─────────────────────────────────────── */
     @page { margin: ${QG.bundleCompareMode ? '6mm 8mm' : '10mm 12mm'}; size: A4 portrait; }
     body { background: white !important; margin: 0 !important; padding: 0 !important; font-size: 10px !important; -webkit-print-color-adjust: exact; }

     /* Strip screen paper styling — use high specificity to beat the 210mm width rule */
     html body #quote-document,
     #quote-document { width: 100% !important; min-height: 0 !important; height: auto !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 0 !important; flex-shrink: 0 !important; }

     /* Precise vector rendering */
     * { text-rendering: geometricPrecision !important; -webkit-font-smoothing: antialiased !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

     /* ── Compact header ────────────────────────────────────────── */
     .quote-doc-header { padding: 8px 0 !important; margin-bottom: 6px !important; break-inside: avoid !important; page-break-inside: avoid !important; }
     .quote-doc-logo { max-height: 44px !important; }
     .quote-number-badge { font-size: 0.75rem !important; padding: 3px 8px !important; }
     .quote-doc-title { font-size: 1rem !important; margin: 4px 0 !important; }
     .quote-intro-text { font-size: 0.72rem !important; line-height: 1.4 !important; margin: 4px 0 !important; }

     /* ── Participant grid: keep 2-col box together ─────────────── */
     .quote-participant-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; margin-bottom: 6px !important; break-inside: avoid !important; page-break-inside: avoid !important; }
     .quote-participant-box { padding: 6px 10px !important; }
     .quote-participant-box .label { font-size: 0.65rem !important; }
     .quote-participant-box .value { font-size: 0.8rem !important; }
     .quote-participant-box .sub { font-size: 0.68rem !important; }

     /* ── Doc sections ──────────────────────────────────────────── */
     .quote-doc-section { margin-top: 8px !important; padding: 0 !important; }
     .quote-doc-section-title { font-size: 0.78rem !important; padding: 4px 8px !important; margin-bottom: 6px !important; break-after: avoid !important; page-break-after: avoid !important; }

     /* ── SKU grid: BLOCK layout — no height-fill, no blank gaps ── */
     .quote-skus-grid { display: block !important; margin-top: 8px !important; }
     .quote-doc-section.sku-card { display: block !important; height: auto !important; min-height: 0 !important; margin-top: 8px !important; flex: none !important; }
     .quote-doc-section.sku-card .quote-sku-table { flex-grow: unset !important; }

     /* ── SKU table rows ────────────────────────────────────────── */
     .quote-sku-table th, .quote-sku-table td { font-size: 0.72rem !important; padding: 3px 6px !important; }
     .quote-sku-table .section-header-row td { font-size: 0.7rem !important; padding: 3px 6px !important; }
     .quote-sku-table .sub-row td { font-size: 0.68rem !important; padding: 2px 6px !important; }
     .sku-row-name { width: 55% !important; }

     /* ── Totals ────────────────────────────────────────────────── */
     .quote-totals { margin-top: 8px !important; padding-top: 8px !important; }
     .quote-total-row { padding: 3px 6px !important; font-size: 0.75rem !important; }
     .quote-total-row.grand-total { font-size: 0.85rem !important; }

     /* ── T&C — flows and breaks naturally, no forced jumps ─────── */
     .quote-tnc { font-size: 0.7rem !important; line-height: 1.45 !important; }
     .quote-tnc li { margin-bottom: 3px !important; }
     /* Section header rows never orphaned at bottom of a page */
     .section-header-row { break-after: avoid !important; page-break-after: avoid !important; }

     /* ── Print header/footer collapse ─────────────────────────── */
     .print-master-header, .print-master-footer { height: 0 !important; padding: 0 !important; overflow: hidden !important; display: block !important; }
     .print-master-table { width: 100% !important; border-collapse: collapse !important; }
     .print-master-table thead, .print-master-table tfoot { display: none !important; }

     /* ── Waived / free badges ──────────────────────────────────── */
     .waived-text { font-size: 0.68rem !important; }

     /* ── Fix overflow clipping for side-by-side compare tables ─── */
     [style*="overflow-x:auto"] {
       overflow: visible !important;
       overflow-x: visible !important;
     }
     .quote-sku-table {
       width: 100% !important;
       table-layout: fixed !important;
     }

     /* ── Fix bundle compare blank-space gap in Puppeteer ────────── */
     /* These rules apply unconditionally and OVERRIDE the responsive    */
     /* collapse that fires when Puppeteer renders at A4 width (~793px) */
     .bundle-compare-container,
     .bundle-compare-container * + .bundle-compare-container {
       display: grid !important;
       grid-template-columns: 1fr auto 1fr !important;
       gap: 10px !important;
       width: 100% !important;
       align-items: start !important;
     }
     .bundle-col {
       display: flex !important;
       flex-direction: column !important;
       min-width: 0 !important;
     }
     /* CRITICAL: Remove margin-top:auto which causes huge blank gaps */
     .bundle-subtotal-card {
       margin-top: 8px !important;
     }
     .bundle-compare-divider {
       display: flex !important;
       flex-direction: column !important;
       align-items: center !important;
       justify-content: flex-start !important;
       padding-top: 16px !important;
       width: 28px !important;
       min-height: 100px !important;
     }
     /* Override the @media (max-width:991px) collapse rule that fires at A4 width */
     @media (max-width: 9999px) {
       .bundle-compare-container {
         grid-template-columns: 1fr auto 1fr !important;
         gap: 10px !important;
       }
       .bundle-compare-divider {
         flex-direction: column !important;
         width: 28px !important;
         height: auto !important;
         min-height: 100px !important;
         padding: 0 4px !important;
       }
       .bundle-compare-divider::before {
         width: 1.5px !important;
         height: 100% !important;
       }
     }

     ${QG.bundleCompareMode ? `
     /* ── Bundle Compare: force side-by-side layout ─────────────── */
     .bundle-compare-container {
       display: grid !important;
       grid-template-columns: 1fr auto 1fr !important;
       gap: 10px !important;
       width: 100% !important;
       margin-top: 8px !important;
       page-break-inside: avoid !important;
       break-inside: avoid !important;
     }
     .bundle-col {
       display: flex !important;
       flex-direction: column !important;
       min-width: 0 !important;
       gap: 10px !important;
     }
     .bundle-col-header {
       padding: 8px 10px !important;
       font-size: 0.82rem !important;
       border-radius: 7px !important;
       -webkit-print-color-adjust: exact !important;
       print-color-adjust: exact !important;
     }
     .bundle-compare-divider {
       display: flex !important;
       flex-direction: column !important;
       align-items: center !important;
       justify-content: center !important;
       width: 28px !important;
       padding: 0 4px !important;
     }
     .bundle-compare-divider::before {
       content: '' !important;
       width: 1.5px !important;
       height: 100% !important;
       background: #e2e8f0 !important;
       display: block !important;
     }
     .bundle-compare-divider-badge {
       position: absolute !important;
       top: 50% !important;
       left: auto !important;
       transform: translateY(-50%) !important;
       font-size: 0.65rem !important;
       width: 26px !important;
       height: 26px !important;
     }
     /* Compact table rows for bundle compare — portrait A4 each col ~82mm wide */
     .quote-sku-table th, .quote-sku-table td { font-size: 0.58rem !important; padding: 2px 4px !important; }
     .quote-sku-table .section-header-row td { font-size: 0.56rem !important; padding: 2px 4px !important; }
     .quote-sku-table .sub-row td { font-size: 0.54rem !important; padding: 1px 4px !important; }
     .bundle-subtotal-card { padding: 6px 8px !important; font-size: 0.6rem !important; }
     .sku-row-name { width: 50% !important; }
     body { font-size: 8.5px !important; }
     ` : ''}
  </style>
</head>
<body>
  ${docElement.outerHTML}
</body>
</html>`;


    // Replace unicode characters with HTML entities to prevent mojibake in PDF
    htmlPayload = htmlPayload.replace(/₹/g, '&#8377;').replace(/✓/g, '&#10003;').replace(/×/g, '&#215;');

    try {
        const res = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ htmlPayload })
        });
        
        if (!res.ok) throw new Error('PDF Export failed on server.');
        
        // Convert stream to pure file download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = userFilename.trim();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Puppeteer PDF Request Error", e);
        showAlert("Failed to generate PDF. Please ensure your session is active and server is running.", { type: 'error', title: 'PDF Error' });
    } finally {
        if(renderBtn) renderBtn.innerHTML = originalText;
    }
};

// -- Generate Quote (Save) ----------------------------------
async function generateQuote() {
  if (QG.skuItems.length > 3) {
    showAlert('Only a maximum of 3 items are allowed to be there at any given time. Please remove some items first.', { type: 'warning', title: 'Limit Exceeded' });
    return;
  }
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) { showAlert('Please select a SKU plan first.', { type: 'warning', title: 'No SKU Selected' }); return; }
  const firstSkuObj = SKUS.find(s => s.key === validItems[0].sku_key);
  const firstSku = { ...firstSkuObj };

  let effectiveEntity = firstSku?.entity;
  const isStreamSku = ['voice_exotel_stream', 'startup_stream', 'voice_exotel_voicebot'].includes(validItems[0]?.sku_key);
  if (isStreamSku) {
    const item = validItems[0];
    const didNums = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNums > 0) {
      effectiveEntity = 'Veeno';
    } else {
      effectiveEntity = 'Exotel';
    }
  }
  firstSku.entity = effectiveEntity;

  const company = document.getElementById('q-client-company')?.value?.trim() || '';

  // Strict validation: Startup Plan cannot exceed 6000 total (no manager override allowed)
  if (QG.currentSku === 'startup') {
    const total = window.calcStartupTotal ? window.calcStartupTotal() : 0;
    if (total > 6000) {
      showAlert(`Startup Plan budget exceeded! Total is ₹${Math.round(total).toLocaleString('en-IN')}, but maximum allowed is ₹6,000. Please reduce credits or paid additions before generating.`, { type: 'error', title: 'Hard Stop: Budget Exceeded' });
      return;
    }
  }

  const violations = [];
  for (const item of validItems) {
    const fieldsDef = getSkuFields(item.sku_key, item.tier);
    for (const f of fieldsDef) {
      const val = item.values[f.id];
      if (val === undefined || val === null) continue;
      const numVal = parseFloat(val);
      if (f.stopType && !isNaN(numVal)) {
        const breach = isBreaching(f, numVal, item);
        if (breach) {
          violations.push({ field: f, value: val, item: item });
          document.getElementById('qf_' + f.id + '_' + item.id)?.classList.add('stop-lock-violation');
        } else {
          document.getElementById('qf_' + f.id + '_' + item.id)?.classList.remove('stop-lock-violation');
        }
      }
    }
  }

  if (violations.length > 0) {
    const approved = await showApprovalModal(violations.map(v => ({ field: v.field, value: v.value })));
    if (!approved) return;

    // Log each violation and add to overrides
    for (const v of violations) {
      if (!QG.stopLockOverrides.includes(v.field.id)) {
        QG.stopLockOverrides.push(v.field.id);
      }
      logStopLockOverride(v.field, v.value);
      document.getElementById('qf_' + v.field.id + '_' + v.item.id)?.classList.remove('stop-lock-violation');
    }
  }

  // Sync the currently-active bundle back before building quoteData
  if (QG.bundleCompareMode) {
    const curBundle = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
    if (curBundle) { curBundle.skuItems = QG.skuItems; curBundle.activeItemId = QG.activeItemId; }
  }

  const itemsA = QG.bundleCompareMode ? (QG.bundleA?.skuItems || []).filter(i => i.sku_key) : [];
  const itemsB = QG.bundleCompareMode ? (QG.bundleB?.skuItems || []).filter(i => i.sku_key) : [];

  // For bundle compare, the saved entity is determined by Bundle A's first SKU
  const bundleFirstSku = QG.bundleCompareMode && itemsA.length > 0
    ? SKUS.find(s => s.key === itemsA[0].sku_key)
    : firstSku;

  const quoteData = {
    sku_items: validItems,
    entity: (bundleFirstSku || firstSku)?.entity,
    compareMode: QG.compareMode,
    bundleCompareMode: QG.bundleCompareMode || false,
    bundle_a_items: itemsA,
    bundle_b_items: itemsB,
    activeBundle: QG.bundleCompareMode ? QG.activeBundle : null,
    client: {
      company: document.getElementById('q-client-company')?.value,
      contact: document.getElementById('q-client-contact')?.value,
      email: document.getElementById('q-client-email')?.value,
      phone: document.getElementById('q-client-phone')?.value,
      tenantId: document.getElementById('q-client-tenantid')?.value || '',
    },
    se: {
      name: document.getElementById('q-se-name')?.textContent,
      email: document.getElementById('q-se-email')?.textContent,
      phone: document.getElementById('q-se-phone')?.value,
    },
    date: today(),
    stop_lock_overrides: [...QG.stopLockOverrides],

    // Legacy fallback fields
    sku_key: QG.currentSku,
    tier: QG.currentTier,
    sku_label: firstSku?.label,
    fields: { ...QG.skuValues }
  };

  try {
    const isEdit = !!QG.currentQuoteId;
    const url = isEdit ? `/api/quotes/${QG.currentQuoteId}` : '/api/quotes';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_number: QG.quoteNumber, entity: firstSku?.entity, quote_data: quoteData })
    });
    
    if (res.status === 401) {
      // Auto-save draft before logging out so work isn't lost
      try {
        const emergencyDraftKey = 'draft_session_emergency_' + (QG.quoteNumber || Date.now());
        const emergencyData = {
          sku_items: QG.skuItems,
          company:   document.getElementById('q-client-company')?.value?.trim() || '',
          contact:   document.getElementById('q-client-contact')?.value?.trim() || '',
          clientEmail: document.getElementById('q-client-email')?.value?.trim() || '',
          clientPhone: document.getElementById('q-client-phone')?.value?.trim() || '',
          tenantId:  document.getElementById('q-client-tenantid')?.value?.trim() || '',
          quoteNumber: QG.quoteNumber,
          savedAt: new Date().toISOString(),
        };
        await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_key: emergencyDraftKey, draft_data: emergencyData })
        }).catch(() => null);
        localStorage.setItem('returnToDraft', emergencyDraftKey);
      } catch (_) { /* silent – session is already dead, best effort */ }
      showAlert("Your session has expired. Your draft has been saved — it will be waiting for you after you log back in.", { type: 'warning', title: 'Session Expired' });
      setTimeout(() => { window.location.href = '/login'; }, 2500);
      return;
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || (isEdit ? 'Update failed' : 'Save failed'));
    }

    await fetch('/api/drafts/key/draft_' + QG.quoteNumber, { method: 'DELETE' }).catch(() => null);
    updateNavCounters();

    showAlert(isEdit ? `Quote ${QG.quoteNumber} updated successfully!` : `Quote ${QG.quoteNumber} generated and saved successfully!`, { type: 'success', title: 'Quote Saved!' });
    if (!isEdit) launchConfetti();
    
    if (window._pendingPiQuoteId && window._pendingPiQuoteId === QG.currentQuoteId) {
      const pendingId = window._pendingPiQuoteId;
      window._pendingPiQuoteId = null;
      // Reload quote lists
      await loadMyQuotes().catch(() => null);
      await loadAllQuotes().catch(() => null);
      // Click tab to go back to My Quotes
      document.getElementById('qtab-myquotes')?.click();
      // Re-trigger Proforma Invoice modal
      setTimeout(() => {
        window.generateProformaInvoice(pendingId);
      }, 400);
      return;
    }

    await window.printQuote();
    // Reset & get new number
    resetQuoteForm();
    document.getElementById('qtab-myquotes')?.click();
  } catch (e) {
    showAlert('Failed to save quote: ' + e.message, { type: 'error', title: 'Save Failed' });
  }
}

// -- Save Draft ---------------------------------------------
async function saveDraft(e, silent = false) {
  if (QG.skuItems.length > 3) {
    showAlert('Only a maximum of 3 items are allowed to be there at any given time. Please remove some items first.', { type: 'warning', title: 'Limit Exceeded' });
    return;
  }
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) { showAlert('Select a SKU before saving a draft.', { type: 'warning', title: 'No SKU' }); return; }
  const firstSkuObj = SKUS.find(s => s.key === validItems[0].sku_key);
  const firstSku = { ...firstSkuObj };

  let effectiveEntity = firstSku.entity;
  const isStreamSku = ['voice_exotel_stream', 'startup_stream', 'voice_exotel_voicebot'].includes(validItems[0].sku_key);
  if (isStreamSku) {
    const item = validItems[0];
    const didNums = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNums > 0) {
      effectiveEntity = 'Veeno';
    } else {
      effectiveEntity = 'Exotel';
    }
  }
  firstSku.entity = effectiveEntity;

  const draftData = {
    sku_items: validItems,
    sku_key: QG.currentSku,
    tier: QG.currentTier,
    entity: firstSku.entity,
    fields: { ...QG.skuValues },
    client: {
      company: document.getElementById('q-client-company')?.value,
      contact: document.getElementById('q-client-contact')?.value,
      email: document.getElementById('q-client-email')?.value,
      phone: document.getElementById('q-client-phone')?.value,
      tenantId: document.getElementById('q-client-tenantid')?.value || '',
    }
  };

  if (!QG.draftKey) {
    QG.draftKey = 'draft_' + (QG.quoteNumber || Date.now());
  }
  const key = QG.draftKey;

  try {
    await fetch('/api/drafts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_key: key, draft_data: draftData })
    });

    QG._dirty = false;
    updateNavCounters();

    if (!silent) {
      // Optional: alert('Draft saved! You can resume it from the Drafts tab.');
    }
  } catch (e) {
    if (!silent) showAlert('Failed to save draft.', { type: 'error', title: 'Draft Error' });
  }
}

// -- Load Quotes --------------------------------------------
async function loadMyQuotes() {
  const container = document.getElementById('my-quotes-list');
  try {
    const res = await fetch('/api/quotes');
    const quotes = await res.json();
    const mine = quotes.filter(q => q.status !== 'deleted');
    document.getElementById('my-quotes-count').textContent = mine.length;
    if (!mine.length) { container.innerHTML = `<div class="q-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><h3>No quotes yet</h3><p>Generated quotes will appear here.</p></div>`; return; }
    
    window._myQuotes = mine;
    
    const applyMyFilters = () => {
      const q = document.getElementById('my-quotes-search')?.value?.toLowerCase() || '';
      
      const filtered = window._myQuotes.filter(quote => {
        let companyMatch = false;
        try { companyMatch = (JSON.parse(quote.quote_data)?.client?.company || '').toLowerCase().includes(q); } catch(e){}
        return quote.quote_number.toLowerCase().includes(q) || companyMatch;
      });
      
      if (!filtered.length) {
        container.innerHTML = `<div class="q-empty-state"><h3>No matching quotes found</h3></div>`;
      } else {
        container.innerHTML = filtered.map(quote => renderQuoteCard(quote, false)).join('');
      }
    };
    
    applyMyFilters();
    
    const searchInput = document.getElementById('my-quotes-search');
    if (searchInput) searchInput.oninput = applyMyFilters;
    
  } catch (e) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Failed to load quotes.</p>'; }
}

async function loadAllQuotes() {
  const container = document.getElementById('all-quotes-list');
  try {
    const res = await fetch('/api/quotes/admin');
    const quotes = await res.json();
    const countEl = document.getElementById('all-quotes-count');
    if (countEl) countEl.textContent = quotes.length;
    if (!quotes.length) { container.innerHTML = `<div class="q-empty-state"><h3>No quotes yet</h3></div>`; return; }

    // Store in a local variable for filtering
    window._allQuotes = quotes;

    const applyFilters = () => {
      const q = document.getElementById('admin-quotes-search')?.value?.toLowerCase() || '';
      const d = document.getElementById('admin-quotes-date')?.value || ''; // YYYY-MM-DD

      const filtered = window._allQuotes.filter(quote => {
        const matchesSearch = quote.quote_number.toLowerCase().includes(q) ||
          quote.user_email.toLowerCase().includes(q) ||
          (JSON.parse(quote.quote_data)?.client?.company || '').toLowerCase().includes(q);

        let matchesDate = true;
        if (d) {
          const quoteDate = new Date(quote.created_at).toISOString().split('T')[0];
          matchesDate = quoteDate === d;
        }

        return matchesSearch && matchesDate;
      });

      if (!filtered.length) {
        container.innerHTML = `<div class="q-empty-state"><h3>No matching quotes found</h3></div>`;
      } else {
        container.innerHTML = filtered.map(quote => renderQuoteCard(quote, true)).join('');
      }
    };

    // Initial render
    applyFilters();

    // Attach listeners once
    const searchInput = document.getElementById('admin-quotes-search');
    const dateInput = document.getElementById('admin-quotes-date');
    if (searchInput) searchInput.oninput = applyFilters;
    if (dateInput) dateInput.onchange = applyFilters;

  } catch (e) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Failed to load quotes.</p>'; }
}

function renderQuoteCard(q, isAdminView) {
  const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;
  const isDeleted = q.status === 'deleted';
  const entityColor = q.entity === 'Veeno' ? '#be185d' : '#0369a1';
  const entityBg = q.entity === 'Veeno' ? '#fce7f3' : '#e0f2fe';
  const date = new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
    <div class="quote-list-item${isDeleted ? ' deleted-quote' : ''}">
      <div class="quote-list-number">${sanitize(q.quote_number)}</div>
      <div class="quote-list-details">
        <span class="quote-list-entity" style="background:${entityBg};color:${entityColor};">${sanitize(q.entity)}</span>
        <div style="font-size:0.88rem;font-weight:600;color:#0f172a;margin-top:3px;">${sanitize(data?.client?.company || '-')}</div>
        <div class="quote-list-meta">${isAdminView ? `By: ${sanitize(q.user_email)} &nbsp;|&nbsp; ` : ''}${date}${isDeleted ? ' &nbsp;<span style="color:#ef4444;font-weight:600;">[Deleted]</span>' : ''}</div>
      </div>
      <div class="quote-list-actions">
        ${!isDeleted && !isAdminView ? `<button class="btn btn-secondary" onclick="viewQuote(${q.id})">Edit Quote</button>` : ''}
        <button class="btn btn-secondary" onclick="window.viewQuoteHistory(${q.id}, '${sanitize(q.quote_number)}')">History</button>
        <button class="btn btn-secondary" onclick="printHistoricalQuote(${q.id})">Download Quote</button>
        ${q.entity !== 'Veeno' && !isDeleted ? `<button class="btn btn-secondary" style="background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;font-weight:600;" onclick="generateProformaInvoice(${q.id})">&#x1F9FE; Proforma</button>` : ''}
        ${!isDeleted && !isAdminView ? `<button class="btn btn-reset" onclick="deleteQuote(${q.id})">Delete</button>` : ''}
      </div>
    </div>`;
}

window.deleteQuote = async function (id) {
  await fetch('/api/quotes/' + id, { method: 'DELETE' });
  loadMyQuotes();
  updateNavCounters();
};


window.viewQuoteHistory = async function (id, qNumber) {
  try {
    const res = await fetch(`/api/quotes/${id}/versions`);
    if (!res.ok) throw new Error('Failed');
    const versions = await res.json();

    // Store globally for quick preview parsing
    window._histVersions = versions;

    document.getElementById('qh-modal-title').textContent = `${qNumber} - History`;
    const listEl = document.getElementById('qh-version-list');

    if (versions.length === 0) {
      listEl.innerHTML = `
        <div class="qh-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h4>No version history yet</h4>
          <p>This quote has not been edited since it was first generated.</p>
        </div>`;
    } else {
      listEl.innerHTML = versions.map((v, idx) => {
        const d = new Date(v.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isLatest = idx === 0;
        const isOrigin = idx === versions.length - 1;

        let diffHtml = '';
        if (idx < versions.length - 1) {
          const curr = typeof v.quote_data === 'string' ? JSON.parse(v.quote_data) : v.quote_data;
          const prev = typeof versions[idx + 1].quote_data === 'string' ? JSON.parse(versions[idx + 1].quote_data) : versions[idx + 1].quote_data;
          const diffs = [];
          const cf = curr.fields || {};
          const pf = prev.fields || {};
          Object.keys(cf).forEach(k => {
            if (cf[k] !== pf[k]) {
              diffs.push(`<span class="qh-diff-chip field"><span>${k}</span><span class="arrow">→</span><span>${pf[k] || '0'} ➜ ${cf[k]}</span></span>`);
            }
          });
          if (curr.sku_key !== prev.sku_key) diffs.push(`<span class="qh-diff-chip sku">SKU: ${prev.sku_key || 'Old'} → ${curr.sku_key}</span>`);
          if (curr.tier !== prev.tier) diffs.push(`<span class="qh-diff-chip tier">Tier: ${prev.tier || 'None'} → ${curr.tier}</span>`);

          if (diffs.length > 0) {
            diffHtml = `<div class="qh-diff-area">${diffs.join('')}</div>`;
          }
          // No message when only client details changed - only show real quote field diffs
        } else {
          diffHtml = `<div class="qh-diff-origin-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Initial quote generated</div>`;
        }

        const dotClass = isLatest ? 'latest' : (isOrigin ? 'origin' : '');
        const innerClass = isOrigin ? 'origin' : '';
        const vLabel = v.id === 'current' ? 'Current Version' : `Version ${versions.length - idx}`;
        const badge = isLatest
          ? `<span class="qh-badge-latest">● Latest</span>`
          : (isOrigin ? `<span class="qh-badge-origin">✦ Original</span>` : '');

        return `
          <div class="qh-version-card">
            <div class="qh-version-dot ${dotClass}"></div>
            <div class="qh-version-inner ${innerClass}">
              <div class="qh-version-top">
                <div class="qh-version-info">
                  <div class="qh-version-label">${vLabel} ${badge}</div>
                  <div class="qh-version-meta">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${d}
                    <span class="dot"></span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${sanitize(v.edited_by)}
                  </div>
                </div>
                <button class="qh-preview-btn" onclick="window.previewHistoricalVersion('${v.id}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Preview
                </button>
              </div>
              ${diffHtml}
            </div>
          </div>
        `;
      }).join('');
    }
    document.getElementById('quote-history-modal').classList.remove('hidden');
  } catch (e) {
    showAlert('Failed to load version history.', { type: 'error', title: 'Error' });
  }
};
window.previewHistoricalVersion = function (vId) {
  const searchId = vId === 'current' ? 'current' : parseInt(vId, 10);
  const vObj = window._histVersions?.find(v => v.id === searchId);
  if (!vObj) return;
  const data = JSON.parse(vObj.quote_data);

  document.getElementById('quote-history-modal').classList.add('hidden');
  // Switch to New Quote tab
  document.querySelector('[data-qtab="new-quote"]').click();

  // Select SKU & Tier
  if (data.sku_items && data.sku_items.length > 0) {
    QG.skuItems = data.sku_items;
    QG.activeItemId = data.sku_items[0].id;
    QG.lockedEntity = data.entity || (SKUS.find(s => s.key === data.sku_items[0].sku_key)?.entity);
    syncActiveAliases();
    renderSkuItemManager();
    renderSkuSelector();
    if (QG.currentSku) {
      if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) renderTierSelector();
      else {
        const cfgArea = document.getElementById('sku-config-area');
        if (cfgArea) cfgArea.innerHTML = '';
        renderSkuForm(QG.currentSku, QG.currentTier);
      }
    }
  } else {
    selectSku(data.sku_key);
    if (data.tier) selectTier(data.tier);
  }

  setTimeout(() => {
    // Set Client Fields
    ['company', 'contact', 'email', 'phone', 'tenantid'].forEach(k => {
      const clientKey = k === 'tenantid' ? 'tenantId' : k;
      const el = document.getElementById('q-client-' + k);
      if (el && data.client?.[clientKey]) {
        el.value = data.client[clientKey];
        el.disabled = true; // Historical is read-only
        el.style.backgroundColor = '#f1f5f9';
      }
    });

    // Set SKU Fields
    if (data.fields) {
      Object.assign(QG.skuValues, data.fields);
      Object.keys(data.fields).forEach(fId => {
        const el = document.getElementById('qf_' + fId);
        if (el) {
          el.value = data.fields[fId];
          el.disabled = true; // Read-only
          el.style.backgroundColor = '#f1f5f9';
        }
      });
    }

    // Hide editing and saving buttons
    const formActions = document.querySelector('.q-form-actions');
    if (formActions) formActions.style.display = 'none';

    const addons = document.querySelector('.q-addons');
    if (addons) {
      Array.from(addons.getElementsByTagName('input')).forEach(i => i.disabled = true);
    }

    updatePreview();

    // Inject a banner at the top of the preview to clearly designate it is historical
    setTimeout(() => {
      const preview = document.getElementById('q-preview-document') || document.getElementById('q-preview');
      const warning = document.createElement('div');
      warning.innerHTML = '<div style="background:#fffbeb; color:#b45309; padding:8px 12px; margin-bottom:16px; border-radius:6px; border:1px solid #fcd34d; font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> HISTORICAL PREVIEW - READ ONLY</div>';
      preview.parentNode.insertBefore(warning, preview);

      // Let's add a reset button to allow exiting read-only mode if they want to create a new quote
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-secondary';
      resetBtn.style.textAlign = 'center';
      resetBtn.style.display = 'block';
      resetBtn.style.width = '100%';
      resetBtn.style.marginTop = '16px';
      resetBtn.innerText = 'Exit Historical View';
      resetBtn.onclick = () => window.location.reload();
      preview.parentNode.insertBefore(resetBtn, preview.nextSibling);
    }, 50);

  }, 200); // giving slightly more time for fields to visually render before injecting logic
};

window.printHistoricalQuote = async function (id) {
  try {
    let q;
    const res = await fetch('/api/quotes');
    if (res.ok) {
      const myQuotes = await res.json();
      q = myQuotes.find(x => x.id === id);
    }
    if (!q) {
      const adminRes = await fetch('/api/quotes/admin');
      if (adminRes.ok) {
        const adminQuotes = await adminRes.json();
        q = adminQuotes.find(x => x.id === id);
      }
    }
    if (!q) return showAlert('Quote not found.', { type: 'error', title: 'Not Found' });

    const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;

    // ── Backup full current QG state ──────────────────────────────
    const bkup = {
      skuItems: JSON.parse(JSON.stringify(QG.skuItems)),
      activeItemId: QG.activeItemId,
      compareMode: QG.compareMode,
      bundleCompareMode: QG.bundleCompareMode,
      bundleA: QG.bundleA ? JSON.parse(JSON.stringify(QG.bundleA)) : null,
      bundleB: QG.bundleB ? JSON.parse(JSON.stringify(QG.bundleB)) : null,
      activeBundle: QG.activeBundle,
      multiSkuMode: QG.multiSkuMode,
      lockedEntity: QG.lockedEntity,
      currentSku: QG.currentSku,
      currentTier: QG.currentTier,
      skuValues: { ...QG.skuValues },
      quoteNumber: QG.quoteNumber,
      currentQuoteId: QG.currentQuoteId,
      company:  document.getElementById('q-client-company')?.value,
      contact:  document.getElementById('q-client-contact')?.value,
      email:    document.getElementById('q-client-email')?.value,
      phone:    document.getElementById('q-client-phone')?.value,
      tenantId: document.getElementById('q-client-tenantid')?.value || '',
      qNum:     document.getElementById('q-quote-number')?.textContent,
      date:     document.getElementById('q-date')?.textContent,
    };

    // ── Restore historical state exactly as viewQuote does ────────
    if (data.bundleCompareMode && data.bundle_a_items?.length > 0) {
      QG.bundleA = {
        skuItems: data.bundle_a_items,
        activeItemId: data.bundle_a_items[0]?.id || 'item_a_0',
        lockedEntity: SKUS.find(s => s.key === data.bundle_a_items[0]?.sku_key)?.entity || null,
      };
      QG.bundleB = {
        skuItems: data.bundle_b_items || [],
        activeItemId: (data.bundle_b_items || [])[0]?.id || 'item_b_0',
        lockedEntity: data.bundle_b_items?.[0]?.sku_key ? (SKUS.find(s => s.key === data.bundle_b_items[0].sku_key)?.entity || null) : null,
      };
      QG.activeBundle = data.activeBundle || 'A';
      QG.bundleCompareMode = true;
      QG.multiSkuMode = true;
      const activeData = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
      QG.skuItems = activeData.skuItems;
      QG.activeItemId = activeData.activeItemId;
      QG.lockedEntity = activeData.lockedEntity;
      syncActiveAliases();
      [...QG.bundleA.skuItems, ...QG.bundleB.skuItems].forEach(item => {
        if (!item.sku_key) return;
        const resolvedKey = item.sku_key === 'startup' ? ('startup_' + (item.tier || 'voice')) : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        fields.forEach(f => { if (!f.note?.includes('Add-on') && item.values[f.id] === undefined && f.value !== undefined) item.values[f.id] = f.value; });
      });
    } else if (data.sku_items && data.sku_items.length > 0) {
      QG.bundleCompareMode = false;
      QG.compareMode = data.compareMode || false;
      QG.skuItems = data.sku_items;
      QG.activeItemId = data.sku_items[0].id;
      QG.lockedEntity = data.entity || (SKUS.find(s => s.key === data.sku_items[0].sku_key)?.entity);
      syncActiveAliases();
      QG.skuItems.forEach(item => {
        if (!item.sku_key) return;
        const resolvedKey = item.sku_key === 'startup' ? ('startup_' + (item.tier || 'voice')) : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        fields.forEach(f => { if (!f.note?.includes('Add-on') && item.values[f.id] === undefined && f.value !== undefined) item.values[f.id] = f.value; });
      });
    } else {
      QG.bundleCompareMode = false;
      QG.compareMode = false;
      QG.currentSku = data.sku_key;
      QG.currentTier = data.tier || 'dabbler';
      QG.skuValues = data.fields || {};
      QG.skuItems = [{ id: 'item_0', sku_key: QG.currentSku, tier: QG.currentTier, values: QG.skuValues, stopLockOverrides: [] }];
      QG.activeItemId = 'item_0';
    }

    // ── Set client + metadata fields ──────────────────────────────
    if (document.getElementById('q-client-company'))  document.getElementById('q-client-company').value  = data.client?.company  || '';
    if (document.getElementById('q-client-contact'))  document.getElementById('q-client-contact').value  = data.client?.contact  || '';
    if (document.getElementById('q-client-email'))    document.getElementById('q-client-email').value    = data.client?.email    || '';
    if (document.getElementById('q-client-phone'))    document.getElementById('q-client-phone').value    = data.client?.phone    || '';
    if (document.getElementById('q-client-tenantid')) document.getElementById('q-client-tenantid').value = data.client?.tenantId || '';
    if (document.getElementById('q-quote-number'))    document.getElementById('q-quote-number').textContent = q.quote_number;
    if (document.getElementById('q-date'))            document.getElementById('q-date').textContent = new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (document.getElementById('q-se-email'))        document.getElementById('q-se-email').textContent = q.user_email;
    if (document.getElementById('q-se-name') && data.se?.name)  document.getElementById('q-se-name').textContent = data.se.name;
    if (document.getElementById('q-se-phone') && data.se?.phone) document.getElementById('q-se-phone').value = data.se.phone;
    if (data.fields) {
      Object.assign(QG.skuValues, data.fields);
      Object.keys(data.fields).forEach(fid => { const inp = document.getElementById('qf_' + fid); if (inp) inp.value = data.fields[fid]; });
    }
    QG.quoteNumber = q.quote_number;

    updatePreview();

    setTimeout(async () => {
      await window.printQuote();

      // ── Restore original QG state ─────────────────────────────────
      QG.skuItems        = bkup.skuItems;
      QG.activeItemId    = bkup.activeItemId;
      QG.compareMode     = bkup.compareMode;
      QG.bundleCompareMode = bkup.bundleCompareMode;
      QG.bundleA         = bkup.bundleA;
      QG.bundleB         = bkup.bundleB;
      QG.activeBundle    = bkup.activeBundle;
      QG.multiSkuMode    = bkup.multiSkuMode;
      QG.lockedEntity    = bkup.lockedEntity;
      QG.currentSku      = bkup.currentSku;
      QG.currentTier     = bkup.currentTier;
      QG.skuValues       = bkup.skuValues;
      QG.quoteNumber     = bkup.quoteNumber;
      QG.currentQuoteId  = bkup.currentQuoteId;
      syncActiveAliases();
      if (document.getElementById('q-client-company'))  document.getElementById('q-client-company').value  = bkup.company  || '';
      if (document.getElementById('q-client-contact'))  document.getElementById('q-client-contact').value  = bkup.contact  || '';
      if (document.getElementById('q-client-email'))    document.getElementById('q-client-email').value    = bkup.email    || '';
      if (document.getElementById('q-client-phone'))    document.getElementById('q-client-phone').value    = bkup.phone    || '';
      if (document.getElementById('q-client-tenantid')) document.getElementById('q-client-tenantid').value = bkup.tenantId || '';
      if (document.getElementById('q-quote-number'))    document.getElementById('q-quote-number').textContent = bkup.qNum  || '';
      if (document.getElementById('q-date'))            document.getElementById('q-date').textContent       = bkup.date    || '';
      updatePreview();
    }, 400);

  } catch (e) {
    console.error(e);
    showAlert('Failed to generate PDF for historical quote.', { type: 'error', title: 'PDF Error' });
  }
};

// ── Proforma Invoice Generator ───────────────────────────────────────────────
// State holder for the PI modal
window._piQuoteData = null;

window.generateProformaInvoice = async function (id) {
  try {
    // Fetch quote
    let q;
    const res = await fetch('/api/quotes');
    if (res.ok) { const mine = await res.json(); q = mine.find(x => x.id === id); }
    if (!q) {
      const adminRes = await fetch('/api/quotes/admin');
      if (adminRes.ok) { const all = await adminRes.json(); q = all.find(x => x.id === id); }
    }
    if (!q) return showAlert('Quote not found.', { type: 'error', title: 'Not Found' });

    const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;

    // Check if it is a compare quote
    const isCompare = data.compareMode || (data.sku_items && data.sku_items.length >= 2 && data.sku_items.every(i => i.sku_key === data.sku_items[0].sku_key));
    if (isCompare) {
      if (await showConfirm('Proforma Invoice cannot be generated for comparison quotes. Would you like to edit the quote now to remove extra options and select a single tier?', { title: 'Comparison Quote Found', confirmText: 'Edit Quote', cancelText: 'Cancel' })) {
        window._pendingPiQuoteId = id;
        await window.viewQuote(id);
        setTimeout(() => {
          const manager = document.getElementById('sku-item-manager');
          if (manager) {
            manager.scrollIntoView({ behavior: 'smooth', block: 'center' });
            manager.style.outline = '2px solid #dc2626';
            manager.style.backgroundColor = '#fef2f2';
            setTimeout(() => {
              manager.style.outline = '';
              manager.style.backgroundColor = '';
            }, 5000);
          }
          showAlert('Please remove extra options from the Quote Items list so that only a single plan is left, then generate the Proforma Invoice.', { type: 'info', title: 'Remove Extra Plans' });
        }, 600);
      }
      return;
    }
    
    // Check if company name is missing
    const company = (data?.client?.company || '').trim();
    if (!company) {
      if (await showConfirm('Company name is missing for this quote. To generate a Proforma Invoice, a company name is required. Would you like to edit the quote now to add it?', { title: 'Company Name Required', confirmText: 'Edit Quote', cancelText: 'Cancel' })) {
        window._pendingPiQuoteId = id;
        await window.viewQuote(id);
        setTimeout(() => {
          const compInput = document.getElementById('q-client-company');
          if (compInput) {
            compInput.focus();
            compInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            compInput.style.outline = '2px solid #ef4444';
            compInput.style.backgroundColor = '#fef2f2';
            setTimeout(() => {
              compInput.style.outline = '';
              compInput.style.backgroundColor = '';
            }, 3000);
          }
        }, 500);
      }
      return;
    }

    window._piQuoteData = { q, data };

    // Pre-fill modal subtitle
    const subtitle = document.getElementById('pi-modal-subtitle');
    if (subtitle) subtitle.textContent = `${q.quote_number} — ${company}`;

    // Pre-fill billing address from quote client data if available
    const addrEl = document.getElementById('pi-billing-address');
    if (addrEl) addrEl.value = data?.client?.address || '';

    // Reset GST fields
    const gstEl = document.getElementById('pi-gst');
    const gstUnreg = document.getElementById('pi-gst-unregistered');
    if (gstEl) { gstEl.value = ''; gstEl.disabled = false; gstEl.style.opacity = '1'; }
    if (gstUnreg) gstUnreg.checked = false;

    // Set expiry date to 30 days from quote date
    const expiryEl = document.getElementById('pi-expiry-date');
    if (expiryEl) {
      const quoteDate = new Date(q.created_at);
      const expiry = new Date(quoteDate.getTime() + 30 * 24 * 3600 * 1000);
      expiryEl.value = expiry.toISOString().split('T')[0];
    }

    // Show modal
    const overlay = document.getElementById('pi-modal-overlay');
    if (overlay) { overlay.style.display = 'flex'; }

    // Focus address field
    setTimeout(() => { if (addrEl) addrEl.focus(); }, 80);

  } catch (e) {
    console.error(e);
    showAlert('Failed to load quote for Proforma Invoice.', { type: 'error', title: 'Error' });
  }
};

window.closePiModal = function () {
  const overlay = document.getElementById('pi-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  window._piQuoteData = null;
};

window.confirmGenerateProforma = async function () {
  if (!window._piQuoteData) return;

  const { q, data } = window._piQuoteData;

  const billingAddress = (document.getElementById('pi-billing-address')?.value || '').trim();
  if (!billingAddress) {
    document.getElementById('pi-billing-address').style.borderColor = '#ef4444';
    document.getElementById('pi-billing-address').focus();
    return;
  }
  document.getElementById('pi-billing-address').style.borderColor = '#cbd5e1';

  const gstUnreg = document.getElementById('pi-gst-unregistered')?.checked;
  const gstNumber = gstUnreg ? 'Unregistered' : ((document.getElementById('pi-gst')?.value || '').trim());
  const expiryDateVal = document.getElementById('pi-expiry-date')?.value || '';

  const confirmBtn = document.getElementById('pi-modal-confirm');
  const cancelBtn = document.getElementById('pi-modal-cancel');
  const billingAddressInput = document.getElementById('pi-billing-address');
  const gstInput = document.getElementById('pi-gst');
  const gstUnregisteredInput = document.getElementById('pi-gst-unregistered');
  const expiryDateInput = document.getElementById('pi-expiry-date');

  // Disable all fields & buttons to prevent user interaction during generation
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite; display: inline-block;">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity: 0.25;"></circle>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="opacity: 0.75;"></path>
      </svg>
      Generating...
    `;
    confirmBtn.style.cursor = 'not-allowed';
  }
  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.style.cursor = 'not-allowed';
    cancelBtn.style.opacity = '0.5';
  }
  if (billingAddressInput) billingAddressInput.disabled = true;
  if (gstInput) gstInput.disabled = true;
  if (gstUnregisteredInput) gstUnregisteredInput.disabled = true;
  if (expiryDateInput) expiryDateInput.disabled = true;

  const restoreModalState = () => {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Generate PI
      `;
      confirmBtn.style.cursor = 'pointer';
    }
    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.opacity = '1';
    }
    if (billingAddressInput) billingAddressInput.disabled = false;
    if (gstUnregisteredInput) gstUnregisteredInput.disabled = false;
    if (expiryDateInput) expiryDateInput.disabled = false;
    if (gstInput) {
      gstInput.disabled = gstUnregisteredInput ? gstUnregisteredInput.checked : false;
    }
  };

  try {
    // ── Compute totals from quote data ────────────────────────────
    const skuItems = data.sku_items || [{ sku_key: data.sku_key, tier: data.tier, values: data.fields || {}, stopLockOverrides: [] }];
    const validItems = skuItems.filter(i => i.sku_key);

    let grandSubtotal = 0;
    const lineItems = [];

    for (const item of validItems) {
      const sku = SKUS.find(s => s.key === item.sku_key);
      if (!sku) continue;
      const isStartup = item.sku_key === 'startup' || !!(STARTUP_PARENT_MAP[item.sku_key]);
      if (isStartup) continue;

      const fields = getSkuFields(item.sku_key, item.tier);
      const getSN = (id) => {
        const f = fields.find(x => x.id === id);
        if (!f || f.waived) return 0;
        return parseFloat(item.values[id] ?? f.value ?? 0) || 0;
      };
      const getV = (id) => {
        const f = fields.find(x => x.id === id);
        if (!f) return undefined;
        return item.values[id] ?? f.value;
      };

      const months = parseFloat(item.values['num_months'] ?? item.values['validity'] ?? 1);
      let rental = getSN('rental');
      const rentalF = fields.find(x => x.id === 'rental');
      if (rentalF && rentalF.label.toLowerCase().includes('/month')) rental = rental * months;
      const credits = getSN('credits');
      const brand = getSN('brand_fee');
      const procure = getSN('procurement');
      const setup = getSN('setup');
      const isVoicebot = item.sku_key === 'voice_exotel_voicebot';
      const freeChs = isVoicebot ? 5 : 0;
      const paidChs = Math.max(0, parseFloat(item.values['num_channels'] ?? (isVoicebot ? 5 : 0)) - freeChs);
      const chCost = getSN('channel_cost') * paidChs * months;
      const numUsers = parseFloat(item.values['num_users'] ?? 0);
      const userCharge = getSN('user_charge');
      const numNumbers = parseFloat(item.values['num_numbers'] ?? 1);
      const numberCost = getSN('number_cost') * numNumbers * months;
      const numPaidNums = parseFloat(item.values['num_paid_numbers'] ?? 0);
      const extraNumCost = getSN('extra_number');
      const didNumbers = parseFloat(item.values['did_numbers'] ?? 0);

      let subtotal = credits + rental + brand + procure + setup + chCost + numberCost;
      // For Veeno STD: respect the pricing model toggle
      if (item.sku_key === 'voice_veeno_std') {
        const useExotelModel = item.values['user_model_exotel'] === 1;
        if (useExotelModel) {
          const exoFree = parseFloat(item.values['exotel_free_users'] ?? 6) || 6;
          const exoCharge = parseFloat(item.values['exotel_user_charge'] ?? 199) || 199;
          const charged = Math.max(0, numUsers - exoFree);
          if (charged > 0) subtotal += charged * exoCharge * months;
        } else {
          const userChargeV = getSN('user_charge');
          if (numUsers && userChargeV) subtotal += numUsers * userChargeV * months;
        }
      } else {
        if (numUsers && userCharge) subtotal += numUsers * userCharge * months;
      }
      if (numPaidNums && extraNumCost) subtotal += numPaidNums * extraNumCost * (months + (getSN('extra_validity') || 0));
      if (didNumbers > 0) subtotal += didNumbers * (parseFloat(item.values['did_cost']) || 1500) * months;

      grandSubtotal += subtotal;

      // Build description
      const getSkuDescriptionLines = (item, sku) => {
        const resolvedKey = item.sku_key === 'startup' ? ('startup_' + (item.tier || 'voice')) : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        const getSN = (id) => {
          const f = fields.find(x => x.id === id);
          if (!f || f.waived) return 0;
          return parseFloat(item.values[id] ?? f.value ?? 0) || 0;
        };
        const getV = (id) => {
          const f = fields.find(x => x.id === id);
          if (!f) return undefined;
          return item.values[id] ?? f.value;
        };

        const fmtRupee = (v) => {
          if (v === null || v === undefined) return '-';
          return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);
        };
        const currentPulse = parseFloat(getV('pulse')) || 60;
        const rateUnit = currentPulse === 60 ? 'p/min' : `p/${currentPulse}secs`;
        const fmtPaise = (v) => {
          if (v === null || v === undefined) return '-';
          const num = parseFloat(v);
          if (isNaN(num)) return String(v);
          if (num >= 100) return '₹' + (num / 100).toFixed(2) + '/' + (currentPulse === 60 ? 'min' : currentPulse + 'secs');
          return num + ' ' + rateUnit;
        };
        const fmtPaiseMsg = (v) => {
          if (v === null || v === undefined) return '-';
          const num = parseFloat(v);
          if (isNaN(num)) return String(v);
          if (num >= 100) return '₹' + (num / 100).toFixed(2) + '/msg';
          return num + 'p/msg';
        };

        const lines = [];
        const tierName = sku.hasTiers && item.tier ? (item.customName || TIER_DISPLAY_NAMES[item.tier] || item.tier) : '';
        lines.push(`Plan: ${sku.label}${tierName ? ' - ' + tierName : ''}`);

        const months = parseFloat(item.values['num_months'] ?? item.values['validity'] ?? 1);
        const sk = item.sku_key;
        const resolvedStartupKey = sk === 'startup' ? ('startup_' + (item.tier || 'voice')) : sk;
        const effectiveSk = STARTUP_PARENT_MAP[resolvedStartupKey] || (STARTUP_PARENT_MAP[sk]) || sk;

        if (effectiveSk === 'voice_exotel_std') {
          const baseValidity = parseFloat(getV('validity')) || 0;
          const extraValidity = getSN('extra_validity') || 0;
          lines.push(`Validity: ${extraValidity > 0 ? baseValidity + ' + ' + extraValidity + ' months' : baseValidity + ' Months'}`);
          
          const rental = getSN('rental');
          lines.push(`Account Rental: ${rental === 0 ? 'Waived' : fmtRupee(rental) + '/month'}`);
          
          const setup = getSN('setup');
          lines.push(`Setup Charges: ${setup === 0 ? 'Waived' : fmtRupee(setup)}`);
          lines.push(`CPM: 200 Calls/Min (Additional Chargeable)`);
          
          const fu = getV('free_users');
          const fuExtra = getSN('extra_users') || 0;
          const fuDisplay = (fu === null || fu === 'Unlimited') ? 'Unlimited (Included)' : (fuExtra > 0 ? `${fu} + ${fuExtra} Users (Free)` : fu + ' Users (Free)');
          lines.push(`Free Users: ${fuDisplay}`);
          
          if (fu !== null && fu !== 'Unlimited') {
            lines.push(`Extra User Cost: ${fmtRupee(getSN('extra_user_cost'))}/user/month`);
          }
          
          lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
          lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
          
          const paidNums = getSN('num_paid_numbers') || 0;
          if (paidNums > 0) {
            const extNumCost = getSN('extra_number');
            const vMonths = baseValidity + extraValidity;
            lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * vMonths * extNumCost)} for ${vMonths} months)`);
          }
          
          const baseCredits = getSN('credits');
          const extraCredits = getSN('extra_credits') || 0;
          lines.push(`Call Credits Included: ${extraCredits > 0 ? fmtRupee(baseCredits) + ' + ' + fmtRupee(extraCredits) : fmtRupee(baseCredits)}`);
          lines.push(`Incoming Call Charges: ${fmtPaise(getSN('incoming'))}`);
          lines.push(`Outgoing Call Charges: ${fmtPaise(getSN('outgoing'))}`);
          
          const showSms = item.values['sms_cost'] !== undefined;
          const showWa  = item.values['wa_api'] !== undefined;
          const showCt  = item.values['call_transfer'] !== undefined;
          if (showSms) {
            lines.push(`SMS Cost: ${fmtPaiseMsg(getSN('sms_cost'))}`);
          }
          if (showWa) {
            lines.push(`WhatsApp Utility Messages: ${fmtPaiseMsg(getV('wa_utility'))}`);
            lines.push(`WhatsApp Promotional Messages: ${fmtPaiseMsg(getV('wa_promo'))}`);
            lines.push(`WhatsApp API Charge: ${fmtPaiseMsg(getSN('wa_api'))}`);
          }
          if (showCt) {
            lines.push(`Call Transfer Add-on: ₹${getSN('call_transfer')}/month`);
          }
        } else if (effectiveSk === 'voice_veeno_std') {
          const validity = parseFloat(getV('validity')) || 0;
          const extraValidity = getSN('extra_validity') || 0;
          lines.push(`Validity: ${extraValidity > 0 ? validity + ' + ' + extraValidity + ' months' : validity + ' Months'}`);
          
          const rental = getSN('rental');
          const rentalOneTimeSN = item.values['rental_onetime'] === 1;
          if (rental === 0) {
            lines.push(`Account Rental: Waived`);
          } else if (rentalOneTimeSN) {
            lines.push(`Account Rental: ${fmtRupee(rental)}`);
          } else {
            lines.push(`Account Rental: ${fmtRupee(rental)}/month`);
          }
          lines.push(`Setup Charges: Waived`);
          lines.push(`CPM: 200 Calls/Min (Additional Chargeable)`);
          
          const numUsers = getSN('num_users') || 0;
          const uCharge = getSN('user_charge') || 1000;
          const vStdExtraUsers = getSN('extra_users') || 0;
          const userModelExotelSN = getSN('user_model_exotel') === 1;
          const exoFreeUsersSN = getSN('exotel_free_users') || 6;
          const exoUserChargeSN = getSN('exotel_user_charge') || 1999;
          if (userModelExotelSN) {
            const freeCountSN = Math.min(numUsers, exoFreeUsersSN);
            const chargedUsersSN = Math.max(0, numUsers - exoFreeUsersSN);
            lines.push(`Free Users: ${freeCountSN} Users (Free)`);
            lines.push(`Extra User Cost: ${fmtRupee(exoUserChargeSN)}/user/month`);
            if (chargedUsersSN > 0) {
              lines.push(`Charged Users: ${chargedUsersSN} users @ ${fmtRupee(exoUserChargeSN)}/user/month`);
            }
          } else {
            const userLabel = vStdExtraUsers > 0 ? `${vStdExtraUsers} Free, ${numUsers} Charged` : numUsers;
            lines.push(`No. of Users: ${userLabel}`);
            lines.push(`User Charge: ${fmtRupee(uCharge)}/user/month`);
          }
          
          const removStd = getSN('remove_std_numbers') || 0;
          if (!removStd) {
            lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
            lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
            
            const paidNums = getSN('num_paid_numbers') || 0;
            if (paidNums > 0) {
              const extNumCost = getSN('extra_number');
              const effVal = validity + extraValidity;
              lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * effVal * extNumCost)} for ${effVal} months)`);
            }
          }
          
          const didNums = getSN('did_numbers') || 0;
          if (didNums > 0) {
            const DID_COST = getSN('did_cost') || 1500;
            lines.push(`Mobile DID Numbers: ${didNums} DID(s) @ ${fmtRupee(DID_COST)}/DID/month`);
          }
          
          const baseCredits = getSN('credits');
          const extraCredits = getSN('extra_credits') || 0;
          lines.push(`Call Credits Included: ${extraCredits > 0 ? fmtRupee(baseCredits) + ' + ' + fmtRupee(extraCredits) : fmtRupee(baseCredits)}`);
          lines.push(`Incoming Call Charges: Free`);
          lines.push(`Outgoing Call Charges: ${fmtPaise(getSN('outgoing'))}`);
        } else if (effectiveSk === 'sip_veeno') {
          const validity = parseFloat(getV('validity')) || 0;
          const extraValidity = getSN('extra_validity') || 0;
          lines.push(`Validity: ${extraValidity > 0 ? validity + ' + ' + extraValidity + ' months' : validity + ' Months'}`);
          
          const rental = getSN('rental');
          lines.push(`Account Rental: ${rental === 0 ? 'Waived' : fmtRupee(rental) + '/month'}`);
          lines.push(`Setup Charges: Waived`);
          lines.push(`CPM: 200 Calls/Min (Additional Chargeable)`);
          
          const fu2 = getV('free_users');
          const fu2Extra = getSN('extra_users') || 0;
          const fu2Display = (fu2 === null || fu2 === 'Unlimited') ? 'Unlimited (Included)' : (fu2Extra > 0 ? `${fu2} + ${fu2Extra} Users (Free)` : fu2 + ' Users (Free)');
          lines.push(`Free Users: ${fu2Display}`);
          lines.push(`Extra User Cost: ${fmtRupee(199)}/user/month`);
          
          const removStd = getSN('remove_std_numbers') || 0;
          if (!removStd) {
            lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
            lines.push(`Extra Number Cost: ${fmtRupee(499)}/number/month`);
            
            const paidNums = getSN('num_paid_numbers') || 0;
            if (paidNums > 0) {
              const effVal = validity + extraValidity;
              lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * effVal * 499)} for ${effVal} months)`);
            }
          }
          
          const didNums = getSN('did_numbers') || 0;
          if (didNums > 0) {
            lines.push(`Mobile DID Numbers: ${didNums} DID(s) @ ${fmtRupee(1500)}/DID/month`);
          }
          
          const baseCredits = getSN('credits');
          const extraCredits = getSN('extra_credits') || 0;
          lines.push(`Call Credits Included: ${extraCredits > 0 ? fmtRupee(baseCredits) + ' + ' + fmtRupee(extraCredits) : fmtRupee(baseCredits)}`);
          lines.push(`Incoming Calls: ${fmtPaise(getSN('incoming'))}`);
          lines.push(`Outgoing Calls: ${fmtPaise(getSN('outgoing'))}`);
          
          const attempt = getSN('attempt');
          lines.push(`Attempt Charges: ${attempt === 0 ? 'Free' : fmtPaise(attempt) + ' / failed call'}`);
        } else if (effectiveSk === 'voice_exotel_user' || effectiveSk === 'voice_veeno_user') {
          const isVeeno = effectiveSk === 'voice_veeno_user';
          lines.push(`Account Rental: Waived`);
          lines.push(`Setup Charges: Waived`);
          lines.push(`CPM: 200 Calls/Min (Additional Chargeable)`);
          
          const numUsers = getSN('num_users') || 0;
          const numMonths = getSN('num_months') || 0;
          const userCharge = getSN('user_charge') || 0;
          const userExtraFree = getSN('extra_users') || 0;
          const userLabel = userExtraFree > 0 ? `${userExtraFree} Free, ${numUsers} Charged` : numUsers;
          
          lines.push(`No. of Users: ${userLabel}`);
          lines.push(`No. of Months: ${numMonths}`);
          lines.push(`User Charge: ${fmtRupee(userCharge)}/user/month`);
          
          const removStd = getSN('remove_std_numbers') || 0;
          if (!isVeeno || !removStd) {
            lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
            lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
            
            const paidNums = getSN('num_paid_numbers') || 0;
            if (paidNums > 0) {
              const effVal = numMonths + (getSN('extra_validity') || 0);
              lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * effVal * getSN('extra_number'))} for ${effVal} months)`);
            }
          }
          
          const didNums = getSN('did_numbers') || 0;
          if (isVeeno && didNums > 0) {
            const DID_COST = getSN('did_cost') || 1500;
            lines.push(`Mobile DID Numbers: ${didNums} DID(s) @ ${fmtRupee(DID_COST)}/DID/month`);
          }
          
          lines.push(`Incoming Call Charges: Waived`);
          lines.push(`Outgoing Call Charges: Waived`);
          if (item.values['call_transfer'] !== undefined) lines.push(`Call Transfer Add-on: ₹${item.values['call_transfer']}/month`);
        } else if (effectiveSk === 'voice_exotel_tfn') {
          lines.push(`Account Rental: Waived`);
          lines.push(`Setup Charges: Waived`);
          lines.push(`CPM: 200 Calls/Min (Additional Chargeable)`);
          lines.push(`No. of Months: ${getSN('num_months')}`);
          
          const fuTfn = getV('free_users');
          const fuTfnExtra = getSN('extra_users') || 0;
          const fuTfnDisplay = (fuTfn === null || fuTfn === 'Unlimited') ? 'Unlimited (Included)' : (fuTfnExtra > 0 ? `${fuTfn} + ${fuTfnExtra} Users (Free)` : fuTfn + ' Users (Free)');
          lines.push(`Free Users: ${fuTfnDisplay}`);
          lines.push(`Extra User Cost: ${fmtRupee(getSN('extra_user_cost'))}/user/month`);
          
          const numNums = getSN('num_numbers') || 0;
          const numCost = getSN('number_cost') || 0;
          lines.push(`No. of TFN Numbers: ${numNums}`);
          lines.push(`TFN Number Cost: ${fmtRupee(numCost)}/number/month`);
          
          const tfnVnEnabled = item.values['add_vn'] === 1;
          if (tfnVnEnabled) {
            lines.push(`Free Virtual Landline Numbers: ${getV('free_numbers')} Number(s) (Free)`);
            lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
            
            const tfnPaidVNs = getSN('num_paid_numbers') || 0;
            if (tfnPaidVNs > 0) {
              const tfnVnCost = getSN('extra_number');
              const tfnEffMonths = getSN('num_months') + (getSN('extra_validity') || 0);
              lines.push(`Extra Numbers: ${tfnPaidVNs} Number(s) (Total cost: ${fmtRupee(tfnPaidVNs * tfnEffMonths * tfnVnCost)} for ${tfnEffMonths} months)`);
            }
          }
          
          lines.push(`Call Credits Included: ${fmtRupee(getSN('credits'))}`);
          lines.push(`Incoming Calls: ${fmtPaise(getSN('incoming'))}`);
        } else if (effectiveSk === 'voice_exotel_stream' || effectiveSk === 'voice_exotel_voicebot') {
          const isVoicebot = effectiveSk === 'voice_exotel_voicebot';
          const numChs = getSN('num_channels') || 0;
          const numMos = getSN('num_months') || 0;
          const chCost = getSN('channel_cost') || 0;
          
          lines.push(`No. of Months: ${numMos}`);
          const rental = getSN('rental');
          lines.push(`Account Rental: ${rental === 0 ? 'Waived' : fmtRupee(rental) + '/month'}`);
          lines.push(`Setup Charges: Waived`);
          
          if (isVoicebot) {
            const freeChs = 5;
            const paidChs = Math.max(0, numChs - freeChs);
            lines.push(`No. of Channels: ${paidChs > 0 ? `5 Free, ${paidChs} Paid` : `5 Channels (Included Free)`}`);
            lines.push(`Additional Channel Cost: ${fmtRupee(chCost)}/channel/month`);
          } else {
            lines.push(`No. of Channels: ${numChs}`);
            lines.push(`Channel Cost: ${fmtRupee(chCost)}/channel/month`);
          }
          
          const fuStr = getV('free_users');
          const fuStrExtra = getSN('extra_users') || 0;
          const fuStrDisplay = (fuStr === null || fuStr === 'Unlimited') ? 'Unlimited (Included)' : (fuStrExtra > 0 ? `${fuStr} + ${fuStrExtra} Users (Free)` : fuStr + ' Users (Free)');
          lines.push(`Free Users: ${fuStrDisplay}`);
          lines.push(`Extra User Cost: ${fmtRupee(getSN('extra_user_cost'))}/user/month`);
          
          lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
          lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
          
          const paidNums = getSN('num_paid_numbers') || 0;
          if (paidNums > 0) {
            const effMos = numMos + (getSN('extra_validity') || 0);
            lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * effMos * getSN('extra_number'))} for ${effMos} months)`);
          }
          
          const didNums = getSN('did_numbers') || 0;
          if (didNums > 0) {
            const didCost = getSN('did_cost') || 1500;
            lines.push(`Mobile DID Numbers: ${didNums} DID(s) @ ${fmtRupee(didCost)}/number/month`);
          }
          
          lines.push(`Call Credits Included: ${fmtRupee(getSN('credits'))}`);
          lines.push(`Incoming Calls: ${fmtPaise(getSN('incoming'))}`);
          lines.push(`Outgoing Calls: ${fmtPaise(getSN('outgoing'))}`);
          
          if (isVoicebot) {
            const attempt = getSN('attempt');
            lines.push(`Attempt Charges: ${attempt === 0 ? 'Free' : fmtPaise(attempt) + ' / failed call'}`);
            const handoff = item.values['human_handoff'] ?? 0;
            if (handoff === 1 || handoff === true || handoff === '1') {
              lines.push(`Human Handoff: Enabled`);
            }
          }
        } else if (effectiveSk === 'voice_exotel_campaigns') {
          lines.push(`No. of Months: ${getSN('num_months')}`);
          const rental = getSN('rental');
          lines.push(`Account Rental: ${rental === 0 ? 'Waived' : fmtRupee(rental) + '/month'}`);
          lines.push(`Setup Charges: Waived`);
          
          lines.push(`No. of Channels: ${getSN('num_channels')}`);
          lines.push(`Channel Cost: ${fmtRupee(getSN('channel_cost'))}/channel/month`);
          
          const fuStr = getV('free_users');
          const fuStrExtra = getSN('extra_users') || 0;
          const fuStrDisplay = (fuStr === null || fuStr === 'Unlimited') ? 'Unlimited (Included)' : (fuStrExtra > 0 ? `${fuStr} + ${fuStrExtra} Users (Free)` : fuStr + ' Users (Free)');
          lines.push(`Free Users: ${fuStrDisplay}`);
          lines.push(`Extra User Cost: ${fmtRupee(getSN('extra_user_cost'))}/user/month`);
          
          lines.push(`Free Numbers: ${getV('free_numbers')} Number(s) (Free)`);
          lines.push(`Extra Number Cost: ${fmtRupee(getSN('extra_number'))}/number/month`);
          
          const paidNums = getSN('num_paid_numbers') || 0;
          if (paidNums > 0) {
            const effMos = getSN('num_months') + (getSN('extra_validity') || 0);
            lines.push(`Extra Numbers: ${paidNums} Number(s) (Total cost: ${fmtRupee(paidNums * effMos * getSN('extra_number'))} for ${effMos} months)`);
          }
          
          lines.push(`Call Credits Included: ${fmtRupee(getSN('credits'))}`);
          lines.push(`Outgoing Calls: ${fmtPaise(getSN('outgoing'))}`);
        } else {
          lines.push(`Validity: ${months} months`);

          const credits = getSN('credits');
          if (credits > 0) lines.push(`Call/SMS/WA Credits Included: ${fmtRupee(credits)}`);

          const incoming = getSN('incoming') || getSN('single_leg') || getSN('call_rate');
          if (incoming > 0) {
            const label = resolvedKey.includes('sms') ? 'SMS Rate' : (resolvedKey.includes('whatsapp') ? 'WA Message Rate' : 'Call Rate');
            const suffix = resolvedKey.includes('sms') || resolvedKey.includes('whatsapp') ? 'paise/msg' : 'paise/min';
            lines.push(`${label}: ${incoming} ${suffix}`);
          }

          const pulse = getSN('pulse');
          if (pulse > 0) lines.push(`Billing Pulse: ${pulse} sec`);

          const numUsers = parseFloat(item.values['num_users'] ?? 0);
          const userCharge = getSN('user_charge');
          if (numUsers > 0 && userCharge > 0) {
            lines.push(`Users: ${numUsers} User(s) @ ${fmtRupee(userCharge)}/user/month`);
          }

          if (item.sku_key.includes('stream') || item.sku_key.includes('campaigns')) {
            const ch = parseFloat(item.values['num_channels'] || item.values['channels'] || 0);
            const chCost = getSN('channel_cost');
            if (ch > 0 && chCost > 0) {
              lines.push(`Channels: ${ch} Channel(s) @ ${fmtRupee(chCost)}/channel/month`);
            }
          }

          const did = parseFloat(item.values['did_numbers'] ?? 0);
          const didCost = getSN('did_cost') || 1500;
          if (did > 0) {
            lines.push(`Mobile DID Numbers: ${did} DID(s) @ ${fmtRupee(didCost)}/DID/month`);
          }

          const numPaid = parseFloat(item.values['num_paid_numbers'] ?? 0);
          const extraN = getSN('extra_number');
          if (numPaid > 0 && extraN > 0) {
            lines.push(`Extra Numbers: ${numPaid} DID(s) @ ${fmtRupee(extraN)}/number/month`);
          }

          const rental = getSN('rental');
          if (rental > 0) lines.push(`Account Rental: ${fmtRupee(rental)}/month`);
          
          const setup = getSN('setup');
          if (setup > 0) lines.push(`Setup Charges: ${fmtRupee(setup)}`);
        }

        return lines;
      };

      item.amount = subtotal;
      const descLines = getSkuDescriptionLines(item, sku);
      lineItems.push({
        descLines: descLines,
        amount: subtotal
      });
    }

    const gstAmt = grandSubtotal * 0.18;
    const grandTotal = grandSubtotal + gstAmt;

    // ── Format helpers ────────────────────────────────────────────
    const fmtINR = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);
    const fmtINRFull = (v) => '&#8377;' + fmtINR(v);

    // ── Date strings ──────────────────────────────────────────────
    const quoteDateObj = new Date(q.created_at);
    const fmtDate = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };
    const quoteDateStr = fmtDate(quoteDateObj);
    const expiryDateStr = expiryDateVal
      ? fmtDate(new Date(expiryDateVal))
      : fmtDate(new Date(quoteDateObj.getTime() + 30 * 24 * 3600 * 1000));

    // ── Address lines ─────────────────────────────────────────────
    const addrLines = billingAddress.replace(/\n/g, '<br>');
    const company = data?.client?.company || '';

    // ── Line items HTML ───────────────────────────────────────────
    const liHtml = lineItems.length > 0
      ? lineItems.map((li, i) => `
        <tr>
          <td class="center-align" style="vertical-align: top;">${i + 1}</td>
          <td style="text-align: center; vertical-align: top; line-height: 1.3; padding: 6px 10px;">
            ${li.descLines.map(line => line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')}
          </td>
          <td class="center-align" style="vertical-align: top;">1</td>
          <td class="center-align" style="vertical-align: top;">-</td>
          <td class="center-align" style="vertical-align: top; text-transform: lowercase;">x</td>
          <td class="right-align" style="vertical-align: top;">${fmtINR(li.amount)}</td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="padding:10px; text-align:center; color:#94a3b8; font-size:0.8rem;">See attached quote for plan details.</td></tr>`;

    // ── Build full PI HTML ────────────────────────────────────────
    const piHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proforma Invoice - ${company.replace(/</g,'&lt;')} - ${q.quote_number}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    body {
      background: #fff;
      font-family: Arial, sans-serif;
      color: #000;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10px;
    }
    .invoice-container {
      width: 100%;
      max-width: 1060px;
      margin: 0 auto;
      padding: 5px 10px;
      box-sizing: border-box;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .logo-container {
      flex: 1;
      padding-top: 10px;
    }
    .pi-logo {
      height: 48px;
      object-fit: contain;
    }
    .title-container {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .pi-title {
      font-size: 22px;
      color: #0070c0;
      font-weight: 500;
      margin-bottom: 3px;
    }
    .date-table {
      border-collapse: collapse;
      font-size: 10px;
    }
    .date-table td {
      padding: 1px 0;
      border: none !important;
    }
    .date-label {
      font-weight: bold;
      text-align: left;
      padding-right: 20px !important;
    }
    .date-value {
      text-align: right;
    }
    
    .client-container {
      font-size: 10px;
      line-height: 1.3;
      margin-bottom: 10px;
    }
    .client-name {
      font-weight: bold;
    }
    
    .supplier-container {
      border: 1px solid #a6a6a6;
      border-left: 1px solid #7f7f7f;
      border-right: 1px solid #7f7f7f;
      text-align: center;
      padding: 6px 8px;
      margin: 10px 0;
      font-size: 10px;
      line-height: 1.3;
    }
    .supplier-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .supplier-address {
      margin-bottom: 2px;
    }
    .supplier-meta {
      color: #000;
    }
    
    .notice-text {
      color: #ff0000;
      text-align: center;
      font-size: 10px;
      margin: 5px 0 10px 0;
    }
    
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .invoice-table th, .invoice-table td {
      border: 1px solid #7f7f7f;
      padding: 4px 6px;
    }
    .invoice-table th {
      background-color: #0070c0;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      font-size: 10px;
      padding: 4px;
    }
    .invoice-table th.left-align {
      text-align: left;
    }
    .invoice-table td.center-align {
      text-align: center;
    }
    .invoice-table td.right-align {
      text-align: right;
    }
    .bold-text {
      font-weight: bold;
    }
    
    .terms-container {
      vertical-align: top;
      padding: 0 !important;
      height: 100%;
    }
    .terms-header {
      background-color: #0070c0;
      color: #ffffff;
      font-weight: bold;
      padding: 3px 6px;
      font-size: 10px;
    }
    .terms-content {
      padding: 6px;
      min-height: 30px;
    }
    
    .section-banner {
      background-color: #0070c0;
      color: #ffffff;
      font-weight: bold;
      padding: 3px 6px;
      margin-top: 10px;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .details-content {
      font-size: 10px;
      line-height: 1.3;
      color: #000;
    }
    
    .invoice-footer {
      text-align: center;
      font-size: 9px;
      color: #000;
      margin-top: 15px;
      padding-bottom: 5px;
    }
  </style>
</head>
<body>
<div class="invoice-container">
  <!-- Header -->
  <div class="invoice-header">
    <div class="logo-container">
      <img src="${window.location.origin}/exotel-logo.png" class="pi-logo" alt="exotel" onerror="this.outerHTML='<span style=&quot;font-size: 24px; font-weight: bold; color: #0284c7; font-family: sans-serif;&quot;>exotel</span>'">
    </div>
    <div class="title-container">
      <div class="pi-title">Proforma Invoice</div>
      <table class="date-table">
        <tr>
          <td class="date-label">Quote Date</td>
          <td class="date-value">${quoteDateStr}</td>
        </tr>
        <tr>
          <td class="date-label">Expiration Date</td>
          <td class="date-value">${expiryDateStr}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Client Details -->
  <div class="client-container">
    <div class="client-name">${(company || '—').toUpperCase()}</div>
    <div class="client-address">${addrLines}</div>
    <div class="client-gst">GST number: : &nbsp;${gstNumber}</div>
  </div>

  <!-- Supplier Details -->
  <div class="supplier-container">
    <div class="supplier-name">Exotel Techcom Private Limited</div>
    <div class="supplier-address">Maruthi Infotech Center - Tower A, 540, 100 Feet Rd, Amarjyoti Layout, Domlur, Bengaluru, Karnataka 560071</div>
    <div class="supplier-meta">Supplier GSTIN: 29AACCE7697J1ZW ● Website: www.exotel.com ● Phone no.: +91 80889 19888 ● E-mail: hello@exotel.in</div>
  </div>

  <!-- Notice -->
  <div class="notice-text">(This is not a tax invoice)</div>

  <!-- Line Items & Totals Table -->
  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th class="left-align" style="width: 55%;">DESCRIPTION</th>
        <th style="width: 10%;">QTY</th>
        <th style="width: 10%;">UNIT<br>PRICE</th>
        <th style="width: 8%;">TAX</th>
        <th style="width: 12%;">TOTAL AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${liHtml}
      
      <!-- Totals & Terms Rows -->
      <tr>
        <td colspan="3" rowspan="5" class="terms-container">
          <div class="terms-header">TERMS OF SALE AND OTHER COMMENTS</div>
          <div class="terms-content"></div>
        </td>
        <td colspan="2">Subtotal</td>
        <td class="right-align">${fmtINR(grandSubtotal)}</td>
      </tr>
      <tr>
        <td colspan="2">Taxable</td>
        <td class="right-align">${fmtINR(grandSubtotal)}</td>
      </tr>
      <tr>
        <td>GST</td>
        <td class="center-align">18%</td>
        <td class="right-align">${gstAmt.toFixed(3)}</td>
      </tr>
      <tr>
        <td>TDS</td>
        <td class="center-align">0%</td>
        <td class="right-align">-</td>
      </tr>
      <tr>
        <td colspan="2"></td>
        <td class="right-align">-</td>
      </tr>
      
      <!-- Total Row -->
      <tr>
        <td colspan="3" style="border: none;"></td>
        <td colspan="2" class="bold-text">TOTAL</td>
        <td class="right-align bold-text">${fmtINR(grandTotal)}</td>
      </tr>
      
      <!-- Empty Spacer row at bottom -->
      <tr style="height: 5px;">
        <td colspan="3" style="border: none;"></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Additional Details Banner -->
  <div class="section-banner">ADDITIONAL DETAILS</div>
  
  <!-- Additional Details Content -->
  <div class="details-content">
    <div style="font-weight: bold; margin-bottom: 5px;">Other details:</div>
    <div>HSN : 998429 (OTHER INTERNET TELECOMMUNICATION SERVICES)</div>
    <div>Whether tax is payable on reverse charge basis : No</div>
    <div>PAN : AACCE7697J</div>
    <br>
    <div><strong>Bank Name</strong> - Kotak Mahindra Bank Ltd</div>
    <div><strong>Account Holder Name</strong> - Exotel Techcom Private Limited</div>
    <div><strong>Account no</strong> - 2512379407</div>
    <div><strong>IFSC</strong> - KKBK0008066</div>
    <div><strong>Bank Branch Name</strong> - MG Road Branch</div>
    <div><strong>City</strong> - Bangalore</div>
    <br>
    <div style="font-weight: bold;">Note:We don't have refund policy</div>
  </div>

  <!-- Footer -->
  <div class="invoice-footer">
    Exotel Techcom Private Limited is a private limited company with CIN no. U72900KA2011PTC059065
  </div>
</div>
</body>
</html>`;

    // ── Send to PDF endpoint ──────────────────────────────────────
    const defaultFilename = `Proforma_Invoice_${q.quote_number}_${(company || 'Exotel').replace(/[^a-z0-9]/gi,'_')}.pdf`;

    const pdfRes = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ htmlPayload: piHtml })
    });
    if (!pdfRes.ok) throw new Error('PDF export failed on server.');

    // Update button to Generated!
    if (confirmBtn) {
      confirmBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block;"><polyline points="20 6 9 17 4 12"/></svg>
        Generated!
      `;
    }

    const blob = await pdfRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Proforma Invoice generated successfully!', 'success');

    // Wait 1 second before closing and restoring modal state
    setTimeout(() => {
      closePiModal();
      restoreModalState();
    }, 1000);

  } catch (e) {
    console.error('PI generation error', e);
    showAlert('Failed to generate Proforma Invoice. Please try again.', { type: 'error', title: 'PI Error' });
    restoreModalState();
  }
};
// ── End Proforma Invoice Generator ───────────────────────────────────────────

window.viewQuote = async function (id) {
  try {
    let q;
    // Fast path: try my-quotes first
    const res = await fetch('/api/quotes');
    if (res.ok) {
      const myQuotes = await res.json();
      q = myQuotes.find(x => x.id === id);
    }
    // Admin fallback
    if (!q) {
      const adminRes = await fetch('/api/quotes/admin');
      if (adminRes.ok) {
        const adminQuotes = await adminRes.json();
        q = adminQuotes.find(x => x.id === id);
      }
    }

    if (!q) { showAlert('Quote not found or permission denied.', { type: 'error', title: 'Not Found' }); return; }

    const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;

    // Switch to New Quote tab
    document.querySelector('[data-qtab="new-quote"]').click();

    // ── Bundle Compare Mode restore ─────────────────────────────────
    if (data.bundleCompareMode && data.bundle_a_items?.length > 0) {
      // Activate bundle compare mode
      QG.bundleA = {
        skuItems: data.bundle_a_items,
        activeItemId: data.bundle_a_items[0]?.id || 'item_a_0',
        lockedEntity: SKUS.find(s => s.key === data.bundle_a_items[0]?.sku_key)?.entity || null,
      };
      QG.bundleB = {
        skuItems: data.bundle_b_items || [],
        activeItemId: (data.bundle_b_items || [])[0]?.id || 'item_b_0',
        lockedEntity: data.bundle_b_items?.[0]?.sku_key ? (SKUS.find(s => s.key === data.bundle_b_items[0].sku_key)?.entity || null) : null,
      };
      QG.activeBundle = data.activeBundle || 'A';
      QG.bundleCompareMode = true;
      QG.multiSkuMode = true;

      // Load active bundle into QG.skuItems
      const activeData = QG.activeBundle === 'A' ? QG.bundleA : QG.bundleB;
      QG.skuItems = activeData.skuItems;
      QG.activeItemId = activeData.activeItemId;
      QG.lockedEntity = activeData.lockedEntity;
      syncActiveAliases();

      // Hydrate field defaults for all items in both bundles
      [...QG.bundleA.skuItems, ...QG.bundleB.skuItems].forEach(item => {
        if (!item.sku_key) return;
        const resolvedKey = item.sku_key === 'startup' ? ('startup_' + (item.tier || 'voice')) : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        fields.forEach(f => {
          if (!f.note?.includes('Add-on') && item.values[f.id] === undefined && f.value !== undefined) {
            item.values[f.id] = f.value;
          }
        });
      });

      // Show bundle tab switcher
      const tabSwitcher = document.getElementById('bundle-tab-switcher');
      if (tabSwitcher) tabSwitcher.style.display = 'block';

      // Hide multi-sku toggle label (same as toggleBundleCompareMode does)
      const multiSkuLabel = document.getElementById('toggle-multi-sku-mode')?.closest('label');
      if (multiSkuLabel) multiSkuLabel.style.display = 'none';

      // Show SKU item manager
      const manager = document.getElementById('sku-item-manager');
      if (manager) manager.style.display = '';

      renderBundleTabSwitcher();
      renderSkuItemManager();
      renderSkuSelector();

      // Render the config form for the active bundle's first item
      if (QG.currentSku) {
        if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) renderTierSelector();
        else {
          const cfgArea = document.getElementById('sku-config-area');
          if (cfgArea) cfgArea.innerHTML = '';
          renderSkuForm(QG.currentSku, QG.currentTier);
        }
      }

    } else if (data.sku_items && data.sku_items.length > 0) {
      // ── Standard (non-bundle) quote restore ───────────────────────
      QG.skuItems = data.sku_items;
      QG.activeItemId = data.sku_items[0].id;
      QG.lockedEntity = data.entity || (SKUS.find(s => s.key === data.sku_items[0].sku_key)?.entity);
      syncActiveAliases();

      // Hydrate missing field defaults
      QG.skuItems.forEach(item => {
        if (!item.sku_key) return;
        const resolvedKey = item.sku_key === 'startup'
          ? ('startup_' + (item.tier || 'voice'))
          : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        fields.forEach(f => {
          if (!f.note?.includes('Add-on') && item.values[f.id] === undefined && f.value !== undefined) {
            item.values[f.id] = f.value;
          }
        });
      });

      renderSkuItemManager();
      renderSkuSelector();
      if (QG.currentSku) {
        if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) renderTierSelector();
        else {
          const cfgArea = document.getElementById('sku-config-area');
          if (cfgArea) cfgArea.innerHTML = '';
          renderSkuForm(QG.currentSku, QG.currentTier);
        }
      }
    } else {
      selectSku(data.sku_key);
      if (data.tier) selectTier(data.tier);
    }

    setTimeout(() => {
      // Set Client Fields
      ['company', 'contact', 'email', 'phone', 'tenantid'].forEach(k => {
        const clientKey = k === 'tenantid' ? 'tenantId' : k;
        const el = document.getElementById('q-client-' + k);
        if (el && data.client?.[clientKey]) el.value = data.client[clientKey];
      });

      // Set SKU Fields
      if (data.fields) {
        Object.assign(QG.skuValues, data.fields);
        Object.keys(data.fields).forEach(fid => {
          const inp = document.getElementById('qf_' + fid);
          if (inp) inp.value = data.fields[fid];
        });
      }

      // Record that we are now in edit mode
      QG.currentQuoteId = q.id;
      QG.quoteNumber = q.quote_number;

      // Update button text to reflect edit mode
      const genBtn = document.getElementById('q-btn-generate');
      if (genBtn) genBtn.textContent = 'Update Quote';

      // Override Quote Metadata for this specific past quote
      const qNumEl = document.getElementById('q-quote-number');
      const dateEl = document.getElementById('q-date');
      const seNameEl = document.getElementById('q-se-name');
      const seEmailEl = document.getElementById('q-se-email');
      const sePhoneEl = document.getElementById('q-se-phone');

      if (qNumEl) qNumEl.textContent = q.quote_number;
      if (dateEl) dateEl.textContent = new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (seNameEl && data.sales_engineer?.name) seNameEl.textContent = data.sales_engineer.name;
      if (seEmailEl) seEmailEl.textContent = q.user_email;
      if (sePhoneEl && data.sales_engineer?.phone) sePhoneEl.value = data.sales_engineer.phone;

      // Disable 'Generate' button / draft button to prevent overwriting past quote as a new draft maybe?
      // Actually we can just leave it enabled so they can duplicate.

      updatePreview();

      // Scroll preview to top
      const previewPanel = document.querySelector('.quote-preview-panel');
      if (previewPanel) previewPanel.scrollTop = 0;

    }, 400);

  } catch (e) {
    console.error(e);
    showAlert('Failed to load quote details.', { type: 'error', title: 'Error' });
  }
};

// -- Load Drafts --------------------------------------------
async function loadDrafts() {
  const container = document.getElementById('drafts-list');
  try {
    const res = await fetch('/api/drafts');
    const drafts = await res.json();
    document.getElementById('drafts-count').textContent = drafts.length;
    if (!drafts.length) { container.innerHTML = `<div class="q-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><h3>No saved drafts</h3><p>Save a draft while creating a quote.</p></div>`; return; }
    container.innerHTML = drafts.map(d => {
      const data = typeof d.draft_data === 'string' ? JSON.parse(d.draft_data) : d.draft_data;
      const modified = new Date(d.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const expiry = new Date(new Date(d.updated_at).getTime() + 48 * 3600000);
      const hoursLeft = Math.max(0, Math.round((expiry - Date.now()) / 3600000));
      return `
        <div class="draft-list-item">
          <div class="draft-list-icon">??</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.9rem;color:#0f172a;">${sanitize(data?.client?.company || 'Untitled Draft')}</div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">SKU: ${sanitize(data?.sku_key || '-')} &nbsp;|&nbsp; Modified: ${modified}</div>
            <div style="font-size:0.75rem;color:${hoursLeft < 12 ? '#ef4444' : '#94a3b8'};margin-top:2px;">? Expires in ~${hoursLeft}h</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary" style="padding:6px 12px;font-size:0.8rem;" onclick="resumeDraft(${d.id})">Resume</button>
            <button class="btn btn-reset" style="padding:6px 12px;font-size:0.8rem;" onclick="deleteDraft(${d.id})">Delete</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Failed to load drafts.</p>'; }
}

window.resumeDraft = async function (id) {
  try {
    const res = await fetch('/api/drafts');
    const drafts = await res.json();
    const d = drafts.find(x => x.id === id);
    if (!d) return;
    const data = typeof d.draft_data === 'string' ? JSON.parse(d.draft_data) : d.draft_data;
    // Switch to New Quote tab
    document.querySelector('[data-qtab="new-quote"]').click();
    // Select SKU
    if (data.sku_items && data.sku_items.length > 0) {
      QG.skuItems = data.sku_items;
      QG.activeItemId = data.sku_items[0].id;
      QG.lockedEntity = data.entity || (SKUS.find(s => s.key === data.sku_items[0].sku_key)?.entity);
      syncActiveAliases();
      // Hydrate missing field defaults (same fix as viewQuote)
      QG.skuItems.forEach(item => {
        if (!item.sku_key) return;
        const resolvedKey = item.sku_key === 'startup' ? ('startup_' + (item.tier || 'voice')) : item.sku_key;
        const fields = getSkuFields(resolvedKey, item.tier || 'dabbler');
        fields.forEach(f => {
          if (!f.note?.includes('Add-on') && item.values[f.id] === undefined && f.value !== undefined) {
            item.values[f.id] = f.value;
          }
        });
      });
      renderSkuItemManager();
      renderSkuSelector();
      if (QG.currentSku) {
        if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers) renderTierSelector();
        else {
          const cfgArea = document.getElementById('sku-config-area');
          if (cfgArea) cfgArea.innerHTML = '';
          renderSkuForm(QG.currentSku, QG.currentTier);
        }
      }
    } else {
      selectSku(data.sku_key);
      if (data.tier) selectTier(data.tier);
    }
    // Fill client fields
    setTimeout(() => {
      ['company', 'contact', 'email', 'phone', 'tenantid'].forEach(k => {
        const clientKey = k === 'tenantid' ? 'tenantId' : k;
        const el = document.getElementById('q-client-' + k);
        if (el && data.client?.[clientKey]) el.value = data.client[clientKey];
      });
      // Restore field values
      if (data.fields) {
        Object.assign(QG.skuValues, data.fields);
        Object.keys(data.fields).forEach(fid => {
          const inp = document.getElementById('qf_' + fid);
          if (inp) inp.value = data.fields[fid];
        });
      }
      updatePreview();
    }, 400);
  } catch (e) { showAlert('Failed to resume draft.', { type: 'error', title: 'Error' }); }
};

window.deleteDraft = async function (id) {
  await fetch('/api/drafts/' + id, { method: 'DELETE' });
  loadDrafts();
  updateNavCounters();
};

// -- Load Approvals (Admin) ---------------------------------
async function loadApprovals() {
  const container = document.getElementById('approvals-list');
  try {
    const res = await fetch('/api/admin/approval-requests');
    if (!res.ok) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Access denied.</p>'; return; }
    const items = await res.json();
    const pending = items.filter(x => !x.cleared).length;
    const aBadge = document.getElementById('approvals-count');
    if (aBadge) aBadge.textContent = pending;
    if (!items.length) { container.innerHTML = `<div class="q-empty-state"><h3>No stop-lock overrides recorded</h3></div>`; return; }
    container.innerHTML = items.map(r => `
      <div class="approval-req-row${r.cleared ? ' cleared' : ''}">
        <div style="flex:1;">
          <strong>${sanitize(r.user_email)}</strong>
          <span style="margin:0 8px;color:#94a3b8;">|</span>
          <span>${sanitize(r.sku_name)} ? ${sanitize(r.field_name)}: <strong>${sanitize(r.field_value)}</strong></span>
          <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">${new Date(r.created_at).toLocaleString('en-IN')} ${r.cleared ? ' ? Cleared by ' + sanitize(r.cleared_by) : ''}</div>
        </div>
        ${!r.cleared ? `<button class="btn btn-secondary" style="padding:5px 10px;font-size:0.8rem;" onclick="clearApproval(${r.id})">Mark Cleared</button>` : ''}
      </div>`).join('');
  } catch (e) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Failed to load approvals.</p>'; }
}

window.clearApproval = async function (id) {
  await fetch('/api/admin/approval-requests/' + id + '/clear', { method: 'POST' });
  loadApprovals();
  updateNavCounters();
};

// -- Manager Approval Modal Logic ---------------------------
async function showApprovalModal(violations) {
  return new Promise((resolve) => {
    const modal = document.getElementById('q-approval-modal');
    const container = document.getElementById('q-modal-violations-list');
    const cancel = document.getElementById('q-modal-cancel');
    const approve = document.getElementById('q-modal-approve');

    if (container) {
      container.innerHTML = violations.map(v => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f1f5f9;">
          <span style="font-weight:600; font-size:0.85rem; color:#475569;">${sanitize(v.field.label)}</span>
          <span style="font-family:monospace; background:#fff; padding:2px 8px; border-radius:4px; font-size:0.85rem; border:1px solid #e2e8f0;">${sanitize(v.value)}</span>
        </div>
      `).join('');
    }

    modal.classList.remove('hidden');

    const onCancel = () => {
      modal.classList.add('hidden');
      cleanup();
      resolve(false);
    };
    const onApprove = async () => {
      approve.disabled = true;
      approve.textContent = '...';

      // Delay slightly for UX
      await new Promise(r => setTimeout(r, 600));

      modal.classList.add('hidden');
      approve.disabled = false;
      approve.textContent = 'Confirm & Proceed';
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      cancel.removeEventListener('click', onCancel);
      approve.removeEventListener('click', onApprove);
    };

    cancel.addEventListener('click', onCancel);
    approve.addEventListener('click', onApprove);
  });
}

// -- Log Stop-Lock Override ---------------------------------
async function logStopLockOverride(field, value) {
  try {
    const sku = SKUS.find(s => s.key === QG.currentSku);
    await fetch('/api/approval-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_number: QG.quoteNumber,
        sku_name: sku?.label || QG.currentSku,
        field_name: field.label,
        field_value: value
      })
    });
    updateNavCounters();
  } catch (e) {
    console.error('Failed to log override:', e);
  }
}

// -- SKU Request Modal Logic --------------------------------
window.openSkuRequestModal = function () {
  const modal = document.getElementById('q-sku-request-modal');
  const nameInput = document.getElementById('q-sku-request-name');
  const descInput = document.getElementById('q-sku-request-desc');
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
  if (modal) modal.classList.remove('hidden');
  if (nameInput) nameInput.focus();
};

window.closeSkuRequestModal = function () {
  const modal = document.getElementById('q-sku-request-modal');
  if (modal) modal.classList.add('hidden');
};

window.submitSkuRequestForm = async function () {
  const name = document.getElementById('q-sku-request-name')?.value?.trim();
  const desc = document.getElementById('q-sku-request-desc')?.value?.trim();
  const btn = document.getElementById('q-sku-request-submit');

  if (!name) {
    showAlert('Please enter a SKU name.', { type: 'warning', title: 'Missing Name' });
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/sku-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku_name: name, description: desc })
    });

    if (res.ok) {
      showAlert('SKU request submitted successfully!', { type: 'success', title: 'Request Sent!' });
      closeSkuRequestModal();
      updateNavCounters();
      // If admin is viewing the tab, refresh it
      if (QG.isAdmin) loadRequestedSkus();
    } else {
      throw new Error('Failed to submit request');
    }
  } catch (e) {
    showAlert('Error submitting request: ' + e.message, { type: 'error', title: 'Error' });
  } finally {
    if (btn) btn.disabled = false;
  }
};

// -- Requested SKUs Tab (Admin) ----------------------------
async function loadRequestedSkus() {
  const container = document.getElementById('sku-requests-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/sku-requests');
    if (!res.ok) {
      container.innerHTML = '<p style="color:#ef4444;padding:24px;">Access denied or failed to load.</p>';
      return;
    }
    const requests = await res.json();
    const pending = requests.filter(x => x.status === 'pending').length;
    const sBadge = document.getElementById('sku-requests-count');
    if (sBadge) sBadge.textContent = pending;
    renderSkuRequests(requests);
  } catch (e) {
    container.innerHTML = '<p style="color:#ef4444;padding:24px;">Error loading SKU requests.</p>';
  }
}

function renderSkuRequests(requests) {
  const container = document.getElementById('sku-requests-list');
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = `
      <div class="q-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3>No SKU requests yet</h3>
        <p>Requests from the sales team will appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = requests.map(r => {
    const isResolved = r.status === 'resolved';
    const badgeColor = isResolved ? '#dcfce7' : '#fef3c7';
    const textColor = isResolved ? '#166534' : '#92400e';

    return `
    <div class="quote-list-item">
      <div style="flex:1;">
        <div style="font-weight:600; font-size:1.05rem; color:#0f172a;">${sanitize(r.sku_name)}</div>
        <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">Requested by: <strong>${sanitize(r.user_email)}</strong></div>
        ${r.description ? `<div style="font-size:0.85rem; color:#94a3b8; margin-top:4px; padding:8px; background:#f8fafc; border-radius:4px; border-left:3px solid #cbd5e1;">${sanitize(r.description)}</div>` : ''}
      </div>
      <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <div style="font-size:0.75rem; color:#94a3b8;">${new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <span class="admin-badge" style="background:${badgeColor}; color:${textColor};">${sanitize(r.status).toUpperCase()}</span>
        ${!isResolved ? `<button class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem; margin-top:4px;" onclick="resolveSkuRequest(${r.id}, this)">Mark Done</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

window.resolveSkuRequest = async function (id, btn) {
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.textContent = '...';
  }

  try {
    const res = await fetch(`/api/admin/sku-requests/${id}/resolve`, { method: 'POST' });
    if (res.ok) {
      loadRequestedSkus(); // Refresh list
      updateNavCounters();
    } else {
      const err = await res.json().catch(() => ({ error: 'Server error (' + res.status + ')' }));
      console.error('Resolve failed:', err.error || 'Unknown error');
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'Retry';
        showAlert('Failed: ' + (err.error || 'Check console'), { type: 'error', title: 'Error' });
      }
    }
  } catch (e) {
    console.error('Network error during resolve:', e);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Error';
      showAlert('Network Error connecting to server.', { type: 'error', title: 'Network Error' });
    }
  }
};

// -- Reset Form ---------------------------------------------
function resetQuoteForm() {
  // ── Unwind all mode toggles first (order matters) ──────────
  if (QG.bundleCompareMode) {
    const cb = document.getElementById('toggle-bundle-compare-mode');
    if (cb) cb.checked = false;
    window.toggleBundleCompareMode(false);
  }
  if (QG.compareMode) {
    window.toggleCompareMode(false);
  }
  if (QG.multiSkuMode) {
    const cb = document.getElementById('toggle-multi-sku-mode');
    if (cb) cb.checked = false;
    window.toggleMultiSkuMode(false);
  }

  // ── Clear core SKU + quote state ───────────────────────────
  initSkuItems();
  QG.draftKey = null;
  QG._dirty = false;
  QG.currentQuoteId = null;   // exit edit mode
  QG._renamingItemId = null;

  // Clear SKU selector highlights and config area
  document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) cfgArea.innerHTML = '';

  // Hide bundle tab switcher
  const tabSwitcher = document.getElementById('bundle-tab-switcher');
  if (tabSwitcher) tabSwitcher.style.display = 'none';

  // Clear client fields
  ['q-client-company', 'q-client-contact', 'q-client-email', 'q-client-phone', 'q-client-tenantid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Reset entity badge
  updateEntityBadge('Exotel');

  // Re-render SKU manager (clears item list UI)
  renderSkuItemManager();
  renderSkuSelector();

  // Get a fresh quote number from server
  initQuoteNumber();

  // Refresh preview (shows empty state)
  updatePreview();

  // Refresh the My Quotes / Drafts counters so badge numbers are current
  updateNavCounters();

  // Scroll preview panel back to top
  const previewPanel = document.querySelector('.quote-preview-panel');
  if (previewPanel) previewPanel.scrollTop = 0;
}

// -- Reset Quote Counter ------------------------------------
window.resetMyCounter = async function () {
  if (!await showConfirm('Reset your quote counter? Your next quote number will start fresh from -01. This does NOT delete any existing quotes.', { title: 'Reset Counter', confirmText: 'Reset', type: 'warning', danger: false })) return;
  try {
    const res = await fetch('/api/quotes/reset-counter', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    // Get a fresh quote number immediately
    await initQuoteNumber();
    showAlert('Quote counter reset! Your next quote number is: ' + (document.getElementById('q-quote-number')?.textContent || ''), { type: 'success', title: 'Counter Reset' });
  } catch (e) {
    showAlert('Failed to reset counter: ' + e.message, { type: 'error', title: 'Error' });
  }
};

// -- Reset ALL Counters (admin only) ------------------------
window.resetAllCounters = async function () {
  if (!await showConfirm('ADMIN: Reset ALL users quote counters to 0? This affects everyone. Proceed?', { title: 'Admin Reset All Counters', confirmText: 'Reset All', danger: true, type: 'warning' })) return;
  try {
    const res = await fetch('/api/admin/reset-all-counters', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    await initQuoteNumber();
    showAlert('All quote counters have been reset! Next quote number: ' + (document.getElementById('q-quote-number')?.textContent || ''), { type: 'success', title: 'Reset Done' });
  } catch (e) {
    showAlert('Failed: ' + e.message, { type: 'error', title: 'Error' });
  }
};

// -- Init Quote Number --------------------------------------
async function initQuoteNumber() {
  try {
    const res = await fetch('/api/quotes/next-number', { method: 'POST' });
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    if (!data.quote_number) throw new Error('Missing quote number');
    QG.quoteNumber = data.quote_number;
    const el = document.getElementById('q-quote-number');
    if (el) el.textContent = data.quote_number;
  } catch (e) {
    console.error("Failed to fetch quote number:", e);
    QG.quoteNumber = 'QUO-' + Date.now();
    const el = document.getElementById('q-quote-number');
    if (el) el.textContent = QG.quoteNumber;
  }
}

// -- Profile Setup ------------------------------------------
async function initProfile() {
  try {
    const res = await fetch('/api/user-profile');
    const profile = await res.json();
    QG.profile = profile;
    const nameEl = document.getElementById('q-se-name');
    const emailEl = document.getElementById('q-se-email');
    if (nameEl) nameEl.textContent = profile.display_name || '-';
    if (emailEl) emailEl.textContent = profile.email || '-';
    // Populate new phone display span
    const phoneText = document.getElementById('q-se-phone-text');
    const phoneInput = document.getElementById('q-se-phone');
    const savedPhone = profile.phone || '';
    if (phoneText) phoneText.textContent = savedPhone || '—';
    if (phoneInput) phoneInput.value = savedPhone;
    // Show prompt if no phone
    const prompt = document.getElementById('q-profile-prompt');
    if (prompt && !savedPhone) prompt.classList.remove('hidden');
  } catch (e) { /* silent */ }
}

function openPhoneEdit() {
  const display = document.getElementById('q-se-phone-display');
  const edit = document.getElementById('q-se-phone-edit');
  const input = document.getElementById('q-se-phone');
  if (display) display.style.display = 'none';
  if (edit) edit.style.display = '';
  if (input) {
    // Pre-fill with current displayed value
    const currentText = document.getElementById('q-se-phone-text')?.textContent;
    if (currentText && currentText !== '—') input.value = currentText;
    input.focus();
    input.select();
  }
}

function closePhoneEdit() {
  const display = document.getElementById('q-se-phone-display');
  const edit = document.getElementById('q-se-phone-edit');
  if (display) display.style.display = 'flex';
  if (edit) edit.style.display = 'none';
}

async function saveProfilePhone() {
  const phone = (document.getElementById('q-profile-phone')?.value?.trim()) ||
                (document.getElementById('q-se-phone')?.value?.trim());
  if (!phone) { showAlert('Please enter a phone number to save.', { type: 'warning', title: 'No Number' }); return; }
  const btn = document.getElementById('q-save-profile');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const res = await fetch('/api/user-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    const savedPhone = data.phone || phone;
    // Update the display span
    const phoneText = document.getElementById('q-se-phone-text');
    if (phoneText) phoneText.textContent = savedPhone;
    // Update the hidden input value for the quote
    const phoneInput = document.getElementById('q-se-phone');
    if (phoneInput) phoneInput.value = savedPhone;
    // Switch back to display mode
    closePhoneEdit();
    document.getElementById('q-profile-prompt')?.classList.add('hidden');
    showAlert('Phone number saved!', { type: 'success', title: 'Saved' });
    updatePreview();
  } catch (e) {
    showAlert('Could not save: ' + e.message, { type: 'error', title: 'Save Failed' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}

// -- Main Init ----------------------------------------------

// ── Easter Egg: Voice AI ─────────────────────────────────────
// Type "shwarp" while NOT focused on any input to reveal Voice AI banner
(function setupVoiceAIEasterEgg() {
  const EASTER_EGG = 'shwarp';
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    // Only track if no input/textarea is focused
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    buffer += e.key;
    // Keep buffer trimmed to length of secret
    if (buffer.length > EASTER_EGG.length) buffer = buffer.slice(-EASTER_EGG.length);

    if (buffer === EASTER_EGG) {
      const banner = document.getElementById('q-ai-banner');
      if (banner) {
        const isHidden = banner.classList.toggle('hidden');
        if (!isHidden) {
          // Glow flash when revealed
          banner.style.transition = 'box-shadow 0.3s';
          banner.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.6)';
          setTimeout(() => { banner.style.boxShadow = ''; }, 800);
        }
      }
      buffer = '';
    }
  });
})();

// ── AI Voice Generation ──────────────────────────────────────
function setupAIVoice() {
  const btnStart = document.getElementById('btn-ai-voice');
  const btnStop = document.getElementById('btn-stop-ai-voice');
  const overlay = document.getElementById('ai-listening-overlay');
  const textEl = document.getElementById('ai-listening-text');

  if (!btnStart || !overlay || !btnStop) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    btnStart.style.display = 'none'; // Hide if browser doesn't support audio recording
    return;
  }

  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let stream = null;

  btnStart.addEventListener('click', async () => {
    if (isRecording) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Let browser choose best mimeType, favor webm
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported('audio/webm') && !MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = ''; // Let it default
      }

      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstart = () => {
        isRecording = true;
        overlay.classList.remove('hidden');
        textEl.innerHTML = 'Listening intently directly to your voice...<br><small style="font-size:0.75rem;">(Powered by Gemini Multimodal AI)</small>';
        btnStop.textContent = 'Stop & Parse';
        btnStop.disabled = false;
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());

        btnStop.disabled = true;
        btnStop.textContent = 'Parsing via AI...';
        textEl.textContent = 'Uploading voice data to Gemini. Please wait...';

        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || mimeType });
        
        if (audioBlob.size === 0) {
            textEl.textContent = 'No audio detected.';
            setTimeout(() => overlay.classList.add('hidden'), 1500);
            return;
        }

        try {
          // Convert Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
             const base64data = reader.result.split(',')[1];
             
             const availableSkus = SKUS.map(s => ({ key: s.key, name: s.label }));
             
             const res = await fetch('/api/ai-quote-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    audioBase64: base64data,
                    mimeType: audioBlob.type,
                    availableSkus: availableSkus
                })
             });

             if (!res.ok) {
                 const errorText = await res.text();
                 let errMsg = errorText;
                 try { errMsg = JSON.parse(errorText).error; } catch(e){}
                 throw new Error(errMsg);
             }

             const data = await res.json();
             applyAIParsedQuote(data);
             overlay.classList.add('hidden');
          };
          reader.onerror = () => {
              throw new Error("Failed to read audio blob");
          };
        } catch (e) {
          console.error(e);
          showAlert('Failed to parse quote: ' + e.message, { type: 'error', title: 'Parse Error' });
          overlay.classList.add('hidden');
        }
      };

      mediaRecorder.start();

    } catch (e) {
      console.error("Microphone access denied or error:", e);
      showAlert('Could not access microphone: ' + e.message, { type: 'error', title: 'Mic Error' });
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
  });
}

function applyAIParsedQuote(data) {
  if (data.companyName) {
    const cp = document.getElementById('q-client-company');
    if (cp) {
        cp.value = data.companyName;
        // manually dispatch input event so updatePreview catches it
        cp.dispatchEvent(new Event('input')); 
    }
  }

  if (!data.skus || data.skus.length === 0) {
    showAlert("AI couldn't extract any recognizable product plans from your dictation.", { type: 'warning', title: 'No Plans Found' });
    return;
  }

  // Determine if compare mode or multi-sku is needed
  let isCompare = data.compareMode === true;
  
  if (isCompare) {
    const tglMulti = document.getElementById('toggle-multi-sku-mode');
    if (tglMulti) tglMulti.checked = false;
    window.toggleMultiSkuMode(false);
  } else if (data.skus.length > 1) {
    const tgl = document.getElementById('toggle-multi-sku-mode');
    if (tgl) tgl.checked = true;
    window.toggleMultiSkuMode(true);
  } else {
    const tgl = document.getElementById('toggle-multi-sku-mode');
    if (tgl) tgl.checked = false;
    window.toggleMultiSkuMode(false);
  }

  // Clear existing items and reset state
  QG.skuItems = [];
  QG.lockedEntity = null;
  QG.currentSku = null;

  data.skus.forEach((aiSku, idx) => {
    // We now have the exact skuKey from Gemini!
    let skuKey = aiSku.skuKey || 'voice_exotel_std'; // default fallback
    
    // Ensure the key exists in our system, if not fallback
    if (!SKUS.find(s => s.key === skuKey)) {
        skuKey = 'voice_exotel_std';
    }

    let tier = 'dabbler';
    const t = (aiSku.tier || '').toLowerCase();
    if (t.includes('believer')) tier = 'believer';
    if (t.includes('influencer')) tier = 'influencer';

    const itemId = 'item_' + Date.now() + '_' + idx;
    const newItem = _makeItem(itemId);
    newItem.sku_key = skuKey;
    newItem.tier = tier;
    
    // Apply dynamic configurations directly if the AI found overrides!
    if (aiSku.configurationOverrides && Array.isArray(aiSku.configurationOverrides)) {
        aiSku.configurationOverrides.forEach(override => {
            if (override.key && override.value !== undefined) {
               newItem.values[override.key] = override.value;
            }
        });
    }

    QG.skuItems.push(newItem);

    // If first item, lock entity
    if (idx === 0) {
        QG.activeItemId = itemId;
        const skuDef = SKUS.find(s => s.key === skuKey);
        if (skuDef && QG.multiSkuMode) {
             QG.lockedEntity = skuDef.entity;
        }
    }
  });

  // Re-sync aliases with the newly loaded first item
  syncActiveAliases();
  
  if (isCompare && ['voice_exotel_std', 'voice_veeno_std', 'sip_veeno'].includes(QG.skuItems[0]?.sku_key)) {
     // Switch to compare mode
     const tglCmp = document.getElementById('toggle-compare-mode');
     if (tglCmp) tglCmp.checked = true;
     
     // Set QG.currentSku
     QG.currentSku = QG.skuItems[0].sku_key;

     // Read extracted tiers to pre-check the correct boxes
     const tDab = document.getElementById('ct-dabbler');
     const tBel = document.getElementById('ct-believer');
     const tInf = document.getElementById('ct-influencer');
     if (tDab) tDab.checked = data.skus.some(s => (s.tier||'').toLowerCase().includes('dabbler'));
     if (tBel) tBel.checked = data.skus.some(s => (s.tier||'').toLowerCase().includes('believer'));
     if (tInf) tInf.checked = data.skus.some(s => (s.tier||'').toLowerCase().includes('influencer'));
     
     // If none checked (e.g. they just said "Compare plans"), check all 3
     if (tDab && tBel && tInf && !tDab.checked && !tBel.checked && !tInf.checked) {
         tDab.checked = true; tBel.checked = true; tInf.checked = true;
     }

     window.toggleCompareMode(true);
  } else {
     renderSkuItemManager();
     renderSkuSelector();
  }
  
  // Re-render form for active item
  const skuDef = SKUS.find(s => s.key === QG.currentSku);
  const cfgArea = document.getElementById('sku-config-area');
  
  if (!isCompare) {
      if (skuDef?.hasTiers && !QG.compareMode) {
         renderTierSelector();
      } else {
         if (cfgArea) cfgArea.innerHTML = '';
         renderSkuForm(QG.currentSku, QG.currentTier);
      }
  }
  updateEntityBadge(skuDef ? skuDef.entity : 'Exotel');

  // Attempt to apply extracted quantities
  setTimeout(() => {
    data.skus.forEach((aiSku, idx) => {
        const item = QG.skuItems[idx];
        if (!item) return;
        let qty = aiSku.users || aiSku.quantity;
        if (!qty) return;

        // Set the value directly in the item state (applies to all SKUs based on primary quantity fields)
        if (qty) {
            const fields = getSkuFields(item.sku_key, item.tier);
            const primaryKeys = ['num_users', 'free_users', 'num_channels', 'num_numbers'];
            for (const key of primaryKeys) {
                if (fields.some(f => f.id === key)) {
                    item.values[key] = qty;
                    break; // Apply to the first matched primary field and stop
                }
            }
        }
    });
    
    // Re-render the form with the newly populated values
    const cfgArea = document.getElementById('sku-config-area');
    const skuDef = SKUS.find(s => s.key === QG.currentSku);
    if (!isCompare) {
        if (skuDef?.hasTiers && !QG.compareMode) {
            renderTierSelector();
        } else {
            if (cfgArea) cfgArea.innerHTML = '';
            renderSkuForm(QG.currentSku, QG.currentTier);
        }
    }
    
    updatePreview();
    showAlert('Quote Auto-Generated Successfully from Voice AI! Check the right preview panel.', { type: 'success', title: 'Voice Quote Ready!' });
  }, 250);
}

async function updateNavCounters() {
  try {
    const fetches = [
      fetch('/api/quotes').catch(() => null),
      fetch('/api/drafts').catch(() => null)
    ];

    // Only fetch admin counters if we know we are admin
    if (QG.isAdmin) {
      fetches.push(fetch('/api/admin/approval-requests').catch(() => null));
      fetches.push(fetch('/api/admin/sku-requests').catch(() => null));
      fetches.push(fetch('/api/quotes/admin').catch(() => null));
    }

    const [qRes, dRes, aRes, sRes, allQRes] = await Promise.all(fetches);

    if (qRes && qRes.ok) {
      const quotes = await qRes.json();
      const mine = quotes.filter(q => q.status !== 'deleted');
      const countEl = document.getElementById('my-quotes-count');
      if (countEl) countEl.textContent = mine.length;
    }
    if (dRes && dRes.ok) {
      const drafts = await dRes.json();
      const dBadge = document.getElementById('drafts-count');
      if (dBadge) dBadge.textContent = drafts.length;
    }
    // Admin Badges
    if (aRes && aRes.ok) {
      const approvals = await aRes.json();
      const pending = approvals.filter(x => !x.cleared).length;
      const aBadge = document.getElementById('approvals-count');
      if (aBadge) aBadge.textContent = pending;
    }
    if (sRes && sRes.ok) {
      const skuReqs = await sRes.json();
      const pending = skuReqs.filter(x => x.status === 'pending').length;
      const sBadge = document.getElementById('sku-requests-count');
      if (sBadge) sBadge.textContent = pending;
    }
    if (allQRes && allQRes.ok) {
      const allQuotes = await allQRes.json();
      const allEl = document.getElementById('all-quotes-count');
      if (allEl) allEl.textContent = allQuotes.length;
    }
  } catch (e) { }
}

function setupQuoteGenerator() {
  setupQuoteTabs();
  initSkuItems();
  renderSkuSelector();
  setupAIVoice();

  // Profile phone save
  document.getElementById('q-save-profile')?.addEventListener('click', saveProfilePhone);

  // Phone field unlock (mobile for SE)
  document.getElementById('q-se-phone')?.closest('.q-input-wrapper')?.querySelector('.q-lock-btn')?.addEventListener('click', function () {
    const inp = document.getElementById('q-se-phone');
    inp.disabled = !inp.disabled;
  });
  // Rebind through delegation
  document.addEventListener('click', e => {
    if (e.target.closest('.q-lock-btn')) {
      const btn = e.target.closest('.q-lock-btn');
      const targetId = btn.dataset.target;
      if (!targetId) return;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isLocked = input.disabled;
      input.disabled = !isLocked;
      btn.classList.toggle('unlocked', isLocked);
      btn.innerHTML = isLocked
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
      if (isLocked) input.focus();
    }
  });

  // Client field live preview update
  ['q-client-company', 'q-client-contact', 'q-client-email', 'q-client-phone', 'q-client-tenantid'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
  document.getElementById('q-se-phone')?.addEventListener('input', updatePreview);

  // Generate
  document.getElementById('q-btn-generate')?.addEventListener('click', generateQuote);
  document.getElementById('q-btn-draft')?.addEventListener('click', saveDraft);
  document.getElementById('q-btn-reset')?.addEventListener('click', async () => {
    if (await showConfirm('Reset all fields and start a new quote?', { title: 'New Quote', confirmText: 'Start Fresh', type: 'confirm' })) {
      resetQuoteForm();
    }
  });

  // Refresh buttons
  document.getElementById('q-btn-refresh-quotes')?.addEventListener('click', loadMyQuotes);
  document.getElementById('q-btn-refresh-drafts')?.addEventListener('click', loadDrafts);
  document.getElementById('q-btn-refresh-all-quotes')?.addEventListener('click', loadAllQuotes);
  document.getElementById('q-btn-refresh-approvals')?.addEventListener('click', loadApprovals);

  // Request SKU Modal buttons
  document.getElementById('q-btn-sku-request')?.addEventListener('click', openSkuRequestModal);
  document.getElementById('q-sku-request-cancel')?.addEventListener('click', closeSkuRequestModal);
  document.getElementById('q-sku-request-submit')?.addEventListener('click', submitSkuRequestForm);
  document.getElementById('q-btn-refresh-sku-requests')?.addEventListener('click', loadRequestedSkus);

  // Set date
  const dateEl = document.getElementById('q-date');
  if (dateEl) dateEl.textContent = today();

  // Admin tabs
  fetch('/api/admin/check').then(r => r.json()).then(d => {
    QG.isAdmin = d.isAdmin;
    // Request New SKU button is intentionally kept hidden for all users

    if (d.isAdmin) {
      document.getElementById('qtab-allquotes')?.classList.remove('hidden');
      document.getElementById('qtab-approvals')?.classList.remove('hidden');
      document.getElementById('qtab-skurequests')?.classList.remove('hidden');
    }
    updateNavCounters();
  }).catch(() => {
    updateNavCounters();
  });

  initProfile();
  initQuoteNumber();
  updatePreview();

  // Up/Down arrow keys navigate between focusable fields instead of
  // incrementing/decrementing number input values
  document.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const active = e.target;
    if (!active || !active.matches('input.q-input, select.q-input, textarea.q-input')) return;
    e.preventDefault();

    // Collect all visible, enabled inputs inside the quote applet
    const applet = document.getElementById('quote-applet') || document;
    const focusable = Array.from(
      applet.querySelectorAll('input.q-input:not([disabled]):not([readonly]), select.q-input:not([disabled]), textarea.q-input:not([disabled])')
    ).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    const idx = focusable.indexOf(active);
    if (idx === -1) return;
    const next = e.key === 'ArrowDown'
      ? focusable[idx + 1]
      : focusable[idx - 1];
    if (next) {
      next.focus();
      // Place cursor at end for text inputs
      if (next.type !== 'number') {
        const len = next.value.length;
        next.setSelectionRange(len, len);
      }
    }
  }, true);

  // Set dirty flag when any field changes
  document.getElementById('quote-applet')?.addEventListener('input', () => {
    QG._dirty = true;
  });

  // Fast auto-save draft every 5-10s if explicitly modified
  setInterval(() => {
    if (QG._dirty && QG.currentSku) {
      saveDraft(null, true);
    }
  }, 7000);

  // Sync badges exactly every 15s to catch out-of-band updates across tabs
  setInterval(updateNavCounters, 15000);

  // ── Return-to-draft after session expiry ──────────────────
  const pendingDraftKey = localStorage.getItem('returnToDraft');
  if (pendingDraftKey) {
    localStorage.removeItem('returnToDraft');
    // Navigate to drafts tab and show a notification
    setTimeout(() => {
      document.getElementById('qtab-drafts')?.click();
      if (typeof showToast === 'function') {
        showToast('📄 Your draft was auto-saved before your session expired. Find it in the Drafts tab.', 'info');
      }
    }, 800);
  }
}

// Hook into DOMContentLoaded (app.js already calls it, so we hook in)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupQuoteGenerator);
} else {
  setupQuoteGenerator();
}

