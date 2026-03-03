// Default branding values — single source of truth
export const BRANDING_DEFAULTS = {
  appName: 'SineSeal',
  logoUrl: '',
  logoDarkUrl: '',
  faviconUrl: '',
  footerText: '',
  footerUrl: '',
  emailLogoUrl: '',
  socialLinks: [
    { icon: 'fa-brands fa-github', title: 'GitHub', url: '', sortOrder: 0 },
    { icon: 'fa-brands fa-linkedin', title: 'LinkedIn', url: '', sortOrder: 1 },
    { icon: 'fa-brands fa-square-x-twitter', title: 'X', url: '', sortOrder: 2 },
    { icon: 'fa-brands fa-discord', title: 'Discord', url: '', sortOrder: 3 },
  ],
  themeLight: {},
  themeDark: {},
};

// DaisyUI color tokens that are valid for theme overrides
export const VALID_THEME_TOKENS = [
  'primary', 'primary-content',
  'secondary', 'secondary-content',
  'accent', 'accent-content',
  'neutral', 'neutral-content',
  'base-100', 'base-200', 'base-300', 'base-content',
  'info', 'info-content',
  'success', 'success-content',
  'warning', 'warning-content',
  'error', 'error-content',
];
