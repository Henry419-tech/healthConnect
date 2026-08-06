// src/components/BodyPageAttribute.tsx
//
// Sets data-page on <body> from the very first frame on both hard navigation
// and soft (client-side) navigation.
//
// WHY TWO MECHANISMS:
//   Hard nav  → The inline <script> runs synchronously during HTML parsing,
//               before the browser applies any CSS rules. This guarantees
//               body[data-page="emergency"] selectors resolve on the
//               very first paint — no flash of unstyled layout.
//
//   Soft nav  → Next.js client router never re-runs server components, so
//               the inline script is never injected again. The page's own
//               useLayoutEffect (which already exists) handles this path.
//               We no longer depend on this component for soft nav at all.
//
// The script is placed as early as possible (before children) so it runs
// before any CSS-triggering content is parsed by the browser.

export function BodyPageAttribute({ page }: { page: string }) {
  // Strictly sanitize: only allow alphanumeric + hyphens to prevent XSS
  const safePage = page.replace(/[^a-z0-9-]/gi, '');

  const script = [
    // 1. Set the attribute immediately (hard nav — synchronous, pre-paint)
    `(function(){`,
    `  try {`,
    `    document.body.setAttribute('data-page','${safePage}');`,
    // 2. Also persist to sessionStorage so the page's useLayoutEffect can
    //    verify the attribute was already set (avoids double-flash on hydration)
    `    sessionStorage.setItem('hc-page','${safePage}');`,
    `  } catch(e) {}`,
    `})();`,
  ].join('');

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional sync pre-paint script
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}
