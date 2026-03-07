---
"thought-cabinet": patch
---

Refactor bundled agent assets and installation behavior so agent/skill files are organized under dedicated directories and installed via direct symlinks to packaged source assets. Also tighten published package file inclusion to avoid shipping redundant `.thought-cabinet` assets.
