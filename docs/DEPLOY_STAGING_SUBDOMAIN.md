# Staging Subdomain Deployment

Goal: keep `https://livelinepcbn.com` stable on `main`, while using a separate subdomain for new features.

Recommended subdomain:

`https://staging.livelinepcbn.com`

## How it works

- `main` keeps deploying production.
- Branch `staging` deploys to a separate Cloudflare Worker.
- Production Worker: `website-electricity`
- Staging Worker: `website-electricity-staging`

## Required DNS / Cloudflare routing

Attach `staging.livelinepcbn.com` as a Cloudflare Workers custom domain for the staging Worker.

Current routing:

- `livelinepcbn.com` -> `website-electricity`
- `www.livelinepcbn.com` -> `website-electricity`
- `staging.livelinepcbn.com` -> `website-electricity-staging`

## GitHub Actions secrets

Add these repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Deploy flow

1. Push feature branches into `staging`.
2. GitHub Actions runs `.github/workflows/deploy-staging.yml`.
3. Wrangler deploys to Worker `website-electricity-staging`.
4. `staging.livelinepcbn.com` serves that staging Worker.

## Production stays unchanged

The existing `main` workflow and `livelinepcbn.com` deployment remain untouched.
