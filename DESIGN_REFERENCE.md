# Bluebird visual reference log

The specification supplied starter VK-like tokens but no attached official reference screenshots. The implementation records the requested geometry as an approximation rather than claiming pixel parity with a live third-party product.

| State | Viewport | Date | Notes |
| --- | ---: | --- | --- |
| desktop light | 1440×900 | 2026-11-26 | 1200px centered shell, 180px navigation, 640px content column |
| desktop dark | 1440×900 | 2026-11-26 | same geometry, dark token set |
| tablet light | 1024×768 | 2026-11-26 | right rail omitted, content remains one readable column |
| mobile light | 390×844 | 2026-11-26 | one column, 5-item bottom navigation, safe-area padding |
| mobile dark | 360×800 | 2026-11-26 | one column, bottom navigation and 44px touch targets |

The design is intentionally branded Bluebird and does not request or use real VK credentials or private assets.

## OpenVK parity skin (2026-11-26)

`apps/web/src/openvk-skin.css` now supplies the OpenVK-inspired presentation layer: compact blue header, classic left navigation, 1080px desktop workspace, dense white bordered content panels, blue-gray controls, wall/post separators, and responsive mobile fallback. It is an independent React/CSS implementation; OpenVK PHP templates and proprietary-looking image assets were not copied.
