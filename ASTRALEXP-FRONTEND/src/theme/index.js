// AstralExp Design Tokens — matches neoledger_dark/DESIGN.md exactly
export const Colors = {
  background:              '#111417',
  surface:                 '#111417',
  surfaceDim:              '#111417',
  surfaceContainerLowest:  '#0b0e11',
  surfaceContainerLow:     '#191c1f',
  surfaceContainer:        '#1d2023',
  surfaceContainerHigh:    '#272a2e',
  surfaceContainerHighest: '#323538',
  surfaceBright:           '#37393d',
  onBackground:            '#e1e2e7',
  onSurface:               '#e1e2e7',
  onSurfaceVariant:        '#c5c5d4',
  primary:                 '#bac3ff',
  primaryContainer:        '#3f51b5',
  onPrimary:               '#08218a',
  onPrimaryContainer:      '#cacfff',
  secondary:               '#bec4f2',
  secondaryContainer:      '#3e446b',
  tertiary:                '#78dc77',
  tertiaryContainer:       '#00691b',
  onTertiaryContainer:     '#83e881',
  error:                   '#ffb4ab',
  errorContainer:          '#93000a',
  onErrorContainer:        '#ffdad6',
  outline:                 '#8f909e',
  outlineVariant:          '#454652',
  inversePrimary:          '#4355b9',
};

export const Fonts = {
  headline: 'System',   // will be overridden with loaded fonts
  body:     'System',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   8,
  md:   16,
  lg:   24,
  xl:   48,
  full: 9999,
};

export const Shadow = {
  ambient: {
    shadowColor:   '#3f51b5',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius:  24,
    elevation:     8,
  },
};

export const CATEGORIES = [
  { id: 'food',          label: 'Food',       icon: 'cutlery' },
  { id: 'groceries',     label: 'Groceries',  icon: 'shopping-cart' },
  { id: 'transport',     label: 'Transport',  icon: 'car' },
  { id: 'shopping',      label: 'Shopping',   icon: 'shopping-bag' },
  { id: 'entertainment', label: 'Leisure',    icon: 'film' },
  { id: 'health',        label: 'Health',     icon: 'heartbeat' },
  { id: 'utilities',     label: 'Utilities',  icon: 'bolt' },
  { id: 'education',     label: 'Education',  icon: 'graduation-cap' },
  { id: 'travel',        label: 'Travel',     icon: 'plane' },
  { id: 'rent',          label: 'Rent',       icon: 'home' },
  { id: 'subscription',  label: 'Subs',       icon: 'refresh' },
  { id: 'other',         label: 'Other',      icon: 'ellipsis-h' },
];

export const PM_TYPES = [
  { id: 'upi',   label: 'UPI',         icon: 'mobile' },
  { id: 'bank',  label: 'Bank',        icon: 'bank' },
  { id: 'card',  label: 'Card',        icon: 'credit-card' },
  { id: 'cash',  label: 'Cash',        icon: 'money' },
  { id: 'wallet',label: 'Wallet',      icon: 'google-wallet' },
  { id: 'other', label: 'Other',       icon: 'ellipsis-h' },
];

export const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
