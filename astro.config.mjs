// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// Canonical origin. Set the SITE_URL Actions variable when the custom domain (rajeev.pro) goes live.
const site = process.env.SITE_URL || 'https://rajeevxportfolio.netlify.app';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/thanks') }), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: true,
});
