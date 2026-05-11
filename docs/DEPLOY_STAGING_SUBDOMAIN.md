# Staging Subdomain Deployment

Goal: keep `https://livelinepcbn.com` stable on `main`, while using a separate subdomain for new features.

Recommended subdomain:

`https://staging.livelinepcbn.com`

## How it works

- `main` keeps deploying production.
- Branch `staging` deploys to the staging server/process.
- Staging uses a separate PM2 process name: `patctc-staging`.
- Staging uses a separate app port, e.g. `3001`.

## Required DNS / reverse proxy

Create a DNS record for the subdomain and point it to the same origin server or a separate staging origin.

If you use the same server, add a reverse proxy for:

- `livelinepcbn.com` -> production app
- `staging.livelinepcbn.com` -> staging app

Example upstreams:

- production app port: `3000`
- staging app port: `3001`

## GitHub Actions secrets

Add these repository secrets:

- `STAGING_SERVER_HOST`
- `STAGING_SERVER_PORT`
- `STAGING_SERVER_USER`
- `STAGING_SERVER_PASSWORD`
- `STAGING_APP_PORT`

## Deploy flow

1. Push feature branches into `staging`.
2. GitHub Actions runs `.github/workflows/deploy-staging.yml`.
3. Staging server extracts the archive to `/home/tien/website-staging`.
4. PM2 restarts `patctc-staging`.
5. DNS/subdomain routes traffic to the staging app.

## Production stays unchanged

The existing `main` workflow and `livelinepcbn.com` deployment remain untouched.
