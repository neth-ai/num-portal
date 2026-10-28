# មគ្គុទ្ទេសក៍រហ័ស NUM Portal (ភាសាខ្មែរ)

ឯកសារនេះសង្ខេបជំហានទាំងអស់ ចាប់ពីការសាកល្បងលើកុំព្យូទ័រផ្ទាល់ខ្លួន រហូតដល់ការដាក់ឱ្យដំណើរការពិត និងការប្រមូលទិន្នន័យសម្រាប់ Chapter V។
ព័ត៌មានលម្អិតមាននៅក្នុងឯកសារភាសាអង់គ្លេសក្នុង folder `docs/`។

---

## ជំហាន ១ — សាកល្បងលើកុំព្យូទ័រ (មិនត្រូវការ GitLab ឬ API key)

ត្រូវការ: **Node.js 20+** និង **Docker Desktop**

```bash
docker compose -f docker-compose.dev.yml up -d
cd apps/num-portal
cp .env.example .env
```

បើក `.env` ហើយកែបន្ទាត់នេះ៖

```
DATABASE_URL="postgresql://numportal:numportal@127.0.0.1:5432/numportal_live"
```

បន្ទាប់មក៖

```bash
npm install
npm run db:migrate
PASSWORD_RESEARCHER=admin123 PASSWORD_TEACHER1=teacher123 npm run db:seed
npm run dev
```

បើក http://localhost:3000 → Sign in ជា `teacher1` / `teacher123` → វាយ *Create a sample CV page for me* → មើល pipeline នៅ **Live dashboard**។
(ពេលគ្មាន GitLab token កម្មវិធីដំណើរការក្នុង **local mode** ហើយ pipeline ត្រូវបានក្លែងធ្វើ (simulated)។)

ពិនិត្យកូដ៖ `npm test` · `npm run lint` · `npm run build`

---

## ជំហាន ២ — រៀបចំ Server (Ubuntu 22.04/24.04)

```bash
git clone <gitlab-url> num-portal && cd num-portal
sudo DOMAIN=yourdomain.com bash scripts/server-setup.sh
```

Script នេះដំឡើង Docker, PostgreSQL, Node.js 20, PM2, GitLab Runner និង cloudflared ហើយបង្កើតឯកសារកំណត់ (settings) នៅ `/opt/numportal/env/`។

---

## ជំហាន ៣ — GitLab CI/CD ([SETUP-GITLAB-CICD.md](SETUP-GITLAB-CICD.md))

1. បង្កើត project `num-portal` លើ GitLab (Private) ហើយ push កូដ៖
   ```bash
   git init -b main && git add . && git commit -m "NUM Portal – first version"
   git remote add origin https://gitlab.com/<user>/num-portal.git
   git push -u origin main
   ```
2. **Settings → CI/CD → Runners → New project runner** (tag: `num-portal-runner`) → លើ server៖
   `sudo gitlab-runner register --url https://gitlab.com --token glrt-...` (executor: **shell**)
3. **Settings → CI/CD → Variables**: បន្ថែម `PORTAL_ENV_STAGING`, `PORTAL_ENV_PRODUCTION`, `PORTAL_ENV_LIVE` ប្រភេទ **File** (ចម្លងពី `/opt/numportal/env/*.env`)
4. **Settings → Access tokens**: role Developer, scope `api` → ដាក់ក្នុង `PORTAL_ENV_LIVE` ជាមួយ `GITLAB_PROJECT_ID` និង `ANTHROPIC_API_KEY`
5. **Settings → Webhooks**: URL `https://portal.<domain>/api/webhooks/gitlab` + secret + Push / Pipeline / Job events
6. កែ `PUBLIC_DOMAIN` នៅខាងលើ `.gitlab-ci.yml` ជា domain របស់អ្នក

---

## ជំហាន ៤ — Open source លើ GitHub

1. បង្កើត repository **Public** `num-portal` លើ GitHub (កុំបន្ថែម README)
2. បង្កើត fine-grained token (Contents: Read and write)
3. GitLab → **Settings → Repository → Mirroring repositories** → URL `https://github.com/<user>/num-portal.git`, Direction **Push**, ធីក **Mirror only protected branches**

រាល់ពេល push ទៅ `main` លើ GitLab កូដនឹងចម្លងទៅ GitHub ដោយស្វ័យប្រវត្តិ។

---

## ជំហាន ៥ — Cloudflare Tunnel ([SETUP-CLOUDFLARE-TUNNEL.md](SETUP-CLOUDFLARE-TUNNEL.md))

```bash
cloudflared tunnel login
cloudflared tunnel create numportal
sudo mkdir -p /etc/cloudflared && sudo cp ~/.cloudflared/<ID>.json /etc/cloudflared/
sudo cp infra/cloudflared-config.yml /etc/cloudflared/config.yml   # កែ example.com និង <TUNNEL-ID>
D=yourdomain.com
for h in portal manual devops staging tester-1 tester-2 tester-3 tester-4 tester-5 \
         tester-6 tester-7 tester-8 tester-9 tester-10; do cloudflared tunnel route dns numportal "$h.$D"; done
sudo cloudflared --config /etc/cloudflared/config.yml service install
```

⚠️ ប្រើ subdomain **តែមួយកម្រិត** (`tester-1.yourdomain.com`) ព្រោះ certificate ឥតគិតថ្លៃរបស់ Cloudflare គ្របដណ្តប់តែ `*.yourdomain.com`។

---

## ជំហាន ៦ — Pipeline ដំបូង និងគណនីអ្នកវាយតម្លៃ

1. Push ទៅ `main` → pipeline: test → build → staging → (ចុច ▶) production
2. ចុច ▶ **deploy_live_portal** (NUM Portal លើ port 3000)
3. បង្កើតគណនី៖ `docker exec -it numportal-live node scripts/seed.mjs` (ផ្តល់ password ម្នាក់មួយបន្ទាត់ ដល់ Teacher 1–5)

---

## ជំហាន ៧ — ពិសោធន៍ និងបញ្ចូលទិន្នន័យពិត ([EXPERIMENT-GUIDE.md](EXPERIMENT-GUIDE.md))

- **Method A (manual)**: `source scripts/manual-session.sh` → `run_start S2 3` → ធ្វើតាម SOP → `run_end`
- **Method B (DevOps)**: ដាក់ tag ដូចជា `[S2-03]` ក្នុងចំណងជើង merge request → merge → ចុច ▶ deploy_production
  (NUM Portal កត់ត្រាពេលវេលាដោយស្វ័យប្រវត្តិ)
- Scenario នីមួយៗ (S1–S5) ធ្វើ **១០ ដង** សម្រាប់ Method នីមួយៗ តាមលំដាប់ **A B B A**
- ទាញ `manual-runs.csv` និង `deployments.csv` ពី server → upload នៅទំព័រ **Experiment data** → **Download CSV for analysis**
- គណនាស្ថិតិ៖
  ```bash
  pip install -r analysis/requirements.txt
  python analysis/analyze.py experiment-runs.csv --apdex-a k6-manual.json --apdex-b k6-devops.json
  ```
  លទ្ធផល `analysis/output/report.md` មាន Tables 10–13 ត្រៀមចម្លងចូល Chapter V។

⚠️ `analysis/sample-data/DUMMY-experiment-runs.csv` ជាទិន្នន័យសាកល្បងប៉ុណ្ណោះ — **កុំយកលេខពីវាទៅប្រើក្នុងនិក្ខេបបទ**។
