# Board-level driver feedback

Durable record of driver decisions/guidance captured by /kanban.
Verified: the App DOES have Workflows:write, but that was never the blocker. Root cause was the git
credential-helper ordering — `gh auth setup-git`'s global helper (`gh auth git-credential`, personal
OAuth token, no `workflow` scope) was consulted before the local `git-credential-github-app.sh`, so
`git push` presented the personal token. Error said "OAuth App … without workflow scope" (an OAuth
scope, not an App permission — the tell). Fix: local credential-helper reset in `.git/config` so the
App helper (username `x-access-token`) wins for this repo. Re-tested: pushing `.github/workflows/ci.yml`
now succeeds. Blocker cleared; CARD-002 → deliver. (setup bug: `setup-github-app-git.sh` should add the
reset so `gh auth setup-git` can't shadow it.)
