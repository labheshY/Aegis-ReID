/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        surface: 'var(--surface)',
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)'
      ,
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)'
      }
      ,
      fontFamily: {
        display: ['var(--font-display)'],
        ui: ['var(--font-ui)']
      }
    }
  },
  plugins: (() => {
    try {
      // attempt to require forms plugin if installed
      // eslint-disable-next-line global-require
      const forms = require('@tailwindcss/forms');
      return [forms];
    } catch (e) {
      // plugin missing in the environment (e.g., not installed); skip gracefully
      // this avoids a hard crash during builds in restricted environments
      // when the plugin is intentionally unavailable.
      // eslint-disable-next-line no-console
      console.warn('@tailwindcss/forms not found, continuing without forms plugin');
      return [];
    }
  })(),
}
