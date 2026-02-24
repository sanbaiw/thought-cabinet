---
'thought-cabinet': patch
---

Fix slow `thc status` by removing automatic git fetch

`thc status` now runs in under 1 second. The blocking `git fetch` and `git pull --rebase` calls have been removed from the remote status check. Add `--fetch` flag to explicitly fetch from remote when fresh data is needed. A staleness hint is shown when cached remote refs are older than 6 hours.
