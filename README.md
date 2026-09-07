# Newcastle Post Office timeline

An interactive model of the Newcastle Post Office site at Hunter and Bolton Streets, from 1026 to 2526. Geometry builds, ages and collapses as the year changes, with moving people, wildlife, vehicles, seasons and future vegetation.

This repository contains two pages:

- **Timeline** (`index.html`): the main experience.
- **Photo Comparison** (`post-office.html`): the building model aligned with credited 2015 and 2019 photographs.

The Street Block and earlier transformation experiment are excluded.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To serve a production build:

```sh
npm run build
npm run preview
```

## Controls

- Select a milestone, drag the timeline or enter a year. Play, reverse and speed control the timeline.
- Drag to orbit; right-drag to pan; scroll, pinch or use +/− to zoom. Double-click a surface to focus. Overview and Street/Ground view restore preset cameras.
- Pause movement independently of the year. Choose a season and optionally enable future tidal water.
- Untick **Show labels** to hide the era, year and camera hint. This preference is remembered in the browser.
- With the canvas focused: Space plays/pauses; arrows adjust the year; Shift+arrow changes 25 years; Home/End selects the endpoints; R resets the view; F toggles fullscreen.
- On Photo Comparison, select either photograph and adjust the overlay slider, or choose Photo only / Model only.

## Evidence and assets

The site is a working interpretation, not a measured survey. Its contemporary geometry relies principally on 2015 and 2019 photographs. Early figures, clothing, landscape, routes and animals are interpreted; First Nations connection to Country is continuing. Future abandonment, collapse and water are authored scenarios, not forecasts. See [Evidence and sources](EVIDENCE.md) and [Attributions](ATTRIBUTIONS.md).

`src/` contains the editable browser code. `public/models/` contains the exported GLB models and manifests. Browser movement, people, fauna, plants and water are procedural additions to those models. Original Blender working files remain in the separate development workspace; this repository ships the browser version. No Snowball private archive, credentials or research downloads are included.

## Validation

After building, run `npx playwright install chromium` once and then `npm test`. The release check serves the build below a project-style URL prefix, checks both pages and their local assets, exercises timeline and photo controls, and captures desktop/mobile screenshots in `work/qa/release/`. This checks the application, not historical accuracy.

## Static hosting

The build uses relative paths and can be hosted under a GitHub Pages project directory or another static host. Upload the **contents** of `dist/`. Only the two pages and their required assets are built.
