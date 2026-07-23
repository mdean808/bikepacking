import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true
      },

      // Static build for GitHub Pages. Every route is prerendered (see
      // src/routes/+layout.ts), so there is no server at runtime. Defaults are
      // right: output to build/, no `fallback` (with everything prerendered a
      // fallback would only hide a failed-to-prerender route behind a silent
      // client fetch), strict on so a missed route is a loud build error.
      // No `paths.base`: the site is served from a custom domain (see
      // static/CNAME), where base is '' — a project-pages URL would need one.
      adapter: adapter()
    })
  ],
  assetsInclude: '**/*.gpx'
});
