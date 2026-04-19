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
  skuItems: [],            // array of { id, sku_key, tier, values, stopLockOverrides }
  activeItemId: null,      // id of item currently being edited
  lockedEntity: null,      // 'Exotel' | 'Veeno' | null - entity of first SKU selected
  compareMode: false,
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

const SKUS = [
  { key: 'voice_exotel_std', label: 'Voice STD', sub: 'Minute Based', entity: 'Exotel', icon: I_PHONE, hasTiers: true },
  { key: 'voice_exotel_user', label: 'Voice User', sub: 'User Based', entity: 'Exotel', icon: I_USERS, hasTiers: false },
  { key: 'voice_exotel_tfn', label: 'Toll-Free (TFN)', sub: 'Exotel', entity: 'Exotel', icon: I_MOBILE, hasTiers: false },
  { key: 'voice_exotel_stream', label: 'Web Streaming', sub: 'WebSocket / Bot', entity: 'Exotel', icon: I_GLOBE, hasTiers: false },
  { key: 'sms_exotel', label: 'SMS Plan', sub: 'Exotel SMS', entity: 'Exotel', icon: I_MSG, hasTiers: false },
  { key: 'whatsapp_exotel', label: 'WhatsApp Plan', sub: 'Exotel WA', entity: 'Exotel', icon: I_WA, hasTiers: false },
  { key: 'rcs_exotel', label: 'RCS Plan', sub: 'Exotel RCS', entity: 'Exotel', icon: I_DIAMOND, hasTiers: false },
  { key: 'voice_veeno_std', label: 'Voice STD', sub: 'Minute Based', entity: 'Veeno', icon: I_PHONE, hasTiers: true },
  { key: 'voice_veeno_user', label: 'Voice User', sub: 'User Based', entity: 'Veeno', icon: I_USERS, hasTiers: false },
  { key: 'sip_veeno', label: 'SIP Lines', sub: 'WebRTC / Browser', entity: 'Veeno', icon: I_MONITOR, hasTiers: true },
  { key: 'num_1400', label: '1400 Series', sub: 'Veeno Number', entity: 'Veeno', icon: I_HASH, hasTiers: false },
  { key: 'num_1600', label: '1600 Series', sub: 'Veeno Number', entity: 'Veeno', icon: I_HASH, hasTiers: false },
];

// Tier defaults
const TIER_DEFAULTS = {
  dabbler: { validity: 5, rental: 4999, free_users: 3, users_stop: 5, free_numbers: 1, credits: 5000, single_leg: 60, stop_single: 52 },
  believer: { validity: 11, rental: 10499, free_users: 6, users_stop: 8, free_numbers: 2, credits: 9500, single_leg: 55, stop_single: 52 },
  influencer: { validity: 11, rental: 10499, free_users: null, users_stop: null, free_numbers: 10, credits: 39000, single_leg: 52, stop_single: 52 }
};

// Per-SKU default fields: { id, label, value, locked, stopType, stopVal, note, waived, nonEditable }
function getSkuFields(skuKey, tier) {
  const t = TIER_DEFAULTS[tier] || TIER_DEFAULTS.dabbler;
  const sms_field = { id: 'sms_cost', label: 'SMS Cost (p/msg)', value: 21, locked: true, stopType: 'lower', stopVal: 17, note: 'SMS Add-on' };
  const wa_fields = [
    { id: 'wa_utility', label: 'WhatsApp Utility (p/msg)', value: 21, locked: true, stopType: null, nonEditable: true, note: 'WA Add-on' },
    { id: 'wa_promo', label: 'WhatsApp Promo (p/msg)', value: 86, locked: true, stopType: null, nonEditable: true, note: 'WA Add-on' },
    { id: 'wa_api', label: 'WhatsApp API Charge (p/msg, both Utility & Promo)', value: 6, locked: true, stopType: 'lower', stopVal: 4, note: 'WA Add-on' },
  ];

  switch (skuKey) {
    // ── Exotel STD (minute-based, with addons) ──────────────────────
    case 'voice_exotel_std': {
      return [
        { id: 'validity', label: 'Validity (months)', value: t.validity, locked: true, nonEditable: true },
        { id: 'rental', label: 'Account Rental (₹)', value: t.rental, locked: true, nonEditable: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: t.free_users ?? 'Unlimited', locked: true, stopType: t.users_stop ? 'upper' : null, stopVal: t.users_stop },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'free_numbers', label: 'Free Numbers', value: t.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: true, stopType: 'lower', stopVal: 299 },
        { id: 'credits', label: 'Call Credits (₹)', value: t.credits, locked: true, stopType: 'lower', stopVal: t.credits },
        { id: 'single_leg', label: 'Single Leg Charge (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
        { id: 'incoming', label: 'Incoming (Single Leg) (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
        { id: 'outgoing', label: 'Outgoing (Double Leg) (p/min)', value: t.single_leg * 2, locked: true, stopType: 'lower', stopVal: t.stop_single * 2 },
        sms_field, ...wa_fields
      ];
    }

    // ── Veeno STD (minute-based, user charge from user 1, no addons) ─
    case 'voice_veeno_std': {
      return [
        { id: 'validity', label: 'Validity (months)', value: t.validity, locked: true, nonEditable: true },
        { id: 'rental', label: 'Account Rental (₹)', value: t.rental, locked: false, stopType: 'lower', stopVal: 0, note: 'Can be waived' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        // No free users - charged from first user, non-waiveable
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 1 },
        {
          id: 'user_charge', label: 'User Charge (₹/user/month)', value: 1000, locked: true, stopType: 'lower', stopVal: 1000,
          note: 'Non-waiveable. Charged from user 1.'
        },
        { id: 'free_numbers', label: 'Free Numbers', value: t.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: true, stopType: 'lower', stopVal: 299 },
        // DID option instead of landline
        { id: 'did_numbers', label: 'DID Numbers (optional)', value: 0, locked: false, note: '₹1,500/DID/month' },
        { id: 'remove_std_numbers', label: 'Remove landline numbers?', value: 0, type: 'boolean', locked: false },
        { id: 'credits', label: 'Call Credits (₹)', value: t.credits, locked: true, stopType: 'lower', stopVal: t.credits },
        { id: 'single_leg', label: 'Single Leg Charge (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
        { id: 'incoming', label: 'Incoming Calls', value: 'Free', locked: true, nonEditable: true },
        { id: 'outgoing', label: 'Outgoing (Single Leg) (p/min)', value: t.single_leg, locked: true, stopType: 'lower', stopVal: t.stop_single },
      ];
    }

    // ── Exotel User-based ───────────────────────────────────────────
    case 'voice_exotel_user':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 5 },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'user_charge', label: 'User Charge (₹/user/month)', value: 2000, locked: true, stopType: 'lower', stopVal: 1600 },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Paid Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Paid Number Cost (₹/number/month)', value: 499, locked: true, stopType: 'lower', stopVal: 299 },
      ];

    // ── Veeno User-based (₹2,000/user, no free users) ───────────────
    case 'voice_veeno_user':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        { id: 'num_users', label: 'No. of Users', value: 5, locked: false, stopType: 'lower', stopVal: 5 },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        {
          id: 'user_charge', label: 'User Charge (₹/user/month)', value: 2000, locked: true, stopType: 'lower', stopVal: 2000,
          note: 'Non-waiveable. Charged from user 1.'
        },
        { id: 'free_numbers', label: 'Free Numbers', value: 1, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: true, stopType: 'lower', stopVal: 299 },
        // DID option
        { id: 'did_numbers', label: 'DID Numbers (optional)', value: 0, locked: false, note: '₹1,500/DID/month' },
        { id: 'remove_std_numbers', label: 'Remove landline numbers?', value: 0, type: 'boolean', locked: false },
      ];

    case 'voice_exotel_tfn':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: 3, locked: false },
        { id: 'extra_user_cost', label: 'Extra User Cost (₹/user/month)', value: 199, locked: true, stopType: 'lower', stopVal: 100 },
        { id: 'num_numbers', label: 'No. of Numbers', value: 1, locked: false },
        { id: 'number_cost', label: 'Number Cost (₹/number/month)', value: 1500, locked: true, stopType: 'lower', stopVal: 1000 },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 39000 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 190, locked: true, stopType: 'lower', stopVal: 150 },
      ];
    case 'voice_exotel_stream':
      return [
        { id: 'rental', label: 'Account Rental (₹)', value: 10499, locked: true, nonEditable: true, waived: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 6, locked: false, stopType: 'lower', stopVal: 3 },
        { id: 'num_channels', label: 'No. of Channels', value: 5, locked: true, stopType: 'lower', stopVal: 3 },
        { id: 'channel_cost', label: 'Channel Cost (₹/channel/month)', value: 1000, locked: true, stopType: 'lower', stopVal: 650 },
        { id: 'credits', label: 'Call Credits (₹)', value: 39000, locked: true, stopType: 'lower', stopVal: 4000 },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: true, stopType: 'lower', stopVal: 16 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 40 },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 5, locked: true, nonEditable: true },
      ];
    case 'sms_exotel':
      return [
        { id: 'rental', label: 'Account Rental (₹/month)', value: 1000, locked: true, stopType: 'lower', stopVal: 0, note: 'Can be waived' },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false },
        { id: 'number_cost', label: 'Number (₹/month)', value: 499, locked: true, note: 'Can be waived' },
        { id: 'credits', label: 'SMS Credits (₹)', value: 10000, locked: true, stopType: 'lower', stopVal: 5000 },
        { id: 'sms_cost', label: 'SMS Cost (p/sms)', value: 21, locked: true, stopType: 'lower', stopVal: 16 },
      ];
    case 'whatsapp_exotel':
      return [
        { id: 'rental', label: 'Account Rental (₹/month)', value: 4000, locked: true, stopType: 'lower', stopVal: 1000 },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'num_months', label: 'No. of Months', value: 3, locked: false },
        { id: 'number_cost', label: 'Number (₹/month)', value: 499, locked: true, note: 'Can be waived' },
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
        { id: 'number_cost', label: 'Number (₹/month)', value: 499, locked: true, note: 'Can be waived' },
        { id: 'credits', label: 'RCS Credits (₹)', value: 35000, locked: true, stopType: 'lower', stopVal: 35000 },
        { id: 'rcs_biz', label: 'RCS Business Msg (p/msg)', value: 22, locked: true, nonEditable: true },
        { id: 'rcs_rich', label: 'RCS Rich Media (p/msg)', value: 28, locked: true, nonEditable: true },
        { id: 'rcs_reply', label: 'User Reply Charge (p/msg)', value: 18, locked: true, nonEditable: true },
      ];
    case 'sip_veeno': {
      const t2 = TIER_DEFAULTS[tier] || TIER_DEFAULTS.dabbler;
      return [
        { id: 'validity', label: 'Validity (months)', value: t2.validity, locked: true, nonEditable: true },
        { id: 'rental', label: 'Account Rental (₹)', value: t2.rental, locked: true, nonEditable: true },
        { id: 'setup', label: 'Setup Charges (₹)', value: 2000, locked: true, nonEditable: true, waived: true },
        { id: 'channels', label: 'Channels', value: 'Unlimited', locked: true, nonEditable: true },
        { id: 'free_users', label: 'Free Users', value: t2.free_users ?? 'Unlimited', locked: true, stopType: t2.users_stop ? 'upper' : null, stopVal: t2.users_stop },
        { id: 'free_numbers', label: 'Free Numbers', value: t2.free_numbers, locked: false },
        { id: 'num_paid_numbers', label: 'No. of Extra Numbers', value: 0, locked: false },
        { id: 'extra_number', label: 'Extra Number Cost (₹/number/month)', value: 499, locked: true, nonEditable: true },
        // DID option
        { id: 'did_numbers', label: 'DID Numbers (optional)', value: 0, locked: false, note: '₹1,500/DID/month' },
        { id: 'credits', label: 'Call Credits (₹)', value: t2.credits, locked: true, stopType: 'lower', stopVal: t2.credits },
        { id: 'incoming', label: 'Incoming (p/min)', value: 20, locked: true, stopType: 'lower', stopVal: 16 },
        { id: 'outgoing', label: 'Outgoing (p/min)', value: 60, locked: true, stopType: 'lower', stopVal: 40 },
        { id: 'attempt', label: 'Attempt Charges (p/failed call)', value: 5, locked: true, nonEditable: true },
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
      ];
    default: return [];
  }
}


// ── Multi-SKU Helpers ──────────────────────────────────────
function _makeItem(id) {
  return { id, sku_key: null, tier: 'dabbler', values: {}, stopLockOverrides: [] };
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

function renderSkuItemManager() {
  const manager = document.getElementById('sku-item-manager');
  const list = document.getElementById('sku-item-list');
  const lockBadge = document.getElementById('sku-entity-lock-badge');
  const lockName = document.getElementById('sku-entity-lock-name');
  const hint = document.getElementById('sku-selector-hint');
  if (!manager || !list) return;

  // Show/hide panel
  const hasSku = QG.skuItems.some(i => i.sku_key);
  manager.style.display = hasSku || QG.skuItems.length > 1 ? '' : 'none';

  // Entity lock badge
  if (QG.lockedEntity && lockBadge && lockName) {
    lockBadge.style.display = '';
    lockName.textContent = QG.lockedEntity;
    if (hint) hint.textContent = `Only ${QG.lockedEntity} plans can be added to this quote.`;
  } else {
    if (lockBadge) lockBadge.style.display = 'none';
    if (hint) hint.textContent = 'Choose the product plan for this quote. The logo and entity will switch automatically.';
  }

  // Item rows
  list.innerHTML = QG.skuItems.map((item, idx) => {
    const sku = SKUS.find(s => s.key === item.sku_key);
    const isActive = item.id === QG.activeItemId;
    const label = sku ? `${sku.label}${item.sku_key && SKUS.find(s => s.key === item.sku_key)?.hasTiers ? ' · ' + (item.tier.charAt(0).toUpperCase() + item.tier.slice(1)) : ''}` : 'Not configured';
    const entityColor = sku?.entity === 'Veeno' ? '#be185d' : '#0369a1';
    const entityBg = sku?.entity === 'Veeno' ? '#fce7f3' : '#e0f2fe';
    return `
      <div class="sku-item-row ${isActive ? 'active' : ''}" onclick="window.switchActiveItem('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isActive ? '#0284c7' : '#e2e8f0'};background:${isActive ? '#f0f9ff' : '#fff'};transition:all 0.15s;">
        <div style="width:8px;height:8px;border-radius:50%;background:${isActive ? '#0284c7' : '#cbd5e1'};flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.88rem;color:${isActive ? '#0284c7' : '#1e293b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sku ? sanitize(label) : '<span style="color:#94a3b8;font-style:italic;">Not configured</span>'}</div>
          ${sku ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:1px;">Item ${idx + 1}${sku ? ' · ' + sku.entity : ''}</div>` : `<div style="font-size:0.72rem;color:#94a3b8;">Item ${idx + 1} - select a SKU below</div>`}
        </div>
        ${sku ? `<span style="padding:2px 7px;border-radius:20px;font-size:0.68rem;font-weight:700;background:${entityBg};color:${entityColor};">${sku.entity}</span>` : ''}
        ${QG.skuItems.length > 1 ? `<button onclick="event.stopPropagation();window.removeSkuItem('${item.id}')" style="width:22px;height:22px;border:none;border-radius:50%;background:#fee2e2;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;font-size:14px;line-height:1;" title="Remove">×</button>` : ''}
      </div>`;
  }).join('');
}

window.addSkuItem = function () {
  const activeItem = getActiveItem();
  if (!activeItem.sku_key) {
    alert('Please select a SKU for the current item before adding another.');
    return;
  }
  const newId = 'item_' + Date.now();
  const newItem = _makeItem(newId);
  newItem.tier = QG.currentTier; // inherit tier
  QG.skuItems.push(newItem);
  QG.activeItemId = newId;
  syncActiveAliases();
  renderSkuItemManager();
  renderSkuSelector(); // re-render filtered SKU grid
  // Clear SKU selection highlight & config area for new item
  document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) cfgArea.innerHTML = '';
  // Scroll left panel to sku selector
  document.getElementById('sku-selector-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.removeSkuItem = function (itemId) {
  if (QG.skuItems.length <= 1) return;
  const idx = QG.skuItems.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  QG.skuItems.splice(idx, 1);
  // If we removed the active item, switch to first item
  if (QG.activeItemId === itemId) {
    QG.activeItemId = QG.skuItems[0].id;
    syncActiveAliases();
    // Re-render the form for the now-active item
    if (QG.currentSku) {
      selectSku(QG.currentSku);
    } else {
      document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
      const cfgArea = document.getElementById('sku-config-area');
      if (cfgArea) cfgArea.innerHTML = '';
    }
  }
  // Update entity lock
  const remaining = QG.skuItems.filter(i => i.sku_key);
  QG.lockedEntity = remaining.length > 0 ? SKUS.find(s => s.key === remaining[0].sku_key)?.entity || null : null;
  renderSkuItemManager();
  renderSkuSelector();
  updatePreview();
};

window.switchActiveItem = function (itemId) {
  if (QG.activeItemId === itemId) return;
  QG.activeItemId = itemId;
  syncActiveAliases();
  renderSkuItemManager();
  // Re-render SKU selector with current active item's selection
  renderSkuSelector();
  // Re-render config form if item has a SKU
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

// ── Tab switching with browser history support ─────────────────
function switchQuoteTab(target, pushHistory = true) {
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
  const list = document.getElementById('sku-item-list');
  if (!list) return;

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
    if (hint) hint.textContent = `You can only add ${QG.lockedEntity} SKUs to this quote.`;
  } else {
    if (lockBadge) lockBadge.style.display = 'none';
    if (hint) hint.textContent = 'Choose the product plan for this quote. The logo and entity will switch automatically.';
  }

  // Item rows
  list.innerHTML = QG.skuItems.map((item, idx) => {
    const sku = SKUS.find(s => s.key === item.sku_key);
    const isActive = item.id === QG.activeItemId;
    const label = sku ? `${sku.label}${item.sku_key && SKUS.find(s => s.key === item.sku_key)?.hasTiers ? ' · ' + (item.tier.charAt(0).toUpperCase() + item.tier.slice(1)) : ''}` : 'Not configured';
    const entityColor = sku?.entity === 'Veeno' ? '#be185d' : '#0369a1';
    const entityBg = sku?.entity === 'Veeno' ? '#fce7f3' : '#e0f2fe';
    return `
      <div class="sku-item-row ${isActive ? 'active' : ''}" onclick="window.switchActiveItem('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isActive ? '#0284c7' : '#e2e8f0'};background:${isActive ? '#f0f9ff' : '#fff'};transition:all 0.15s;">
        <div style="width:8px;height:8px;border-radius:50%;background:${isActive ? '#0284c7' : '#cbd5e1'};flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.88rem;color:${isActive ? '#0284c7' : '#1e293b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sku ? sanitize(label) : '<span style="color:#94a3b8;font-style:italic;">Not configured</span>'}</div>
          ${sku ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:1px;">Item ${idx + 1}${sku ? ' · ' + sku.entity : ''}</div>` : `<div style="font-size:0.72rem;color:#94a3b8;">Item ${idx + 1} - select a SKU below</div>`}
        </div>
        ${sku ? `<span style="padding:2px 7px;border-radius:20px;font-size:0.68rem;font-weight:700;background:${entityBg};color:${entityColor};">${sku.entity}</span>` : ''}
        ${QG.skuItems.length > 1 ? `<button onclick="event.stopPropagation();window.removeSkuItem('${item.id}')" style="width:22px;height:22px;border:none;border-radius:50%;background:#fee2e2;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;font-size:14px;line-height:1;" title="Remove">×</button>` : ''}
      </div>`;
  }).join('');
}

window.addSkuItem = function () {
  const activeItem = getActiveItem();
  if (!activeItem.sku_key) {
    alert('Please select a SKU for the current item before adding another.');
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
};

window.removeSkuItem = function (itemId) {
  if (QG.skuItems.length <= 1) return;
  const idx = QG.skuItems.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  QG.skuItems.splice(idx, 1);
  if (QG.activeItemId === itemId) {
    QG.activeItemId = QG.skuItems[0].id;
    syncActiveAliases();
    if (QG.currentSku) {
      selectSku(QG.currentSku);
    } else {
      document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
      const cfgArea = document.getElementById('sku-config-area');
      if (cfgArea) cfgArea.innerHTML = '';
    }
  }
  const remaining = QG.skuItems.filter(i => i.sku_key);
  QG.lockedEntity = remaining.length > 0 ? SKUS.find(s => s.key === remaining[0].sku_key)?.entity || null : null;
  renderSkuItemManager();
  renderSkuSelector();
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

function renderSkuSelector() {
  const grid = document.getElementById('sku-selector-grid');
  if (!grid) return;
  // Filter by locked entity if applicable
  const filtered = (QG.multiSkuMode && QG.lockedEntity)
    ? SKUS.filter(s => s.entity === QG.lockedEntity || s.entity === 'Both')
    : SKUS.filter(s => !s.hidden);

  grid.innerHTML = filtered.map(s => `
    <div class="sku-option sku-${s.entity.toLowerCase()}${QG.currentSku === s.key ? ' selected' : ''}" data-sku="${s.key}" onclick="selectSku('${s.key}')">
      <div class="sku-option-icon">${s.icon}</div>
      <div>
        <div class="sku-option-label">${sanitize(s.label)}</div>
        <div class="sku-option-sub">${sanitize(s.sub)}</div>
        <span class="sku-entity-tag ${s.entity.toLowerCase()}">${s.entity}</span>
      </div>
    </div>
  `).join('');
}

// ── Select SKU ─────────────────────────────────────────────
function selectSku(key) {
  const sku = SKUS.find(s => s.key === key);
  if (!sku) return;

  // Entity lock enforcement
  if (QG.multiSkuMode && QG.lockedEntity && sku.entity !== QG.lockedEntity) {
    alert(`This quote is locked to ${QG.lockedEntity} plans. Remove all items to start a new quote with a different entity.`);
    return;
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
  const validSkus = ['voice_exotel_std', 'voice_veeno_std', 'sip_veeno'];
  if (QG.compareMode) {
    if (validSkus.includes(key)) {
      if (ctSelector) ctSelector.style.display = 'flex';
      window.updateCompareTiers();
      return; // updateCompareTiers will render everything
    } else {
      if (ctSelector) ctSelector.style.display = 'none';
      QG.compareMode = false;
      document.getElementById('toggle-compare-mode').checked = false;
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
function renderTierSelector() {
  const area = document.getElementById('sku-config-area');
  area.innerHTML = `
    <div class="q-card sku-tier-card">
      <div class="q-card-header">
        <div class="q-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          Select Plan Tier
        </div>
      </div>
      <div class="tier-selector">
        <button class="tier-btn ${QG.currentTier === 'dabbler' ? 'active' : ''}" onclick="selectTier('dabbler')">Dabbler<br><small style="font-weight:400;font-size:0.72rem;">5 months</small></button>
        <button class="tier-btn ${QG.currentTier === 'believer' ? 'active' : ''}" onclick="selectTier('believer')">Believer<br><small style="font-weight:400;font-size:0.72rem;">11 months</small></button>
        <button class="tier-btn ${QG.currentTier === 'influencer' ? 'active' : ''}" onclick="selectTier('influencer')">Influencer<br><small style="font-weight:400;font-size:0.72rem;">11 months</small></button>
      </div>
    </div>
  `;
  renderSkuForm(QG.currentSku, QG.currentTier);
}

function selectTier(tier) {
  const item = getActiveItem();
  item.tier = tier;
  item.values = {};
  QG.currentTier = tier;
  QG.skuValues = item.values;
  document.querySelectorAll('.tier-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().startsWith(tier)));
  renderSkuForm(QG.currentSku, tier);
}

// ── SKU Form Render ────────────────────────────────────────

window.toggleCompareMode = function (enabled) {
  QG.compareMode = enabled;
  const manager = document.getElementById('sku-item-manager');
  const ctSelector = document.getElementById('compare-tier-selector');
  const validSkus = ['voice_exotel_std', 'voice_veeno_std', 'sip_veeno'];

  if (enabled) {
    if (validSkus.includes(QG.currentSku)) {
      if (ctSelector) ctSelector.style.display = 'flex';
      window.updateCompareTiers();
      return; // updateCompareTiers handles the rest
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
    if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers && !QG.compareMode) {
      renderTierSelector();
    } else {
      if (cfgArea) cfgArea.innerHTML = '';
      renderSkuForm(QG.currentSku, QG.currentTier);
    }
  }
  updatePreview();
};

window.updateCompareTiers = function () {
  if (!QG.compareMode) return;
  const selectedTiers = [];
  if (document.getElementById('ct-dabbler')?.checked) selectedTiers.push('dabbler');
  if (document.getElementById('ct-believer')?.checked) selectedTiers.push('believer');
  if (document.getElementById('ct-influencer')?.checked) selectedTiers.push('influencer');

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
    if (SKUS.find(s => s.key === QG.currentSku)?.hasTiers && !QG.compareMode) {
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
  if (existingTierCard && !QG.compareMode) container.appendChild(existingTierCard);

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
          ${t && sku?.hasTiers ? `<span class="sku-entity-tag ${sku.entity.toLowerCase()}" style="margin-left:6px;">${t.charAt(0).toUpperCase() + t.slice(1)}</span>` : ''}
        </div>
      </div>
      
      ${fields.some(f => f.note?.includes('Add-on')) ? `
      <div style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px; font-size: 0.85rem; margin-bottom: 12px; border-radius: 6px;">
        <strong>Add-ons:</strong>
        ${fields.some(f => f.note === 'SMS Add-on') ? `<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="toggle-sms-addon_${item.id}" ${item.values['sms_cost'] ? 'checked' : ''} onchange="window.toggleAddons('${item.id}', '${k}', '${t}')"> SMS</label>` : ''}
        ${fields.some(f => f.note === 'WA Add-on') ? `<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="toggle-wa-addon_${item.id}" ${item.values['wa_api'] ? 'checked' : ''} onchange="window.toggleAddons('${item.id}', '${k}', '${t}')"> WhatsApp</label>` : ''}
      </div>` : ''}

      <div class="q-card-fields-container">
        ${fields.map(f => renderFieldRow(f, item)).join('')}
      </div>
    `;
    grid.appendChild(card);

    // Bind input changes
    setTimeout(() => {
      fields.forEach(f => {
        if (f.nonEditable) return;

        if (f.type === 'boolean') {
          const radios = card.querySelectorAll(`input[name="qf_${f.id}_${item.id}"]`);
          radios.forEach(r => {
            r.addEventListener('change', () => {
              item.values[f.id] = parseInt(r.value, 10);
              updatePreview();
            });
          });
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
              if (numVal < (fields.find(x => x.id === 'incoming')?.stopVal || 0)) incField.classList.add('stop-lock-violation');
              else incField.classList.remove('stop-lock-violation');
            }
            if (outField) {
              const outVal = isVeeno ? numVal : numVal * 2;
              outField.value = outVal;
              item.values['outgoing'] = outVal;
              if (outVal < (fields.find(x => x.id === 'outgoing')?.stopVal || 0)) outField.classList.add('stop-lock-violation');
              else outField.classList.remove('stop-lock-violation');
            }
          }

          if (f.stopType && !isNaN(numVal) && !item.stopLockOverrides.includes(f.id)) {
            const breach = (f.stopType === 'lower' && numVal < f.stopVal) || (f.stopType === 'upper' && numVal > f.stopVal);
            if (breach) { input.classList.add('stop-lock-violation'); }
            else { input.classList.remove('stop-lock-violation'); }
          }
          item.values[f.id] = isNaN(numVal) ? val : numVal;
          if (QG.activeItemId === item.id) syncActiveAliases();
          updatePreview();
        });
      });
    }, 0);
  });

  container.appendChild(grid);

  setTimeout(() => {
    setupLockButtons();
    itemsToRender.forEach(item => window.toggleAddons(item.id, item.sku_key || skuKey, item.tier || tier));
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

  const item = QG.skuItems.find(i => i.id === itemId);
  if (!item) return;

  const fields = getSkuFields(skuKey, tier);

  document.querySelectorAll('#sku-fields-card-' + itemId + ' .q-field-row').forEach(row => {
    const addonType = row.dataset.addon;
    if (addonType === 'SMS Add-on') {
      row.style.display = showSms ? 'flex' : 'none';
      if (!showSms) {
        delete item.values['sms_cost'];
      } else if (item.values['sms_cost'] === undefined) {
        item.values['sms_cost'] = fields.find(f => f.id === 'sms_cost')?.value;
      }
    }
    if (addonType === 'WA Add-on') {
      row.style.display = showWa ? 'flex' : 'none';
      if (!showWa) {
        delete item.values['wa_utility'];
        delete item.values['wa_promo'];
        delete item.values['wa_api'];
      } else if (item.values['wa_api'] === undefined) {
        item.values['wa_utility'] = fields.find(f => f.id === 'wa_utility')?.value;
        item.values['wa_promo'] = fields.find(f => f.id === 'wa_promo')?.value;
        item.values['wa_api'] = fields.find(f => f.id === 'wa_api')?.value;
      }
    }
  });

  if (QG.activeItemId === itemId) syncActiveAliases();
  updatePreview();
};

function renderFieldRow(f, item) {
  const v = item.values[f.id] !== undefined ? item.values[f.id] : (f.value !== undefined ? f.value : '');

  if (f.nonEditable) {
    const display = f.waived
      ? `<span class="q-waived">✓ Waived</span>`
      : `<span class="q-non-editable">${v}</span>`;
    return `
      <div class="q-field-row" data-addon="${f.note || ''}">
        <span class="q-field-label">${sanitize(cleanLabel(f.label))}</span>
        <div class="q-field-value">${display}</div>
      </div>`;
  }

  if (f.type === 'boolean') {
    return `
      <div class="q-field-row" data-addon="${f.note || ''}" style="align-items:center;">
        <span class="q-field-label" style="flex:1;">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
        <div class="q-field-value" style="display:flex; justify-content:flex-end; gap:16px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:0.9rem; cursor:pointer;">
            <input type="radio" name="qf_${f.id}_${item.id}" value="1" ${v == 1 ? 'checked' : ''}> Yes
          </label>
          <label style="display:flex; align-items:center; gap:4px; font-size:0.9rem; cursor:pointer;">
            <input type="radio" name="qf_${f.id}_${item.id}" value="0" ${v == 0 ? 'checked' : ''}> No
          </label>
        </div>
      </div>`;
  }

  return `
    <div class="q-field-row" data-addon="${f.note || ''}">
      <span class="q-field-label">${sanitize(cleanLabel(f.label))}${f.note ? `<br><span class="q-field-note">${f.note}</span>` : ''}</span>
      <div class="q-field-value">
        <input type="${typeof f.value === 'number' ? 'number' : 'text'}"
          class="q-input"
          id="qf_${f.id}_${item.id}"
          value="${v}"
          step="any">
      </div>
    </div>`;
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
function updatePreview() {
  const doc = document.getElementById('quote-document');
  if (!doc) return;
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) {
    doc.innerHTML = `<div class="q-empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><h3>Preview will appear here</h3><p>Select a SKU and fill in client details.</p></div>`;
    return;
  }

  const firstSku = SKUS.find(s => s.key === validItems[0].sku_key);
  const logoSrc = firstSku.entity === 'Veeno' ? '/veeno-logo.png' : '/exotel-logo.png';
  const company = document.getElementById('q-client-company')?.value || 'Client Company';
  const contact = document.getElementById('q-client-contact')?.value || '';
  const clientEmail = document.getElementById('q-client-email')?.value || '';
  const clientPhone = document.getElementById('q-client-phone')?.value || '';
  const seName = document.getElementById('q-se-name')?.textContent || '';
  const seEmail = document.getElementById('q-se-email')?.textContent || '';
  const sePhone = document.getElementById('q-se-phone')?.value || '';
  const quoteNum = document.getElementById('q-quote-number')?.textContent || '';
  const dateStr = document.getElementById('q-date')?.textContent || today();

  const introMap = {
    'Exotel': 'Exotel is a cloud-based customer engagement platform enabling enterprises to build secure, scalable communication ecosystems. Our solutions unify Voice, SMS, WhatsApp, Voicebots, Streaming, Enterprise Contact Center, RCS, AI-powered automation, and Truecaller on a single platform.',
    'Veeno': 'Veeno provides a comprehensive, fully IP-based contact center solution designed for modern enterprises. Our platform enables teams to manage all customer interactions efficiently through a unified, cloud-native interface.'
  };

  // ── Compare Mode: side-by-side tier comparison table ─────────────────────
  const isCompareTiers = QG.compareMode && validItems.length >= 2 &&
    validItems.every(i => i.sku_key === validItems[0].sku_key) &&
    ['voice_exotel_std', 'voice_veeno_std', 'sip_veeno'].includes(validItems[0].sku_key);

  if (isCompareTiers) {
    const skuKey0 = validItems[0].sku_key;
    const sku0 = SKUS.find(s => s.key === skuKey0);
    const tiers = validItems.map(i => i.tier);
    const tierLabels = { dabbler: 'Dabbler', believer: 'Believer', influencer: 'Influencer' };
    const fmtR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    const fmtP = (v) => {
      if (v === null || v === undefined) return '-';
      const n = parseFloat(v); if (isNaN(n)) return String(v);
      return n >= 100 ? '₹' + (n / 100).toFixed(2) + '/min' : n + 'p/min';
    };
    const fmtMsg = (v) => {
      if (v === null || v === undefined) return '-';
      const n = parseFloat(v); if (isNaN(n)) return String(v);
      return n >= 100 ? '₹' + (n / 100).toFixed(2) + '/msg' : n + 'p/msg';
    };
    const W = '<span class="waived-text">✓ Waived</span>';
    const FREE = '<span class="waived-text">✓ Free</span>';
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
      if (numPaidNums && extraNumCost) sub += numPaidNums * extraNumCost * months;
      const didNums = parseFloat(item.values['did_numbers'] ?? 0);
      if (didNums > 0) sub += didNums * 1500 * months;
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
      tableRows += cmpRow('Validity', colData.map(({ getVal }) => getVal('validity') + ' Months'));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('Channels', colData.map(() => 'Unlimited'));
      tableRows += cmpRow('Plan', [], true);
      tableRows += cmpRow('Free Users', colData.map(({ getVal }) => { const fu = getVal('free_users'); return (fu === null || fu === 'Unlimited') ? 'Unlimited' : fu + ' Users (Free)'; }));
      tableRows += cmpRow('Extra User Cost', colData.map(({ getSN }) => fmtR(getSN('extra_user_cost')) + perUnit('/user/month')), false, true);
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(({ getSN }) => fmtR(getSN('extra_number')) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN }) => fmtR(getSN('credits'))));
      tableRows += cmpRow('Single Leg', colData.map(({ getSN }) => fmtP(getSN('single_leg'))));
      tableRows += cmpRow('Incoming', colData.map(({ getSN }) => fmtP(getSN('incoming'))), false, true);
      tableRows += cmpRow('Outgoing', colData.map(({ getSN }) => fmtP(getSN('outgoing'))), false, true);
      // Messaging Services (Add-ons) - only shown if any tier has them enabled
      const hasSms = colData.some(({ item }) => item.values['sms_cost'] !== undefined);
      const hasWa = colData.some(({ item }) => item.values['wa_api'] !== undefined);
      if (hasSms || hasWa) {
        tableRows += cmpRow('Messaging Services', [], true);
        if (hasSms) {
          tableRows += cmpRow('SMS Cost', colData.map(({ item }) =>
            item.values['sms_cost'] !== undefined ? fmtMsg(item.values['sms_cost']) : '<span style="color:#94a3b8;">-</span>'
          ));
        }
        if (hasWa) {
          tableRows += cmpRow('WhatsApp Utility Messages', colData.map(({ item }) =>
            item.values['wa_utility'] !== undefined ? fmtMsg(item.values['wa_utility']) : '<span style="color:#94a3b8;">-</span>'
          ));
          tableRows += cmpRow('WhatsApp Promotional Messages', colData.map(({ item }) =>
            item.values['wa_promo'] !== undefined ? fmtMsg(item.values['wa_promo']) : '<span style="color:#94a3b8;">-</span>'
          ));
          tableRows += cmpRow('WhatsApp API Charge', colData.map(({ item }) =>
            item.values['wa_api'] !== undefined ? fmtMsg(item.values['wa_api']) : '<span style="color:#94a3b8;">-</span>'
          ));
        }
      }
    } else if (skuKey0 === 'voice_veeno_std') {
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('Validity', colData.map(({ getVal }) => getVal('validity') + ' Months'));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('Channels', colData.map(() => 'Unlimited'));
      tableRows += cmpRow('User Plan', [], true);
      tableRows += cmpRow('No. of Users', colData.map(({ getVal }) => getVal('num_users')));
      tableRows += cmpRow('User Charge', colData.map(({ getSN }) => fmtR(getSN('user_charge')) + perUnit('/user/month')));
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(({ getSN }) => fmtR(getSN('extra_number')) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN }) => fmtR(getSN('credits'))));
      tableRows += cmpRow('Single Leg', colData.map(({ getSN }) => fmtP(getSN('single_leg'))));
      tableRows += cmpRow('Incoming', colData.map(() => FREE), false, true);
      tableRows += cmpRow('Outgoing', colData.map(({ getSN }) => fmtP(getSN('outgoing'))), false, true);
    } else if (skuKey0 === 'sip_veeno') {
      tableRows += cmpRow('Plan Details', [], true);
      tableRows += cmpRow('Validity', colData.map(({ getVal }) => getVal('validity') + ' Months'));
      tableRows += cmpRow('Account Rental', colData.map(({ getSN }) => fmtR(getSN('rental'))));
      tableRows += cmpRow('Setup Charges', colData.map(() => W));
      tableRows += cmpRow('Channels', colData.map(() => 'Unlimited'));
      tableRows += cmpRow('User Plan', [], true);
      tableRows += cmpRow('Free Users', colData.map(({ getVal }) => { const fu = getVal('free_users'); return (fu === null || fu === 'Unlimited') ? 'Unlimited' : fu + ' Users (Free)'; }));
      tableRows += cmpRow('Numbers', [], true);
      tableRows += cmpRow('Free Numbers', colData.map(({ getVal }) => getVal('free_numbers')));
      tableRows += cmpRow('Extra Number Cost', colData.map(() => fmtR(499) + perUnit('/number/month')), false, true);
      tableRows += cmpRow('Call Credits & Charges', [], true);
      tableRows += cmpRow('Call Credits', colData.map(({ getSN }) => fmtR(getSN('credits'))));
      tableRows += cmpRow('Incoming', colData.map(({ getSN }) => fmtP(getSN('incoming'))));
      tableRows += cmpRow('Outgoing', colData.map(({ getSN }) => fmtP(getSN('outgoing'))));
      tableRows += cmpRow('Attempt Charges', colData.map(() => '5p / failed call'));
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
      <div class="quote-doc-title">Commercial Proposal - Plan Comparison</div>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:18px;">Prepared For: ${sanitize(company)}</p>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Introduction</div>
        <div class="quote-intro-text">${introMap[firstSku.entity]}</div>
      </div>
      <div class="quote-doc-section">
        <div class="quote-doc-section-title">Parties</div>
        <div class="quote-participant-grid">
          <div class="quote-participant-box"><div class="label">Prepared By (${firstSku.entity})</div><div class="value">${sanitize(seName || firstSku.entity + ' Sales')}</div><div class="sub">${sanitize(seEmail)}</div>${sePhone ? `<div class="sub">${sanitize(sePhone)}</div>` : ''}</div>
          <div class="quote-participant-box"><div class="label">Prepared For (Client)</div><div class="value">${sanitize(company)}</div>${contact ? `<div class="sub">${sanitize(contact)}</div>` : ''} ${clientEmail ? `<div class="sub">${sanitize(clientEmail)}</div>` : ''} ${clientPhone ? `<div class="sub">${sanitize(clientPhone)}</div>` : ''}</div>
        </div>
      </div>

      <div class="quote-doc-section" style="margin-top:24px;">
        <div class="quote-doc-section-title" style="font-size:1.05rem;background:#f0f9ff;padding:10px 14px;border-radius:6px;margin-bottom:16px;border-left:4px solid #0284c7;">
          ${sanitize(sku0.label)} - Side-by-Side Plan Comparison
        </div>
        <div style="overflow-x:auto;">
        <table class="quote-sku-table" style="table-layout:auto;">
          <thead>
            <tr>
              <th style="width:32%;background:#0f172a;color:#fff;">Component</th>
              ${tiers.map(t => `<th style="background:${t === 'believer' ? '#0284c7' : t === 'influencer' ? '#0369a1' : '#38bdf8'};color:#fff;text-align:center;">${tierLabels[t] || t}</th>`).join('')}
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
        <div class="quote-tnc"><ul>
          <li>All prices are exclusive of GST unless stated otherwise. GST @ 18% applicable.</li>
          <li>This quotation is valid for 30 days from the date of issue.</li>
          <li>Setup charges are waived as indicated. Waived amounts are non-refundable once service is activated.</li>
          <li>Call credits are consumed as per usage and are non-transferable.</li>
          <li>Services are subject to ${firstSku.entity}'s standard Terms of Service and Acceptable Use Policy.</li>
          <li>Numbers are subject to regulatory availability at time of provisioning.</li>
          <li>Payment terms: 100% advance unless otherwise agreed in writing.</li>
        </ul></div>
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
    const fmtPaise = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/min';
      return num + 'p/min';
    };
    const fmtPaiseMsg = (v) => {
      if (v === null || v === undefined) return '-';
      const num = parseFloat(v);
      if (isNaN(num)) return String(v);
      if (num >= 100) return '\u20b9' + (num / 100).toFixed(2) + '/msg';
      return num + 'p/msg';
    };

    const W = '<span class="waived-text">\u2713 Waived</span>';
    const FREE = '<span class="waived-text">\u2713 Free</span>';
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
    const isEditingThisItem = (item.id === QG.activeItemId);
    const showSms = isEditingThisItem ? document.getElementById('toggle-sms-addon_' + QG.activeItemId)?.checked : !!getVal('sms_cost');
    const showWa = isEditingThisItem ? document.getElementById('toggle-wa-addon_' + QG.activeItemId)?.checked : !!getVal('wa_api');

    if (sk === 'voice_exotel_std') {
      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Validity', getVal('validity') + ' Months');
      tableHTML += stdRow('Account Rental', fmtRupee(getSafeNum('rental')));
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('Channels', 'Unlimited');

      tableHTML += secRow('User Plan');
      const fu = getVal('free_users');
      tableHTML += stdRow('Free Users', fu === null || fu === 'Unlimited' ? 'Unlimited (Included)' : fu + ' Users (Free)');
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
      const paidNumsE = getSafeNum('num_paid_numbers') || 0;
      if (paidNumsE > 0) {
        const extNumCostE = getSafeNum('extra_number');
        const vMonthsE = parseFloat(getVal('validity')) || 0;
        tableHTML += stdRow('Extra Numbers', `${paidNumsE} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsE} numbers × ${vMonthsE} months × ${fmtRupee(extNumCostE)} = <strong>${fmtRupee(paidNumsE * vMonthsE * extNumCostE)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Single Leg Charge', fmtPaise(getSafeNum('single_leg')));
      tableHTML += indRow('Incoming (Single Leg)', fmtPaise(getSafeNum('incoming')));
      tableHTML += indRow('Outgoing (Double Leg)', fmtPaise(getSafeNum('outgoing')));

      if (showSms || showWa) {
        tableHTML += secRow('Messaging & Communication Services');
        if (showSms) tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));
        if (showWa) {
          tableHTML += stdRow('WhatsApp Utility Messages', fmtPaiseMsg(getVal('wa_utility')));
          tableHTML += stdRow('WhatsApp Promotional Messages', fmtPaiseMsg(getVal('wa_promo')));
          tableHTML += stdRow('WhatsApp API Charge', fmtPaiseMsg(getSafeNum('wa_api')));
        }
      }
    } else if (sk === 'voice_veeno_std') {
      const numUsers = getSafeNum('num_users') || 0;
      const uCharge = getSafeNum('user_charge') || 1000;
      const validity = parseFloat(getVal('validity')) || 0;
      const DID_COST = 1500;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const totalUserCostV = numUsers * validity * uCharge;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Validity', validity + ' Months');
      const rVal = getSafeNum('rental');
      tableHTML += stdRow('Account Rental', rVal === 0 ? W : fmtRupee(rVal));
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('Channels', 'Unlimited');

      tableHTML += secRow('User Plan');
      tableHTML += stdRow('No. of Users', numUsers);
      tableHTML += stdRow('User Charge', `${fmtRupee(uCharge)} ${perUnit('/user/month')}`);
      tableHTML += indRow('Calculation', `${numUsers} users × ${validity} months × ${fmtRupee(uCharge)} = <strong>${fmtRupee(totalUserCostV)}</strong>`);

      tableHTML += secRow('Number Plan');
      if (!removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsV = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsV > 0) {
          const extNumCostV = getSafeNum('extra_number');
          tableHTML += stdRow('Extra Numbers', `${paidNumsV} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsV} numbers × ${validity} months × ${fmtRupee(extNumCostV)} = <strong>${fmtRupee(paidNumsV * validity * extNumCostV)}</strong>`);
        }
      }
      if (didNums > 0) {
        const didTotalV = didNums * validity * DID_COST;
        tableHTML += stdRow('DID Numbers', `${didNums} DID(s)`);
        tableHTML += indRow('DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums} DID(s) × ${validity} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotalV)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Single Leg Charge', fmtPaise(getSafeNum('single_leg')));
      tableHTML += indRow('Incoming Calls', FREE);
      tableHTML += indRow('Outgoing (Single Leg)', fmtPaise(getSafeNum('outgoing')));

    } else if (sk === 'sip_veeno') {
      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Validity', getVal('validity') + ' Months');
      tableHTML += stdRow('Account Rental', fmtRupee(getSafeNum('rental')));
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('Channels', 'Unlimited');

      tableHTML += secRow('User Plan');
      const fu2 = getVal('free_users');
      tableHTML += stdRow('Free Users', fu2 === null || fu2 === 'Unlimited' ? 'Unlimited (Included)' : fu2 + ' Users (Free)');
      tableHTML += indRow('Extra User Cost', `${fmtRupee(199)} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
      tableHTML += indRow('Extra Number Cost', `${fmtRupee(499)} ${perUnit('/number/month')}`);
      const paidNumsS = getSafeNum('num_paid_numbers') || 0;
      const vMonthsS = parseFloat(getVal('validity')) || 0;
      if (paidNumsS > 0) {
        tableHTML += stdRow('Extra Numbers', `${paidNumsS} Number(s)`);
        tableHTML += indRow('Calculation', `${paidNumsS} numbers × ${vMonthsS} months × ${fmtRupee(499)} = <strong>${fmtRupee(paidNumsS * vMonthsS * 499)}</strong>`);
      }
      const didNums2 = getSafeNum('did_numbers') || 0;
      if (didNums2 > 0) {
        tableHTML += stdRow('DID Numbers', `${didNums2} DID(s)`);
        tableHTML += indRow('DID Rate', `${fmtRupee(1500)} ${perUnit('/DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums2} DID(s) × ${vMonthsS} months × ${fmtRupee(1500)} = <strong>${fmtRupee(didNums2 * vMonthsS * 1500)}</strong>`);
      }

      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      tableHTML += stdRow('Attempt Charges', '5p / failed call');

    } else if (sk === 'voice_exotel_user' || sk === 'voice_veeno_user') {
      const isVeeno = sk === 'voice_veeno_user';
      const numUsers = getSafeNum('num_users') || 0;
      const numMonths = getSafeNum('num_months') || 0;
      const userCharge = getSafeNum('user_charge') || 0;
      const totalUserCost = numUsers * numMonths * userCharge;
      const didNums = getSafeNum('did_numbers') || 0;
      const removStd = getSafeNum('remove_std_numbers') || 0;
      const DID_COST = 1500;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('Channels', 'Unlimited');

      tableHTML += secRow('User Plan');
      tableHTML += stdRow('No. of Users', numUsers);
      tableHTML += stdRow('No. of Months', numMonths);
      tableHTML += stdRow('User Charge', `${fmtRupee(userCharge)} ${perUnit('/user/month')}`);
      tableHTML += indRow('Calculation', `${numUsers} users × ${numMonths} months × ${fmtRupee(userCharge)} = <strong>${fmtRupee(totalUserCost)}</strong>`);

      tableHTML += secRow('Number Plan');
      if (!isVeeno || !removStd) {
        tableHTML += stdRow('Free Numbers', getVal('free_numbers') + ' Number(s) (Free)');
        tableHTML += indRow('Extra Number Cost', `${fmtRupee(getSafeNum('extra_number'))} ${perUnit('/number/month')}`);
        const paidNumsU = getSafeNum('num_paid_numbers') || 0;
        if (paidNumsU > 0) {
          tableHTML += stdRow('Extra Numbers', `${paidNumsU} Number(s)`);
          tableHTML += indRow('Calculation', `${paidNumsU} numbers × ${numMonths} months × ${fmtRupee(getSafeNum('extra_number'))} = <strong>${fmtRupee(paidNumsU * numMonths * getSafeNum('extra_number'))}</strong>`);
        }
      }
      if (isVeeno && didNums > 0) {
        const didTotal = didNums * numMonths * DID_COST;
        tableHTML += stdRow('DID Numbers', `${didNums} DID(s)`);
        tableHTML += indRow('DID Rate', `${fmtRupee(DID_COST)} ${perUnit('/DID/month')}`);
        tableHTML += indRow('Calculation', `${didNums} DID(s) × ${numMonths} months × ${fmtRupee(DID_COST)} = <strong>${fmtRupee(didTotal)}</strong>`);
      }

    } else if (sk === 'voice_exotel_tfn') {
      const numNums = getSafeNum('num_numbers') || 0;
      const numMonths2 = getSafeNum('num_months') || 0;
      const numCost = getSafeNum('number_cost') || 0;
      const totalNumCost = numNums * numMonths2 * numCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('Channels', 'Unlimited');
      tableHTML += stdRow('No. of Months', numMonths2);

      tableHTML += secRow('User Plan');
      const fuTfn = getVal('free_users');
      tableHTML += stdRow('Free Users', fuTfn === null || fuTfn === 'Unlimited' ? 'Unlimited (Included)' : fuTfn + ' Users (Free)');
      tableHTML += indRow('Extra User Cost', `${fmtRupee(getSafeNum('extra_user_cost'))} ${perUnit('/user/month')}`);

      tableHTML += secRow('Number Plan');
      tableHTML += stdRow('No. of Numbers', numNums);
      tableHTML += stdRow('Number Cost', `${fmtRupee(numCost)} ${perUnit('/number/month')}`);
      tableHTML += indRow('Calculation', `${numNums} number(s) × ${numMonths2} months × ${fmtRupee(numCost)} = <strong>${fmtRupee(totalNumCost)}</strong>`);

      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));

    } else if (sk === 'voice_exotel_stream') {
      const numChs = getSafeNum('num_channels') || 0;
      const numMos = getSafeNum('num_months') || 0;
      const chCost = getSafeNum('channel_cost') || 0;
      const totalCh = numChs * numMos * chCost;

      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('No. of Months', Math.max(1, parseFloat(getVal('num_months') || 0)));
      tableHTML += stdRow('Account Rental', `${fmtRupee(getSafeNum('rental'))} ${perUnit('/month')}`);
      tableHTML += stdRow('Setup Charges', null, true);

      tableHTML += secRow('Streaming Channels');
      tableHTML += stdRow('No. of Channels', numChs);
      tableHTML += stdRow('Channel Cost', `${fmtRupee(chCost)} ${perUnit('/channel/month')}`);
      tableHTML += indRow('Calculation', `${numChs} channels × ${numMos} months × ${fmtRupee(chCost)} = <strong>${fmtRupee(totalCh)}</strong>`);

      tableHTML += secRow('Call Credits & Charges');
      tableHTML += stdRow('Call Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Incoming Calls', fmtPaise(getSafeNum('incoming')));
      tableHTML += stdRow('Outgoing Calls', fmtPaise(getSafeNum('outgoing')));
      tableHTML += stdRow('Attempt Charges', '5p / failed call');

    } else if (sk === 'sms_exotel') {
      tableHTML += secRow('Plan Details');
      const rentalVal = getSafeNum('rental');
      const isRentalWaived = rentalVal === 0;
      tableHTML += stdRow('Account Rental', isRentalWaived ? null : (fmtRupee(rentalVal) + '/month'), isRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      if (!isRentalWaived) {
        tableHTML += stdRow('No. of Months', getVal('num_months'));
      }
      tableHTML += secRow('Number Plan');
      const smsNumCost = getSafeNum('number_cost');
      const isSmsNumWaived = smsNumCost === 0;
      tableHTML += stdRow('Number Cost', isSmsNumWaived ? null : (fmtRupee(smsNumCost) + '/month'), isSmsNumWaived);
      tableHTML += secRow('SMS Credits & Rates');
      tableHTML += stdRow('SMS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('SMS Cost', fmtPaiseMsg(getSafeNum('sms_cost')));

    } else if (sk === 'whatsapp_exotel') {
      tableHTML += secRow('Plan Details');
      const waRentalVal = getSafeNum('rental');
      const isWaRentalWaived = waRentalVal === 0;
      tableHTML += stdRow('Account Rental', isWaRentalWaived ? null : (`${fmtRupee(waRentalVal)} per month`), isWaRentalWaived);
      tableHTML += stdRow('Setup Charges', null, true);
      if (!isWaRentalWaived) {
        tableHTML += stdRow('No. of Months', getVal('num_months'));
      }
      tableHTML += secRow('Number Plan');
      const waNumCost = getSafeNum('number_cost');
      const isWaNumWaived = waNumCost === 0;
      tableHTML += stdRow('Number Cost', isWaNumWaived ? null : (`${fmtRupee(waNumCost)} per month`), isWaNumWaived);
      tableHTML += secRow('WhatsApp Credits & Rates');
      tableHTML += stdRow('WA Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Utility Message Cost', fmtPaiseMsg(getSafeNum('wa_utility')));
      tableHTML += stdRow('Promotional Message Cost', fmtPaiseMsg(getSafeNum('wa_promo')));
      tableHTML += stdRow('API Charge (per msg)', fmtPaiseMsg(getSafeNum('wa_api')));

    } else if (sk === 'rcs_exotel') {
      tableHTML += secRow('Plan Details');
      tableHTML += stdRow('Brand Registration Fee', fmtRupee(getSafeNum('brand_fee')));
      tableHTML += stdRow('Account Rental', W);
      tableHTML += stdRow('Setup Charges', null, true);
      tableHTML += stdRow('No. of Months', getVal('num_months'));
      tableHTML += secRow('Number Plan');
      const rcsNumCost = getSafeNum('number_cost');
      const isRcsNumWaived = rcsNumCost === 0;
      tableHTML += stdRow('Number Cost', isRcsNumWaived ? null : (fmtRupee(rcsNumCost) + '/month'), isRcsNumWaived);
      tableHTML += secRow('RCS Credits & Rates');
      tableHTML += stdRow('RCS Credits', fmtRupee(getSafeNum('credits')));
      tableHTML += stdRow('Business Messaging', fmtPaiseMsg(getSafeNum('rcs_biz')));
      tableHTML += stdRow('Rich Media Messaging', fmtPaiseMsg(getSafeNum('rcs_rich')));
      tableHTML += stdRow('User Reply Charge', fmtPaiseMsg(getSafeNum('rcs_reply')));

    } else if (sk === 'num_1400' || sk === 'num_1600') {
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

    } else {
      fields.forEach(f => {
        if (f.note === 'SMS Add-on' && !showSms) return;
        if (f.note === 'WA Add-on' && !showWa) return;
        const val = item.values[f.id] ?? f.value;
        tableHTML += stdRow(cleanLabel(f.label), f.waived ? null : val, f.waived === true);
      });
    }

    if (!isFirstSec) {
      tableHTML += '</tbody>';
    }

    const months = parseFloat(item.values['num_months'] ?? item.values['validity'] ?? 1);
    const credits = getSafeNum('credits');
    let rental = getSafeNum('rental');
    const rentalF = fields.find(x => x.id === 'rental');
    if (rentalF && rentalF.label.toLowerCase().includes('/month')) rental = rental * months;
    const brand = getSafeNum('brand_fee');
    const procure = getSafeNum('procurement');
    const setup = getSafeNum('setup');
    const chCost = getSafeNum('channel_cost') * parseFloat(item.values['num_channels'] ?? 0) * months;
    const numUsers = parseFloat(item.values['num_users'] ?? 0);
    const userCharge = getSafeNum('user_charge');
    const numNumbers = parseFloat(item.values['num_numbers'] ?? 1);
    const numberCost = getSafeNum('number_cost') * numNumbers * months;

    let subtotal = credits + rental + brand + procure + setup + chCost + numberCost;
    if (numUsers && userCharge) subtotal += numUsers * userCharge * months;
    const numPaidNums = parseFloat(item.values['num_paid_numbers'] ?? 0);
    const extraNumCost = getSafeNum('extra_number');
    if (numPaidNums && extraNumCost) subtotal += numPaidNums * extraNumCost * months;
    const didNumbers = parseFloat(item.values['did_numbers'] ?? 0);
    if (didNumbers > 0) subtotal += didNumbers * 1500 * months;

    grandSubtotal += subtotal;

    const tierLabel = sku.hasTiers && item.tier
      ? ' - ' + item.tier.charAt(0).toUpperCase() + item.tier.slice(1)
      : '';

    allSectionsHTML += `
    <div class="quote-doc-section" style="margin-top:24px;">
      <div class="quote-doc-section-title" style="font-size:1.15rem; background:#f0f9ff; padding:10px 14px; border-radius:6px; margin-bottom:12px; border-left:4px solid #0284c7;">
        ${sanitize(sku.label)}${sanitize(tierLabel)}
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
        </div>
      </div>
    </div>

    ${allSectionsHTML}

    ${(grandSubtotal > 0 && !QG.compareMode) ? `
    <div class="quote-totals" style="margin-top:24px; border-top:2px solid #0f172a; padding-top:16px;">
      <div class="quote-total-row subtotal"><span>Combined Subtotal (excl. GST)</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(grandSubtotal)}</span></div>
      <div class="quote-total-row gst"><span>GST @ 18%</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gst)}</span></div>
      <div class="quote-total-row grand-total"><span>Grand Total (incl. GST)</span><span>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(grand)}</span></div>
    </div>` : ''}

    <div class="quote-doc-section" style="margin-top:30px;">
      <div class="quote-doc-section-title">Terms &amp; Conditions</div>
      <div class="quote-tnc">
        <ul>
          <li>All prices are exclusive of GST unless stated otherwise. GST @ 18% applicable.</li>
          <li>This quotation is valid for 30 days from the date of issue.</li>
          <li>Setup charges are waived as indicated. Waived amounts are non-refundable once service is activated.</li>
          <li>Call credits are consumed as per usage and are non-transferable.</li>
          <li>Services are subject to ${firstSku.entity}'s standard Terms of Service and Acceptable Use Policy.</li>
          <li>Numbers are subject to regulatory availability at time of provisioning.</li>
          <li>Payment terms: 100% advance unless otherwise agreed in writing.</li>
        </ul>
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
    
    let userFilename = prompt("Enter a filename for the Quote PDF:", defaultFilename);
    if (userFilename === null) return; // Cancelled
    if (!userFilename.trim()) userFilename = defaultFilename;
    else if (!userFilename.toLowerCase().endsWith('.pdf')) userFilename += '.pdf';

    const renderBtn = document.getElementById('q-generate-btn') || document.querySelector('.qprev-btn.blue');
    const originalText = renderBtn ? renderBtn.innerHTML : '';
    if(renderBtn) renderBtn.innerHTML = '⚙️ Generating Perfect PDF...';

    // Compile robust backend HTML payload leveraging the exact live DOM state
    const htmlPayload = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
  <link rel="stylesheet" href="${window.location.origin}/style.css">
  <link rel="stylesheet" href="${window.location.origin}/quote-generator.css">
  <style>
     /* Global backend PDF normalizer */
     body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
     
     /* Strip out screen-only paper styling so Puppeteer's native margins apply cleanly */
     #quote-document {
         width: 100% !important;
         min-height: auto !important;
         margin: 0 !important;
         padding: 0 !important;
         border: none !important;
         box-shadow: none !important;
     }

     /* Force flawless geometric vector rendering unconditionally purely for Puppeteer */
     * { text-rendering: geometricPrecision !important; -webkit-font-smoothing: antialiased !important; }
  </style>
</head>
<body>
  ${docElement.outerHTML}
</body>
</html>`;

    try {
        const res = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        alert("Failed to generate PDF. Please ensure your session is active and server is running.");
    } finally {
        if(renderBtn) renderBtn.innerHTML = originalText;
    }
};

// -- Generate Quote (Save) ----------------------------------
async function generateQuote() {
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) { alert('Please select a SKU plan first.'); return; }
  const firstSku = SKUS.find(s => s.key === validItems[0].sku_key);

  const company = document.getElementById('q-client-company')?.value?.trim();
  if (!company) { alert('Please enter a client company name.'); return; }

  const violations = [];
  for (const item of validItems) {
    const fieldsDef = getSkuFields(item.sku_key, item.tier);
    for (const f of fieldsDef) {
      const val = item.values[f.id];
      if (val === undefined || val === null) continue;
      const numVal = parseFloat(val);
      if (f.stopType && !isNaN(numVal)) {
        const breach = (f.stopType === 'lower' && numVal < f.stopVal) || (f.stopType === 'upper' && numVal > f.stopVal);
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

  const quoteData = {
    sku_items: validItems,
    entity: firstSku?.entity,
    client: {
      company: document.getElementById('q-client-company')?.value,
      contact: document.getElementById('q-client-contact')?.value,
      email: document.getElementById('q-client-email')?.value,
      phone: document.getElementById('q-client-phone')?.value,
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
      alert("Your session has expired. Please log in again.");
      window.location.href = '/login';
      return;
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || (isEdit ? 'Update failed' : 'Save failed'));
    }

    await fetch('/api/drafts/key/draft_' + QG.quoteNumber, { method: 'DELETE' }).catch(() => null);
    updateNavCounters();

    alert(isEdit ? `Quote ${QG.quoteNumber} updated successfully!` : `Quote ${QG.quoteNumber} generated and saved successfully!`);
    await window.printQuote();
    // Reset & get new number
    resetQuoteForm();
    document.getElementById('qtab-myquotes')?.click();
  } catch (e) {
    alert('Failed to save quote: ' + e.message);
  }
}

// -- Save Draft ---------------------------------------------
async function saveDraft(e, silent = false) {
  const validItems = QG.skuItems.filter(i => i.sku_key);
  if (validItems.length === 0) { alert('Select a SKU before saving a draft.'); return; }
  const firstSku = SKUS.find(s => s.key === validItems[0].sku_key);

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
    if (!silent) alert('Failed to save draft.');
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
    container.innerHTML = mine.map(q => renderQuoteCard(q, false)).join('');
  } catch (e) { container.innerHTML = '<p style="color:#ef4444;padding:24px;">Failed to load quotes.</p>'; }
}

async function loadAllQuotes() {
  const container = document.getElementById('all-quotes-list');
  try {
    const res = await fetch('/api/quotes/admin');
    const quotes = await res.json();
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
    alert('Failed to load version history.');
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
    ['company', 'contact', 'email', 'phone'].forEach(k => {
      const el = document.getElementById('q-client-' + k);
      if (el && data.client?.[k]) {
        el.value = data.client[k];
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
    if (!q) return alert('Quote not found.');

    // Track which tab was active so we can restore it
    const activeTab = document.querySelector('.quote-tab.active');
    const activeTabTarget = activeTab?.dataset?.qtab || 'my-quotes';

    // Backup current workspace
    const bkup = {
      sku: QG.currentSku, tier: QG.currentTier, vals: { ...QG.skuValues },
      company: document.getElementById('q-client-company')?.value,
      contact: document.getElementById('q-client-contact')?.value,
      email: document.getElementById('q-client-email')?.value,
      phone: document.getElementById('q-client-phone')?.value,
      qNum: document.getElementById('q-quote-number')?.textContent,
      date: document.getElementById('q-date')?.textContent
    };

    const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;

    // Switch to New Quote tab securely using router helper (no history push)
    switchQuoteTab('new-quote', false);

    // Inject historical snapshot

    if (data.sku_items && data.sku_items.length > 0) {
      QG.skuItems = data.sku_items;
      QG.activeItemId = data.sku_items[0].id;
      syncActiveAliases();
    } else {
      QG.currentSku = data.sku_key;
      QG.currentTier = data.tier || 'dabbler';
      QG.skuValues = data.fields || {};
      QG.skuItems = [{ id: 'item_0', sku_key: QG.currentSku, tier: QG.currentTier, values: QG.skuValues, stopLockOverrides: [] }];
      QG.activeItemId = 'item_0';
    }


    if (document.getElementById('q-client-company')) document.getElementById('q-client-company').value = data.client?.company || '';
    if (document.getElementById('q-client-contact')) document.getElementById('q-client-contact').value = data.client?.contact || '';
    if (document.getElementById('q-client-email')) document.getElementById('q-client-email').value = data.client?.email || '';
    if (document.getElementById('q-client-phone')) document.getElementById('q-client-phone').value = data.client?.phone || '';
    if (document.getElementById('q-quote-number')) document.getElementById('q-quote-number').textContent = q.quote_number;
    if (document.getElementById('q-date')) document.getElementById('q-date').textContent = new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Render the historical document into #quote-document
    updatePreview();

    // Give the DOM brief time to fully render the quote physically before triggering print
    setTimeout(async () => {
      // window.print() is sync/blocking in most modern browsers. 
      // It halts JS until the dialog captures the DOM or closes.
      await window.printQuote();

      // Execution resumes here after print dialog closes, restore immediately
      QG.currentSku = bkup.sku;
      QG.currentTier = bkup.tier;
      QG.skuValues = bkup.vals;
      if (document.getElementById('q-client-company')) document.getElementById('q-client-company').value = bkup.company || '';
      if (document.getElementById('q-client-contact')) document.getElementById('q-client-contact').value = bkup.contact || '';
      if (document.getElementById('q-client-email')) document.getElementById('q-client-email').value = bkup.email || '';
      if (document.getElementById('q-client-phone')) document.getElementById('q-client-phone').value = bkup.phone || '';
      if (document.getElementById('q-quote-number')) document.getElementById('q-quote-number').textContent = bkup.qNum;
      if (document.getElementById('q-date')) document.getElementById('q-date').textContent = bkup.date;

      updatePreview();

      // Return to the previous tab seamlessly
      switchQuoteTab(activeTabTarget, false);

    }, 300); // Only a brief 300ms wait to ensure CSS/DOM parsed
  } catch (e) {
    console.error(e);
    alert('Failed to generate PDF for historical quote.');
  }
};

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

    if (!q) { alert('Quote not found or permission denied.'); return; }

    const data = typeof q.quote_data === 'string' ? JSON.parse(q.quote_data) : q.quote_data;

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
      ['company', 'contact', 'email', 'phone'].forEach(k => {
        const el = document.getElementById('q-client-' + k);
        if (el && data.client?.[k]) el.value = data.client[k];
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
    alert('Failed to load quote details.');
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
      ['company', 'contact', 'email', 'phone'].forEach(k => {
        const el = document.getElementById('q-client-' + k);
        if (el && data.client?.[k]) el.value = data.client[k];
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
  } catch (e) { alert('Failed to resume draft.'); }
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
    alert('Please enter a SKU name.');
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
      alert('SKU request submitted successfully!');
      closeSkuRequestModal();
      updateNavCounters();
      // If admin is viewing the tab, refresh it
      if (QG.isAdmin) loadRequestedSkus();
    } else {
      throw new Error('Failed to submit request');
    }
  } catch (e) {
    alert('Error submitting request: ' + e.message);
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
        alert('Failed: ' + (err.error || 'Check console'));
      }
    }
  } catch (e) {
    console.error('Network error during resolve:', e);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Error';
      alert('Network Error connecting to server.');
    }
  }
};

// -- Reset Form ---------------------------------------------
function resetQuoteForm() {
  // Clear all SKU state
  initSkuItems();
  QG.draftKey = null;
  QG._dirty = false;

  // Clear SKU selector highlights and config area
  document.querySelectorAll('.sku-option').forEach(el => el.classList.remove('selected'));
  const cfgArea = document.getElementById('sku-config-area');
  if (cfgArea) cfgArea.innerHTML = '';

  // Clear client fields
  ['q-client-company', 'q-client-contact', 'q-client-email', 'q-client-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Reset entity badge
  updateEntityBadge('Exotel');

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
  if (!confirm('Reset your quote counter? Your next quote number will start fresh from -01. This does NOT delete any existing quotes.')) return;
  try {
    const res = await fetch('/api/quotes/reset-counter', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    // Get a fresh quote number immediately
    await initQuoteNumber();
    alert('Quote counter reset! Your next quote number is: ' + (document.getElementById('q-quote-number')?.textContent || ''));
  } catch (e) {
    alert('Failed to reset counter: ' + e.message);
  }
};

// -- Reset ALL Counters (admin only) ------------------------
window.resetAllCounters = async function () {
  if (!confirm('ADMIN: Reset ALL users quote counters to 0? This affects everyone. Proceed?')) return;
  try {
    const res = await fetch('/api/admin/reset-all-counters', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    await initQuoteNumber();
    alert('All quote counters have been reset! Next quote number: ' + (document.getElementById('q-quote-number')?.textContent || ''));
  } catch (e) {
    alert('Failed: ' + e.message);
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
    const phoneEl = document.getElementById('q-se-phone');
    if (nameEl) nameEl.textContent = profile.display_name || '-';
    if (emailEl) emailEl.textContent = profile.email || '-';
    if (phoneEl) phoneEl.value = profile.phone || '';
    // Show prompt if no phone
    const prompt = document.getElementById('q-profile-prompt');
    if (prompt && !profile.phone) prompt.classList.remove('hidden');
  } catch (e) { /* silent */ }
}

async function saveProfilePhone() {
  const phone = document.getElementById('q-profile-phone')?.value?.trim();
  if (!phone) return;
  const res = await fetch('/api/user-profile', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  const data = await res.json();
  document.getElementById('q-se-phone').value = data.phone || phone;
  document.getElementById('q-profile-prompt')?.classList.add('hidden');
}

// -- Main Init ----------------------------------------------

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
             
             const availableSkus = SKUS.map(s => ({ key: s.key, name: s.name }));
             
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
          alert('Failed to parse quote: ' + e.message);
          overlay.classList.add('hidden');
        }
      };

      mediaRecorder.start();

    } catch (e) {
      console.error("Microphone access denied or error:", e);
      alert('Could not access microphone: ' + e.message);
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
    alert("AI couldn't extract any recognizable product plans from your dictation.");
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

        // Briefly switch active item to fill it
        const originalActive = QG.activeItemId;
        window.switchActiveItem(item.id);
        
        const hasFreeUsers = document.getElementById('qf_free_users');
        const hasNumUsers = document.getElementById('qf_num_users');
        const hasChannels = document.getElementById('qf_num_channels');
        
        if (hasFreeUsers && !hasFreeUsers.disabled) {
            hasFreeUsers.value = qty;
            window.updateFormValue('free_users', qty);
        } else if (hasNumUsers && !hasNumUsers.disabled) {
            hasNumUsers.value = qty;
            window.updateFormValue('num_users', qty);
        } else if (hasChannels && !hasChannels.disabled) {
            hasChannels.value = qty;
            window.updateFormValue('num_channels', qty);
        }
        
        window.switchActiveItem(originalActive); // switch back
    });
    
    updatePreview();
    alert('Quote Auto-Generated Successfully from Voice AI! Check the right preview panel.');
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
    }

    const [qRes, dRes, aRes, sRes] = await Promise.all(fetches);

    if (qRes && qRes.ok) {
      const quotes = await qRes.json();
      const mine = quotes.filter(q => q.status !== 'deleted');
      const countEl = document.getElementById('my-quotes-count');
      if (countEl) countEl.textContent = mine.length;
      const allEl = document.getElementById('all-quotes-count');
      if (allEl) allEl.textContent = quotes.length;
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
  ['q-client-company', 'q-client-contact', 'q-client-email', 'q-client-phone'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
  document.getElementById('q-se-phone')?.addEventListener('input', updatePreview);

  // Generate
  document.getElementById('q-btn-generate')?.addEventListener('click', generateQuote);
  document.getElementById('q-btn-draft')?.addEventListener('click', saveDraft);
  document.getElementById('q-btn-reset')?.addEventListener('click', () => {
    if (confirm('Reset all fields and start a new quote?')) {
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
    // Always show the request button to everyone
    document.getElementById('q-btn-sku-request')?.classList.remove('hidden');

    if (d.isAdmin) {
      document.getElementById('qtab-allquotes')?.classList.remove('hidden');
      document.getElementById('qtab-approvals')?.classList.remove('hidden');
      document.getElementById('qtab-skurequests')?.classList.remove('hidden');
    }
  }).catch(() => { });

  initProfile();
  initQuoteNumber();
  updatePreview();
  updateNavCounters();

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
}

// Hook into DOMContentLoaded (app.js already calls it, so we hook in)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupQuoteGenerator);
} else {
  setupQuoteGenerator();
}
