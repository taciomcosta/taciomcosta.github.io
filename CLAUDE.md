# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal website/blog with a terminal/monospace aesthetic. Built with plain HTML/CSS/JS and a Node.js build script that converts Markdown to HTML. Deployed to GitHub Pages at `taciomcosta.dev` via GitHub Actions. The `source` branch holds source content; CI builds and pushes output to `master`.

## Commands

```bash
# Install dependencies
npm install

# Build the site (outputs to public/)
node build.js

# Serve locally
npx serve public
```

## Content structure

- `content/posts/` — blog posts. EN files: `slug.md`. PT-BR translations: `slug.pt-br.md`.
- `content/about.md` / `content/about.pt-br.md` — about page.
- `content/experiences.md` / `content/experiences.pt-br.md` — work experience page.
- `static/` — assets copied verbatim to `public/` (CSS, JS, images).
- `templates/` — HTML templates used by the build script (`base.html`, `home.html`, `page.html`, `post.html`, `list.html`).

## Post frontmatter (YAML)

```yaml
---
date: "YYYY-MM-DD"
title: "Post Title"
slug: "post-slug"
tags: ["go", "performance"]
categories: ["golang"]
draft: true
---
```

Use `draft: true` to prevent a post from appearing in the build output.

## Bilingual setup

EN pages output to root paths (`/about/`, `/posts/slug/`). PT-BR pages output under `/pt-br/` (`/pt-br/sobre/`, `/pt-br/posts/slug/`). PT-BR post slugs are independent (e.g. `profiling-em-go`, not `profiling-in-go`).

## Build script (`build.js`)

Reads Markdown from `content/`, parses YAML frontmatter with `gray-matter`, converts body to HTML with `marked`, injects into templates via `{{key}}` substitution, writes to `public/`. Also generates RSS at `/posts/index.xml` and `/index.xml`, and a `404.html`.

## Theme / styling

CSS custom properties in `static/css/style.css`:
- Dark (default): `--bg: #0f0f0f`, `--accent: #4af626` (terminal green)
- Light (`[data-theme="light"]`): `--bg: #f5f5f0`, `--accent: #006400`

Dark/light toggle state is stored in `localStorage` under key `theme`. An inline script in `<head>` (inside `templates/base.html`) applies the stored theme before first paint to avoid flash.
