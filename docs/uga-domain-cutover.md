# UGA Domain Cutover: index.uga.ua

UGA Index is prepared to run on the UGA-owned subdomain:

```txt
https://index.uga.ua
```

The existing 1d3x mirror remains active:

```txt
https://uga.1d3x.com
```

No redirect is required between these two domains. The site can live on both
domains at the same time.

## Vercel Project

The domain has been added to the Vercel project:

```txt
Project: uga-index
Domain: index.uga.ua
```

Vercel reports that the domain is waiting for DNS configuration.

## DNS Record For UGA

Ask the UGA domain administrator to add this DNS record:

```txt
Type: A
Name / Host: index
Value / Address: 76.76.21.21
TTL: Auto or 300 seconds
```

Equivalent full record:

```txt
A index.uga.ua 76.76.21.21
```

Vercel recommended this record for the current `uga.ua` DNS setup. UGA should
not change the root `uga.ua` nameservers for this cutover.

## After DNS Is Added

1. Wait for DNS propagation.
2. Vercel will verify the domain automatically.
3. Vercel will issue HTTPS automatically.
4. Verify:

```bash
dig index.uga.ua A +short
curl -I https://index.uga.ua
curl -L https://index.uga.ua/api/health
```

Expected DNS answer:

```txt
76.76.21.21
```

## Application Configuration

UGA production environment should use:

```bash
NEXT_PUBLIC_SITE_URL="https://index.uga.ua"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://index.uga.ua https://uga.1d3x.com https://index-uga.cr0pto.com"
```

Keep `https://uga.1d3x.com` in `ALLOWED_EMBED_ORIGINS` while the mirror remains
active.
