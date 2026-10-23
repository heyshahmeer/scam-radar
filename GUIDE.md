# Scam Radar: Setup Guide (for beginners)

This guide gets the whole project running from zero, even if you forgot everything. Follow the parts in order and don't skip the checks.

**What you are building:** a web page where someone pastes a suspicious message and gets a verdict (scam / suspicious / looks safe). Behind the page, an automation tool (n8n) scores the message and a database (Postgres) saves the result. A pipeline (GitHub Actions) tests and ships every change automatically.

```
Browser -> Next.js app -> n8n workflow -> verdict back to the browser
                              |
                              +-> Postgres (saves each scan)
```

**Two ways to use this guide**
- **Path A: run the existing project** (new PC, or you forgot how). Do Parts 1, 2, 3, 4.
- **Path B: rebuild the project from zero**. Do Parts 1, then Part 5, then 2 to 4 as needed.

**Golden rules (these caused every problem we hit)**
1. Code blocks labelled `yaml`, `js`, or `dockerfile` go **inside files**. Blocks starting with `git`, `docker`, `cd` go into **PowerShell**.
2. YAML needs **spaces only, never tabs**, and sibling items must line up exactly.
3. After you edit an n8n workflow, you must **Publish** it again, or the live version doesn't change.
4. Never commit `.env`. Run `git status` before every commit.

---

## Part 1: Install the tools (one time)

| Tool | Where | Check it worked |
|---|---|---|
| Git | git-scm.com | `git --version` |
| Node.js 20 LTS | nodejs.org | `node -v` |
| VS Code | code.visualstudio.com | opens |
| Docker Desktop | docker.com | see below |
| GitHub account | github.com | you can log in |

**Docker Desktop on Windows**
1. Open PowerShell as Administrator and run `wsl --install`, then restart the PC.
2. Install Docker Desktop with the default options (WSL 2 ticked).
3. Open it, skip sign-in, and wait until the bottom-left says **Engine running**.
4. Check: `docker run hello-world` prints "Hello from Docker!".

If Docker says it cannot connect, it simply isn't running. Open Docker Desktop and wait 1 to 2 minutes.

---

## Part 2: Run the project

### Step 1: Get the code
```
git clone https://github.com/heyshahmeer/scam-radar.git
cd scam-radar
```

### Step 2: Create your secrets file
Secrets live in a file called `.env` that is never uploaded to GitHub.

1. Copy `.env.example` to `.env`.
2. Generate two random values. Run this command twice in PowerShell:
```
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```
3. Fill in `.env`:
```
DB_USER=n8n
DB_PASSWORD=<first random value>
DB_NAME=n8n
N8N_ENCRYPTION_KEY=<second random value>
```
4. Save the encryption key somewhere private. If you lose it, n8n cannot read its saved credentials.

### Step 3: Start everything
```
docker compose up -d
docker compose ps
```
You should see three containers (`postgres`, `n8n`, `web`) as running. The first start downloads images and can take a while on slow internet.

### Step 4: Set up n8n (one time)
1. Open `http://localhost:5678` and create the owner account.
2. Click **Create workflow**. Open the file `workflows/scan.json`, copy everything, click an empty spot on the canvas, and press `Ctrl+V`. You should see Webhook, Code, Postgres, and Respond to Webhook.
3. Check the wiring: **Code** must have **two** lines leaving it, one to **Postgres** and one to **Respond to Webhook**. Postgres must not connect to Respond.
4. Open the **Postgres** node, click the credential box, and create a credential:
   - Host: `postgres` (not `localhost`)
   - Database: `n8n`, User: `n8n`, Port: `5432`, SSL: Disable
   - Password: get it with `docker compose exec n8n printenv DB_POSTGRESDB_PASSWORD`
5. Press `Ctrl+S`, then **Publish** (older versions: toggle **Active**).

### Step 5: Create the database table
```
docker compose exec postgres psql -U n8n -d n8n -c "CREATE TABLE scans (id SERIAL PRIMARY KEY, verdict TEXT, score INT, reasons TEXT, urls TEXT, created_at TIMESTAMPTZ DEFAULT now());"
```
It should print `CREATE TABLE`.

### Step 6: Try it
1. Open `http://localhost:3000`.
2. Click the example "Fake JazzCash alert" and press **Scan**.
3. Expected: "Likely a scam", score 70.
4. Check the database saved it:
```
docker compose exec postgres psql -U n8n -d n8n -P pager=off -c "SELECT id, verdict, score FROM scans;"
```

**Direct API test** (skips the page):
```
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/scan" -ContentType "application/json" -Body '{"text":"URGENT: blocked. Verify your CNIC and OTP: http://bit.ly/abc123"}'
```

---

## Part 3: Everyday commands

| I want to... | Command (run in the project folder) |
|---|---|
| Start the stack | `docker compose up -d` |
| Stop it (keeps data) | `docker compose down` |
| See what is running | `docker compose ps` |
| See errors from the app | `docker compose logs web --tail 30` |
| See errors from n8n | `docker compose logs n8n --tail 30` |
| Rebuild the web app after code changes | `docker compose up -d --build web` |
| Run the tests | `cd web` then `npm test` |
| Develop with live reload | `cd web` then `npm run dev` (uses port 3001 if Docker has 3000) |
| Open the database | `docker compose exec postgres psql -U n8n -d n8n` (type `q` to leave long output) |

**Danger:** `docker compose down -v` and `docker system prune --volumes` delete your n8n and database data.

**Free disk space safely**
```
docker builder prune -f
docker image prune -f
```

---

## Part 4: The CI/CD pipeline

Every push to `main` runs four jobs (file: `.github/workflows/ci.yml`):

| Job | Runs on | Purpose |
|---|---|---|
| `web` | GitHub's servers | install, lint, test, build |
| `guards` | GitHub's servers | checks the n8n JSON is valid and `.env` isn't committed |
| `publish` | GitHub's servers | builds the Docker image and pushes it to GHCR |
| `deploy` | your own PC | pulls the new image and restarts the web container |

Each job waits for the one before it. If tests fail, nothing is published or deployed.

### One-time GitHub settings
1. **Make the image public** (so your PC can pull it without logging in): your profile, Packages, `scam-radar-web`, Package settings, Change visibility, Public. The image contains no secrets.
2. **Allow publishing:** repo Settings, Actions, General, Workflow permissions, **Read and write permissions**.
3. **Safety for the self-hosted runner:** in the same page, set approval to **Require approval for all outside collaborators**, so strangers' pull requests can't run code on your PC.

### Set up the self-hosted runner (so `deploy` can run on your PC)
1. Repo Settings, Actions, Runners, **New self-hosted runner**, Windows x64.
2. In a new PowerShell window, run the commands GitHub shows (download, then `config.cmd` with your token). Press Enter at every question.
3. Start it with `.\run.cmd`. It must say **Listening for Jobs**.
4. Keep that window open, and use a second window for everything else.
5. Add `actions-runner/` to `.gitignore` if the runner folder is inside your project, because it holds credentials.

The `deploy` job runs in the folder written in `ci.yml` (`working-directory`). If you move the project, update that path.

### How to ship a change
```
git add .
git status
git commit -m "describe your change"
git push
```
`git status` must **not** list `.env` or `actions-runner/`. Then open the repo's **Actions** tab and wait for four green checks. Refresh `localhost:3000` and your change is live.

**Reading a red run:** click the red job, click the step with the red X, and read the last 15 lines. The usual causes:
- "Invalid workflow file": indentation in `ci.yml` (use spaces, and keep `web:`, `guards:`, `publish:`, `deploy:` at the same level).
- `publish` permission error: the Read and write permissions setting above.
- `deploy` stays queued: the runner window is closed.

---

## Part 5: Rebuild from zero (Path B)

Build in this order and test after each step. Don't build the next layer until the current one works.

1. **Repo and secrets:** `git init`, create `.gitignore` containing `.env`, `.env.*`, `!.env.example`, `node_modules/`, `.next/`, `actions-runner/`. Create `.env` (Part 2, Step 2).
2. **Docker stack:** create `docker-compose.yml` (below) and run `docker compose up -d`.
3. **n8n workflow:** Webhook (POST, path `scan`, respond using "Respond to Webhook" node), then a Code node that scores the message, then Respond to Webhook. Test with the PowerShell command in Part 2. Export the canvas (`Ctrl+A`, `Ctrl+C`) into `workflows/scan.json`.
4. **Database:** create the `scans` table (Part 2, Step 5), add a Postgres Insert node in parallel with the response.
5. **Next.js app:** `npx create-next-app@latest web` (JavaScript, App Router, no TypeScript), add `web/.env.local` with `N8N_WEBHOOK_URL=http://localhost:5678/webhook/scan`, an API route at `web/app/api/scan/route.js` that forwards to n8n, and a page at `web/app/page.js`.
6. **Tests:** put the scoring rules in `web/lib/score.mjs`, write `web/lib/score.test.mjs` with Node's built-in runner, and add `"test": "node --test"` to `web/package.json`.
7. **Dockerize:** set `output: 'standalone'` in `web/next.config.mjs`, add `web/Dockerfile` and `web/.dockerignore`, and add the `web` service to `docker-compose.yml`.
8. **CI/CD:** add `.github/workflows/ci.yml`, make the image public, set up the runner (Part 4).

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 10

  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: ${DB_NAME}
      DB_POSTGRESDB_USER: ${DB_USER}
      DB_POSTGRESDB_PASSWORD: ${DB_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      GENERIC_TIMEZONE: Asia/Karachi
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy

  web:
    image: ghcr.io/heyshahmeer/scam-radar-web:latest
    build: ./web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      N8N_WEBHOOK_URL: http://n8n:5678/webhook/scan
    depends_on:
      - n8n

volumes:
  pg_data:
  n8n_data:
```
Check the file is valid with `docker compose config`.

### `web/Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

### `web/.dockerignore`
```
node_modules
.next
.env*
.git
```

### `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          N8N_WEBHOOK_URL: http://localhost:5678/webhook/scan

  guards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate n8n workflow JSON
        run: node -e "JSON.parse(require('fs').readFileSync('workflows/scan.json','utf8')); console.log('valid')"
      - name: Fail if .env is tracked
        run: test -z "$(git ls-files .env)"

  publish:
    needs: [web, guards]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./web
          push: true
          tags: |
            ghcr.io/heyshahmeer/scam-radar-web:latest
            ghcr.io/heyshahmeer/scam-radar-web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: publish
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: self-hosted
    steps:
      - name: Pull and restart web
        shell: powershell
        working-directory: C:\Users\thesh\vscode\newproject
        run: |
          docker compose pull web
          docker compose up -d --no-deps web
```
Change `heyshahmeer`, the image name, and the `working-directory` path if you use a different account or folder.

---

## Part 6: Show it to people (optional)

Your PC does **not** need to run 24/7. Turn things on only for demos.

1. Make sure `docker compose ps` shows `web` running.
2. In a new PowerShell window:
```
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```
(If the command isn't found, close and reopen PowerShell.)
3. It prints a `https://....trycloudflare.com` link. Open it on your phone. The link changes every time you restart the tunnel, and closing the window stops it.
4. **Never tunnel port 5678.** That is your n8n admin panel.

Until rate limiting is added, only share the link with people you trust, because anyone with it can write rows to your database.

---

## Troubleshooting (real errors we hit)

| What you see | Cause and fix |
|---|---|
| `failed to connect to the docker API` | Docker Desktop isn't running. Open it and wait for "Engine running". |
| Docker Desktop won't open after a hang | End its processes in Task Manager, run `wsl --shutdown`, reopen, or restart the PC. |
| `npm ci` takes many minutes inside Docker | Slow network. Let it finish once. Later builds reuse the cache. |
| n8n 404: webhook "is not registered" (test URL) | Test URLs work once, only right after clicking "Listen for test event". Use the **production** URL after publishing. |
| n8n 404: "POST scan is not registered" | The workflow isn't published. Press Publish (or toggle Active). |
| Postgres credential: `EAI_AGAIN postgre` | Typo in Host. It must be exactly `postgres`. |
| Postgres credential can't connect | Host must be `postgres`, not `localhost`. Copy the password from `printenv DB_POSTGRESDB_PASSWORD`. |
| Page crashes: `result.reasons.map is not a function` | Respond to Webhook is receiving Postgres output. Rewire so Code connects to both Postgres and Respond. |
| Hydration warning mentioning `bis_skin_checked` | A browser extension adds attributes. Harmless. Use Incognito. |
| `runs-on: : The term is not recognized` | You pasted YAML into PowerShell. It belongs inside the file. |
| "Invalid workflow file" on GitHub | Indentation in `ci.yml`. Siblings must have the same number of spaces. |
| `git push` shows `credential-manager-core is not a git command` | Harmless warning if the push still succeeds. |
| `cloudflared` not recognized | Close and reopen PowerShell after installing. |
| `.env` got committed once | Treat those secrets as leaked: generate new values, update `.env`, then `docker compose down -v` and `docker compose up -d`, and redo Part 2, Steps 4 and 5. |

---

## Security checklist
- `.env` is git-ignored and CI fails if it is ever tracked.
- Only the web app is exposed publicly, never n8n.
- Raw messages are not stored, only verdict, score, reasons, and links.
- The self-hosted runner executes code on your PC, so keep outside-collaborator approval on and don't leave the runner running when you don't need it.