# Security Policy

## Supported Versions

Only the latest version of WPS Sentinel is actively maintained and receives security updates.

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| older   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, do not open a public GitHub Issue.

Please report it privately by emailing the maintainer directly. Include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an acknowledgment within 72 hours and a resolution timeline within 14 days depending on severity.

## Scope

The following are considered in-scope for security reports:

- Exposed credentials or API keys in source code or build output
- Cross-site scripting (XSS) vulnerabilities
- Data injection via AIS stream parsing
- Insecure external resource loading

## Out of Scope

- Vulnerabilities in third-party libraries (Leaflet, AISStream) — report those upstream
- Issues requiring physical access to the server
- Social engineering attacks

## API Key Handling

This is a client-side application. The AISStream API key is loaded from environment variables at build time via `VITE_AISSTREAM_API_KEY` and is embedded in the compiled JavaScript bundle. It is therefore visible to anyone who inspects the source.

To mitigate risk:

- Store the API key in `.env.local`, which is excluded from version control via `.gitignore`
- Never hardcode keys directly in source files
- Restrict your API key by domain or origin in the AISStream dashboard
- Rotate the key immediately if you suspect it has been compromised

The `.env.example` file provides a safe template with no real credentials. The `dist/` and `node_modules/` directories are also excluded from version control.

## Disclosure Policy

We follow responsible disclosure. Once a fix is released, the vulnerability may be publicly disclosed with credit to the reporter, unless they prefer to remain anonymous.
