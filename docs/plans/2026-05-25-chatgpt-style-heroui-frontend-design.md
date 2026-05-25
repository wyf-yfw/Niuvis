# ChatGPT-Style HeroUI Frontend Design

## Goal

Build a ChatGPT-style desktop assistant interface for Niuvis using HeroUI components as the primary UI layer.

## Direction

The app should feel like a focused desktop AI assistant, not a marketing page. The first screen is the working chat surface: a dark conversation rail on the left, a clean main chat workspace, capability shortcuts for Niuvis-specific system/file/app/search tasks, and a fixed composer.

## Scope

- Keep state local in React.
- Keep responses mocked for now.
- Use HeroUI components for buttons, cards, chips, avatars, tooltips, text area, and scroll shadows.
- Remove the invalid `HeroUIProvider` import that currently breaks production builds.
- Do not wire IPC or model providers in this pass.

## Files

- `src/renderer/index.tsx`
- `src/renderer/App.tsx`
- `src/renderer/components/sidebar/Sidebar.tsx`
- `src/renderer/components/chat/ChatArea.tsx`
- `src/renderer/styles/globals.css`

## Verification

- Run `npm run build`.
- If the HeroUI API differs from expected, adjust imports and component props until the build exits successfully.
