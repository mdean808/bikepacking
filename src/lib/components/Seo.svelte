<script lang="ts">
  import { OG_HEIGHT, OG_WIDTH, SITE_NAME, absoluteUrl, ogImagePath } from '$lib/seo';

  interface Props {
    /** Used as-is when it already is the site name, otherwise suffixed with it. */
    title: string;
    description: string;
    /** Root-relative path of this page, which becomes the canonical and og:url. */
    path: string;
    /** Slug of the trip whose card to show. Omit for the site-wide card. */
    ogSlug?: string;
    /** What the card depicts, read out by screen readers on Mastodon and X. */
    ogAlt: string;
    /** 'article' on a trip, which is what lets scrapers show a date alongside it. */
    type?: 'website' | 'article';
    /** ISO date the trip was ridden. */
    publishedAt?: string;
  }

  let { title, description, path, ogSlug, ogAlt, type = 'website', publishedAt }: Props = $props();

  const fullTitle = $derived(title === SITE_NAME ? title : `${title} — ${SITE_NAME}`);
  const canonical = $derived(absoluteUrl(path));
  const image = $derived(absoluteUrl(ogImagePath(ogSlug)));
</script>

<!-- Lives on each page rather than the layout: two <title> tags in one document
     is what you get otherwise, and the prerendered HTML keeps both. -->
<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />

  <meta property="og:type" content={type} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:locale" content="en_CA" />
  <meta property="og:image" content={image} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content={String(OG_WIDTH)} />
  <meta property="og:image:height" content={String(OG_HEIGHT)} />
  <meta property="og:image:alt" content={ogAlt} />
  {#if publishedAt}
    <meta property="article:published_time" content={publishedAt} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  <meta name="twitter:image:alt" content={ogAlt} />
</svelte:head>
