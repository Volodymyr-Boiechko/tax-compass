# Changelog

## v1.1.0 (2026-06-01)

- **i18n:** Full EN/UK language switching via ngx-translate; persists to localStorage; auto-detects browser language
- **Cleanup:** Remove tracked PDF, claude worktree artifacts, one-time migration scripts from git
- **Docs:** Rewrite README as portfolio piece with "vibe-coded" disclosure; add ARCHITECTURE.md; add LICENSE (MIT)

## v1.0.0 (2026-05-31)

- Initial production release
- 147 countries; 124 (84%) with detailed regime parameterization
- Special regimes: Spain Beckham, Portugal IFICI/NHR, Italy Forfettario, Ukraine ФОП, Georgia SBS, and 20+ others
- Single source of truth: all regimes flow through RegimeCalculationService
- Map (Leaflet choropleth) + table views
- My List (localStorage), side-by-side comparison, keyboard shortcuts
- Dark/light theme
- Production: https://tax-compass.vercel.app
