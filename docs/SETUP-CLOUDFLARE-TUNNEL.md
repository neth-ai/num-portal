# Publishing the server with Cloudflare Tunnel

Cloudflare Tunnel gives every service a public HTTPS address without opening any port on the server or the
router: `cloudflared` on the server keeps an **outgoing** encrypted connection to Cloudflare, and Cloudflare sends
visitors through it. One tunnel serves all addresses.

```
Visitor ──HTTPS──► Cloudflare ══ tunnel (outgoing from the server) ══► cloudflared ──► 127.0.0.1:3000 … 4010
```

## Requirements

- A domain whose DNS is managed by Cloudflare (Cloudflare dashboard → **Add a site** → free plan → change the
  name servers at your domain registrar to the two Cloudflare name servers shown).
- `cloudflared` installed on the server (`scripts/server-setup.sh` does this).

> Use **one level** of subdomain: `tester-1.example.com`, not `tester-1.numportal.example.com`.
> The free Cloudflare certificate covers `*.example.com` only.

## 1. Log in and create the tunnel

```bash
cloudflared tunnel login                 # opens a link: choose your domain → Authorize
cloudflared tunnel create numportal      # prints the tunnel ID and creates ~/.cloudflared/<ID>.json
```

## 2. Configuration file

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<TUNNEL-ID>.json /etc/cloudflared/
sudo cp infra/cloudflared-config.yml /etc/cloudflared/config.yml
sudo nano /etc/cloudflared/config.yml    # replace example.com with your domain and <TUNNEL-ID> with the id
cloudflared tunnel ingress validate --config /etc/cloudflared/config.yml
```

## 3. DNS names (one command per address)

```bash
D=example.com   # your domain
for h in portal manual devops staging tester-1 tester-2 tester-3 tester-4 tester-5 \
         tester-6 tester-7 tester-8 tester-9 tester-10; do
  cloudflared tunnel route dns numportal "$h.$D"
done
```

Each command creates a proxied CNAME record `<name> → <TUNNEL-ID>.cfargotunnel.com` (visible in Cloudflare → DNS).

## 4. Run it as a service

```bash
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared             # should be "active (running)"
```

## 5. Check

```bash
curl -s https://portal.example.com/api/health     # {"status":"ok",...}  (after the first deploy_live_portal)
curl -s https://staging.example.com/api/health
```

An address that shows **Error 502 / Bad gateway** means the tunnel works but nothing is running yet on that port
(for example `tester-3` before Teacher 3's first request) – this is expected.

## Alternative: tunnel managed in the dashboard

Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel → Cloudflared** gives one install command with a
token (`sudo cloudflared service install <token>`). Then add each **Public hostname** (`portal` → `http://127.0.0.1:3000`,
`manual` → `:3001`, `devops` → `:3002`, `staging` → `:3003`, `tester-1` … `tester-10` → `:4001` … `:4010`). The result
is the same; the YAML file above is kept in the repository so the setup can be repeated and cited in the thesis.

## Security notes

- The server needs **no open incoming ports** (only SSH, which can also be closed and reached through Cloudflare Access).
- Every container listens on `127.0.0.1` only; it is reachable from outside only through the tunnel.
- The GitLab webhook is protected by its secret token; the experiment page needs the researcher login.
