# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub security advisories (the repository's **Security** tab, then **Report a vulnerability**). Do not open a public issue. Include steps to reproduce and the affected version or commit.

## Supported versions

Only the latest release (the `main` branch) receives security fixes.

## Deployment hardening checklist

- Serve the app over HTTPS only. The session cookie is `Secure` in production and is not kept over plain HTTP.
- Set `APP_ORIGIN` to the exact public `https://` origin. It is the CSRF check for every mutating request.
- Set `TRUST_PROXY` only when behind a reverse proxy, and make sure the app is reachable only through that proxy (for example `HOST=127.0.0.1`). Otherwise clients can forge `X-Forwarded-For` and evade rate limits.
- Keep `data/` on a persistent disk, readable only by the service user.
- Back up the database regularly (`npm run backup`) and test restoring it.
- Run the service as an unprivileged user and keep Node.js and dependencies up to date.
- Use a strong password for the admin account; there is no self-service password reset.
