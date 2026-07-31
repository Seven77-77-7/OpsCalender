# XPIN Ops Calendar Deployment Handoff

This document is for other Codex sessions that need to publish content or page changes to the XPIN Ops Calendar website.

## Scope and URLs

- Production site: `https://xpin-ops-calendar.vercel.app/`
- Publish repository: `Seven77-77-7/OpsCalender` (`main`)
- Publish directory: `/Users/seven/Documents/New project 2/outputs/xpin_ops_calendar_publish`
- Source calendar fallback data: `/Users/seven/Documents/New project 2/outputs/xpin_2026_2027_ops_calendar_web/data.js`
- Deployment script: `/Users/seven/Documents/New project 2/scripts/deploy_xpin_vercel.js`
- Release ZIP: `/Users/seven/Documents/New project 2/outputs/xpin_ops_calendar_publish.zip`
- Static-server target: `root@45.76.174.136:/root/static/images/xpin_ops_calendar_publish/`

## Ownership Boundaries

- Treat Google Sheet content as the source of truth for calendar records.
- Treat `data.js` as a generated website fallback. Do not hand-edit it when the Sheet is available.
- Keep `index.html`, `styles.css`, `app.js`, `feedx.html`, `feedx.js`, and configuration files unless the requested change requires them.
- Do not expose or store Vercel, GitHub, X, Google, or SSH credentials in source files, commits, output, or chat messages.
- Do not overwrite an existing `实际发布链接`. Only fill an empty or `待发布` value after a high-confidence match.

## Standard Calendar Data Release

Use this path for data imported from the Google Sheet.

1. Read `网页维护表!A:R` from spreadsheet `1qcPhG5dCh-BS7NUsn15HIHxsMFGBt13PJleD9Y-bsR4`.
2. Keep only standard `YYYY-MM-DD` dates on or after `2026-07-01`.
3. Generate `data.js` as `window.LOCAL_CALENDAR_ROWS = [...]` in both locations:
   - `/Users/seven/Documents/New project 2/outputs/xpin_2026_2027_ops_calendar_web/data.js`
   - `/Users/seven/Documents/New project 2/outputs/xpin_ops_calendar_publish/data.js`
4. Retain all 18 Sheet columns, especially `Twitter阅读量`, `点赞量`, and `回复互动量`.
5. Add the compatibility fields expected by `app.js`:
   - `活动节点` = `活动名称`
   - `productCode` = `产品编码`
   - `实际售价` = `日常售价`
   - `活动价格说明` = `套餐说明`
   - `是否已经确认` = `是否确认`
   - `阶段` = `活动形式`
6. Parse the resulting JavaScript to confirm it is valid and verify the expected row count.

## Publishing Page or Asset Changes

Work only in the publish directory. Before committing, inspect:

```sh
git status --short
git diff --check
```

The deployment script uploads a fixed allowlist. If adding a new page, script, stylesheet, asset, or documentation page that must be online, add it to `fileNames` in `scripts/deploy_xpin_vercel.js` before deployment. The current allowlist includes:

```text
index.html
styles.css
app.js
data.js
feedx.html
feedx.js
feedx-data.js
sync-config.js
README.md
google_apps_script_writeback.gs
vercel.json
```

`DEPLOYMENT_HANDOFF.md` is intentionally not deployed.

## GitHub Release

Run from the publish directory. Commit only reviewed changes.

```sh
git add <reviewed files>
git commit -m "Describe the published change"
git push origin main
```

Do not use `git add .` when unrelated user changes are present.

## Vercel Production Deployment

Run from the publish directory. The Vercel token is retrieved from macOS Keychain at runtime; never print it.

```sh
VERCEL_TOKEN="$(security find-generic-password -a xpin-ops-calendar -s vercel-token-xpin-ops-calendar -w)" \
  /Users/seven/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/seven/Documents/New\ project\ 2/scripts/deploy_xpin_vercel.js
```

The script writes deployment metadata to `/private/tmp/xpin_vercel_deploy.json`. Confirm the deployment reaches `READY` and production serves the expected new content, for example:

```sh
curl -fsS https://xpin-ops-calendar.vercel.app/ | rg 'expected unique text'
```

## ZIP and Static Server Sync

Run only after the GitHub and Vercel release has been verified.

```sh
cd /Users/seven/Documents/New\ project\ 2/outputs
zip -q -r -FS xpin_ops_calendar_publish.zip xpin_ops_calendar_publish

cp /Users/seven/Downloads/xpin_ops_calendar_sync /private/tmp/xpin_ops_calendar_sync
chmod 600 /private/tmp/xpin_ops_calendar_sync
rsync -az --delete --timeout=30 \
  -e 'ssh -i /private/tmp/xpin_ops_calendar_sync -o BatchMode=yes -o ConnectTimeout=15' \
  /Users/seven/Documents/New\ project\ 2/outputs/xpin_ops_calendar_publish/ \
  root@45.76.174.136:/root/static/images/xpin_ops_calendar_publish/
```

`--delete` makes the server mirror the publish directory. Confirm the directory contents before using it.

## Verification Checklist

- The modified files are present in the Vercel script allowlist.
- `data.js` parses and has the intended rows and fields.
- `git status --short` is clean after the intended commit.
- `git push origin main` succeeds.
- Vercel production serves an expected unique marker from the release.
- ZIP regeneration succeeds.
- `rsync` succeeds.
- Temporary files are removed without deleting source, release ZIP, publish directory, or SSH key.

## Temporary File Cleanup

Only remove task-specific temporary files:

```sh
setopt nonomatch
rm -f /private/tmp/xpin_web_maintenance*.csv \
  /private/tmp/xpin_recent_tweets*.json \
  /private/tmp/xpin_metric*.json \
  /private/tmp/xpin_tweet_link_candidates*.json \
  /private/tmp/xpin_vercel_deploy.json \
  /private/tmp/xpin_vercel_deployment_status.json \
  /private/tmp/xpin_vercel_project_status.json
```

Do not remove `/private/tmp/xpin_ops_calendar_sync`, the publish directory, source files, or the release ZIP.

## Recovery

- GitHub push fails: stop before Vercel deployment and resolve the repository state first.
- Vercel deployment fails: preserve the commit, inspect `/private/tmp/xpin_vercel_deploy.json`, fix the cause, then redeploy.
- Production verification fails: do not claim success; check the Vercel deployment state and its uploaded file allowlist.
- rsync fails: the Vercel release may still be valid; report the static-server sync as failed and retry only the server sync after resolving connectivity.
