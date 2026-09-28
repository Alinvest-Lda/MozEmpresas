# MozEmpresas — Design System Contract

## Objective
Keep the interface visually coherent while functionality evolves. New features reuse the existing system instead of introducing a new visual language.

## Reference principles
Single-source foundations, reusable components, consistent spacing, typography hierarchy, grid alignment, predictable navigation and accessibility. These principles are consistent with established design-system and usability guidance.

## Foundations
- Brand: MozEmpresas green and dark neutral.
- Surfaces: white, soft neutral and dark brand surface.
- Borders: one neutral line scale.
- Radius: use --radius for cards/panels and --radius-sm for compact elements.
- Shadows: use --shadow-sm and --shadow-md; do not invent new global shadow scales.
- Spacing: 4px base with an 8px rhythm through --space-*.
- Content width: --content.
- Page gutter: --gutter.
- Interactive control baseline: --control-height.
- Keyboard focus: --focus-ring.

## Page architecture
Public pages: global header, shared container, clear H1, primary action/search, content sections, contextual discovery, global footer.
Authenticated pages: global header, stable Área empresarial navigation, consistent content width, page-specific workflows inside reusable panels/cards.
The sidebar is navigation, not page content. Its structure must remain stable between authenticated routes.

## UX rules
- One primary action per meaningful surface.
- Search/filter controls precede result content on discovery pages.
- Related actions remain visually secondary.
- Empty, loading, error and success states are explicit.
- Use Mozambican Portuguese consistently.
- Do not expose internal implementation terminology.
- Company permissions are role/permission based, never buyer/seller classification.
- Mobile is a responsive adaptation, not a compressed desktop layout.
- Reuse an existing component before creating a new one.

## Layout rules
- Align top-level content to the shared container/grid.
- Use proximity and spacing to communicate relationships.
- Do not repair structural inconsistency with one-off margins.
- Do not add arbitrary page-specific breakpoints without a content reason.
- Do not add global CSS overrides to repair a single page.

## Typography rules
- One clear H1 per page.
- Section titles follow the established hierarchy.
- Body copy prioritizes readability.
- Small text is reserved for metadata, labels and fine print.
- Do not introduce new font families without a product-level decision.

## Definition of done for future functionality
- Uses existing foundations.
- Defines desktop/tablet/mobile behaviour.
- Defines loading/empty/error/success states.
- Keeps keyboard focus visible.
- Does not alter unrelated routes.
- Does not add a competing global style.
- Makes the primary action and hierarchy immediately understandable.

## Stabilization decision
The global stylesheet is historically accumulated and contains multiple generations of page-specific rules. Stabilization therefore starts with centralized foundations instead of another wholesale visual redesign. Future visual changes must be surgical and tied to a specific component or page.

This establishes the visual contract so functional development can continue without treating each feature as a redesign.