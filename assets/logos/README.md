# Client Logos

Drop single-file client logos into this folder using **transparent `.svg` or `.png`** files (no solid white rectangle backgrounds).

1. Place files here, e.g. `acme.svg`, `globex.png`.
2. Add entries in `data/logos.json` (either `{ "name": "Acme", "file": "acme.svg" }` or `"acme.svg"`).

The CSS `filter` pipeline renders every logo monochrome black at rest and transitions smoothly to its original brand colors on hover/focus.
