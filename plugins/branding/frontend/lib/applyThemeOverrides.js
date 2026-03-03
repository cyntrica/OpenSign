// Runtime CSS injection for DaisyUI 4.x theme color overrides
// Injects a <style> element that overrides DaisyUI CSS custom properties.

import { hexToOklch } from './oklchConvert.js';

// DaisyUI 4.x CSS variable names for each color token
const TOKEN_TO_VAR = {
  'primary': '--p',
  'primary-content': '--pc',
  'secondary': '--s',
  'secondary-content': '--sc',
  'accent': '--a',
  'accent-content': '--ac',
  'neutral': '--n',
  'neutral-content': '--nc',
  'base-100': '--b1',
  'base-200': '--b2',
  'base-300': '--b3',
  'base-content': '--bc',
  'info': '--in',
  'info-content': '--inc',
  'success': '--su',
  'success-content': '--suc',
  'warning': '--wa',
  'warning-content': '--wac',
  'error': '--er',
  'error-content': '--erc',
};

const STYLE_ID = 'branding-theme-overrides';

function buildCssBlock(selector, themeObj) {
  if (!themeObj || typeof themeObj !== 'object') return '';

  const declarations = [];
  for (const [token, hex] of Object.entries(themeObj)) {
    if (!hex || !TOKEN_TO_VAR[token]) continue;
    const oklch = hexToOklch(hex);
    if (oklch) {
      declarations.push(`  ${TOKEN_TO_VAR[token]}: ${oklch};`);
    }
  }

  if (declarations.length === 0) return '';
  return `${selector} {\n${declarations.join('\n')}\n}`;
}

/**
 * Apply theme color overrides by injecting/updating a <style> element.
 * Pass empty objects to remove all overrides.
 */
export function applyThemeOverrides(themeLight, themeDark) {
  const lightCss = buildCssBlock('[data-theme="opensigncss"]', themeLight);
  const darkCss = buildCssBlock('[data-theme="opensigndark"]', themeDark);
  const fullCss = [lightCss, darkCss].filter(Boolean).join('\n\n');

  let styleEl = document.getElementById(STYLE_ID);

  if (!fullCss) {
    // No overrides — remove the style element if it exists
    if (styleEl) styleEl.remove();
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = fullCss;
}
