import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const workflows = [
  {
    name: 'CI/CD Pipeline',
    filename: '.github/workflows/ci-cd.yml',
    trigger: 'push to main',
    purpose: 'Build a Docker image, push to GHCR, update the GitOps repo. This is the workflow that ships every change.',
    yaml: `name: CI/CD Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Lowercase repo name
        run: |
          echo "REPO_LOWER=\${GITHUB_REPOSITORY,,}" >> $GITHUB_ENV

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: \${{ github.repository_owner }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/\${{ env.REPO_LOWER }}:latest
            ghcr.io/\${{ env.REPO_LOWER }}:\${{ github.sha }}

      - name: Update GitOps repository
        if: github.ref == 'refs/heads/main'
        shell: bash
        env:
          GIT_TOKEN: \${{ secrets.GITOPS_PAT }}
        run: |
          git config --global credential.helper store
          echo "https://\${GIT_TOKEN}:x-oauth-basic@github.com" > ~/.git-credentials

          rm -rf gitops
          git clone https://github.com/your-org/gitops-repo.git gitops
          cd gitops/Services/myapp

          if [ ! -f deployment.yaml ]; then
            echo "ERROR: deployment.yaml not found in \$(pwd)"
            ls -la
            exit 1
          fi

          sed -i "s|image: ghcr.io/\${{ env.REPO_LOWER }}:.*|image: ghcr.io/\${{ env.REPO_LOWER }}:\${{ github.sha }}|g" deployment.yaml

          git config --global user.name "GitHub Actions"
          git config --global user.email "actions@github.com"
          git add deployment.yaml
          git commit -m "Update image to \${{ github.sha }}" || echo "No changes to commit"
          git push -f https://\${GIT_TOKEN}@github.com/your-org/gitops-repo.git main`,
    secrets: [
      { key: 'GITHUB_TOKEN', note: 'Provided automatically. Used to push images to GHCR.' },
      { key: 'GITOPS_PAT', note: 'A Personal Access Token with `repo` scope on the GitOps repository. Used to commit the new image SHA back.' },
    ],
    sections: [
      {
        title: 'on: push to main',
        detail: 'The workflow only triggers on pushes to main. Feature branches run their own CI (if present) but do not trigger deploy.',
      },
      {
        title: 'if: github.ref == refs/heads/main',
        detail: 'Belt-and-braces. Even if the trigger filter were bypassed, the job only runs for main. This prevents accidental deploys from branch names that look like main.',
      },
      {
        title: 'permissions: contents + packages',
        detail: 'The job must read repo contents (checkout) and write packages (push to GHCR). Scoping permissions this narrowly means a compromised step cannot, for example, modify the repo.',
      },
      {
        title: 'Lowercase repo name',
        detail: 'GHCR requires lowercase image names. GITHUB_REPOSITORY is case-preserved. The `${GITHUB_REPOSITORY,,}` bash expansion converts it. Without this step, `ExampleOrg/MyApp` becomes an invalid tag.',
      },
      {
        title: 'Login to GHCR',
        detail: 'Uses the built-in GITHUB_TOKEN — no PAT needed to push images. This is important: the GITHUB_TOKEN is short-lived and scoped to the workflow run.',
      },
      {
        title: 'Buildx + build-push-action',
        detail: 'Buildx enables advanced build features (cache, multi-arch). build-push-action does the actual build. Two tags are produced: `latest` and the commit SHA — the SHA is what downstream systems track.',
      },
      {
        title: 'Update GitOps repository',
        detail: 'The GitOps step is what closes the loop. It clones the GitOps repo, replaces the image tag in the target deployment.yaml, commits, and force-pushes back. Force-push is used because the CI is the only writer to that path.',
      },
    ],
  },
  {
    name: 'Gitleaks Scanner',
    filename: '.github/workflows/gitleaks.yml',
    trigger: 'push to main + daily at 06:00 & 18:00 UTC',
    purpose: 'Scan the repo for accidental secret commits — API keys, tokens, private keys. Runs on every push and on a fixed schedule to catch anything that slips through.',
    yaml: `name: gitleaks automatic scanner (Every Day 6am/pm UTC)
on:
  push:
    branches:
      - main
  schedule:
    - cron: "0 6,18 * * *"   # 06:00 and 18:00 UTC daily

jobs:
  scan:
    name: gitleaks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITLEAKS_TOKEN }}`,
    secrets: [
      { key: 'GITLEAKS_TOKEN', note: 'A GitHub token (can be a fine-grained PAT) with `contents:read` on the repo. Gitleaks uses it to comment on PRs and report findings.' },
    ],
    sections: [
      {
        title: 'schedule: cron 0 6,18 * * *',
        detail: 'Runs at 06:00 UTC and 18:00 UTC every day. This catches two scenarios: (1) a secret was committed and then removed in a later commit — push-triggered scans may miss it; (2) a secret was leaked via a file that was not touched on the recent push.',
      },
      {
        title: 'fetch-depth: 0',
        detail: 'By default, actions/checkout fetches a shallow clone (depth 1). Gitleaks needs the full history to scan for secrets in old commits. `fetch-depth: 0` fetches all history.',
      },
      {
        title: 'gitleaks/gitleaks-action@v2',
        detail: 'The official Gitleaks action. Scans the repo against a comprehensive ruleset — AWS keys, GitHub tokens, private SSH keys, Stripe keys, and hundreds more. Fails the workflow if anything is found.',
      },
      {
        title: 'GITLEAKS_TOKEN',
        detail: 'Optional but recommended. Without a token, Gitleaks can still scan, but cannot post findings as PR comments or issue annotations. The token makes results visible where developers are.',
      },
    ],
  },
  {
    name: 'Discord Push Notification',
    filename: '.github/workflows/discord-notify.yml',
    trigger: 'push to main',
    purpose: 'Post a message to Discord when anything lands on main. Team awareness without email.',
    yaml: `name: Discord Push Notification
on:
  push:
    branches:
      - main

jobs:
  notify-discord:
    runs-on: ubuntu-latest
    steps:
      - name: Send Discord Notification
        uses: Ilshidur/action-discord@master
        env:
          DISCORD_WEBHOOK: \${{ secrets.DISCORD_WEBHOOK }}
        with:
          args: |
            **@here stay alert because there is a deployment to main**
            **New push to \${{ github.repository }}**
            **Pusher**: \`\${{ github.actor }}\`
            **Branch**: \`\${{ github.ref_name }}\`
            **Commit**: \`\${{ github.sha }}\`
            **Message**: \`\${{ github.event.head_commit.message }}\`
            **Repo**: [\${{ github.repository }}](\${{ github.server_url }}/\${{ github.repository }}/tree/\${{ github.ref_name }})
            **Author**: \`\${{ github.event.head_commit.author.name }}\`

            [View Commit](\${{ github.server_url }}/\${{ github.repository }}/commit/\${{ github.sha }})`,
    secrets: [
      { key: 'DISCORD_WEBHOOK', note: 'A Discord webhook URL. Created in Discord: Server Settings → Integrations → Webhooks → New Webhook. Copy the URL — that is the entire secret.' },
    ],
    sections: [
      {
        title: 'Ilshidur/action-discord',
        detail: 'A community action that POSTs to a Discord webhook URL. It handles the Discord message format so you write human-readable Markdown, not raw JSON.',
      },
      {
        title: 'DISCORD_WEBHOOK as a secret',
        detail: 'The webhook URL contains an ID and a token. Anyone with the URL can spam the channel. Treat it exactly like an API key — never in code, only in GitHub Secrets.',
      },
      {
        title: 'The `@here` mention',
        detail: '`@here` pings everyone currently online in the channel. That is intentional for a deployment notification — it should be visible, not a quiet message someone reads tomorrow.',
      },
      {
        title: 'Commit message in the notification',
        detail: '`${{ github.event.head_commit.message }}` is the actual commit message. This is why writing real commit messages matters — the notification is the first thing the team sees, and "wip" tells them nothing.',
      },
    ],
  },
];

const secretsGuide = [
  {
    name: 'DISCORD_WEBHOOK',
    where: 'GitHub repo → Settings → Secrets and variables → Actions → New repository secret',
    value: 'The full webhook URL from Discord',
    why: 'The URL includes a token that grants posting rights to the channel. If it leaks, anyone can spam the channel.',
  },
  {
    name: 'GITOPS_PAT',
    where: 'Same place — repo-level secret',
    value: 'A GitHub Personal Access Token with `repo` scope (fine-grained: Contents = Read/Write on the GitOps repository)',
    why: 'Used to commit the new image SHA back to the GitOps repo. The default GITHUB_TOKEN cannot push to a different repository.',
  },
  {
    name: 'GITLEAKS_TOKEN',
    where: 'Same place — repo-level secret',
    value: 'A GitHub token with `contents:read` (classic PAT or fine-grained)',
    why: 'Optional. Without it, Gitleaks runs but cannot post findings as PR comments or check annotations.',
  },
];

const howSecretsWork = [
  {
    step: '01',
    title: 'You add the secret in GitHub UI',
    detail: 'Repository → Settings → Secrets and variables → Actions → New repository secret. The value is encrypted at rest in GitHub and never shown again after saving.',
  },
  {
    step: '02',
    title: 'The workflow references it with ${{ secrets.NAME }}',
    detail: 'The secret is injected at runtime as an environment variable or action input. It never appears in the workflow file, which is stored in Git.',
  },
  {
    step: '03',
    title: 'GitHub injects it into the runner environment',
    detail: 'The value is provided to the job only. Logs are automatically scanned and redacted if a secret appears in output.',
  },
  {
    step: '04',
    title: 'The step uses it — then the runner is torn down',
    detail: 'The environment is ephemeral. The secret does not persist after the run.',
  },
];

const gotchas = [
  {
    title: 'Workflows that update a separate repo need a PAT, not GITHUB_TOKEN',
    detail: 'GITHUB_TOKEN is scoped to the repository running the workflow. It cannot push to a different repo. That is why GITOPS_PAT exists — it is a token owned by a user with write access to both repos.',
  },
  {
    title: 'Gitleaks catches what push-only scans miss',
    detail: 'A secret committed and reverted in the same branch never triggers a push-to-main scan. The scheduled run scans the full history and catches it. Both are necessary.',
  },
  {
    title: 'The discord webhook is effectively a password',
    detail: 'Anyone with the URL can post to the channel. If you accidentally log it or paste it in a chat, rotate it in Discord (delete and recreate the webhook), then update the GitHub Secret.',
  },
  {
    title: 'Force-push to the GitOps repo is deliberate',
    detail: 'The pipeline uses `git push -f`. That is safe because CI is the only writer to that path. If a human ever commits to the same file, the next CI run will overwrite it — which is the point: the manifest reflects the most recent image, not what someone manually edited.',
  },
  {
    title: 'Per-workflow tokens are not the same as per-repo secrets',
    detail: 'GITHUB_TOKEN is provided automatically to every workflow. GITOPS_PAT and DISCORD_WEBHOOK are user-defined secrets. The two behave differently: GITHUB_TOKEN is short-lived and scoped to the repo; user secrets are long-lived until rotated.',
  },
  {
    title: 'The `|| echo "No changes to commit"` guard prevents a false failure',
    detail: 'If the image SHA is unchanged (e.g. a re-run), `git commit` exits non-zero. That would fail the workflow even though nothing was wrong. The `|| echo` swallows that specific failure without hiding a real one.',
  },
];

export default function DeployGithubActionsPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / GITHUB ACTIONS ]</p>
        <h1 className={style.title}>
          THE<br />
          <span className={style.titleMuted}>WORKFLOWS</span>
        </h1>
        <p className={style.sub}>
          Three workflows run on every change: CI/CD to ship it, Gitleaks to
          catch what slipped through, and Discord to make sure the team knows.
          Below is each one, what every block does, and where the secrets live.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// HOW SECRETS WORK</p>
        <h2 className={style.h2}>From GitHub UI to the runner.</h2>
        <p className={style.lede}>
          Secrets are stored encrypted in GitHub, injected at runtime, and
          never written to the workflow file. Here is the full chain.
        </p>

        <div className={style.pipeline}>
          {howSecretsWork.map(v => (
            <div key={v.step} className={style.pipelineStep}>
              <span className={style.stepNum}>{v.step}</span>
              <div>
                <h3 className={style.stepTitle}>{v.title}</h3>
                <p className={style.stepDetail}>{v.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// SECRETS TO ADD</p>
        <h2 className={style.h2}>Three secrets, three places.</h2>
        <p className={style.lede}>
          All three live in the same place — the repo's Actions secrets.
          The difference is what they are for.
        </p>

        <div className={style.manifests}>
          {secretsGuide.map((s, i) => (
            <article key={s.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{s.name}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className={style.manifestWhy}>
                  <strong style={{ color: '#d4663a' }}>Where:</strong> {s.where}
                </p>
                <p className={style.manifestWhy}>
                  <strong style={{ color: '#d4663a' }}>Value:</strong> {s.value}
                </p>
                <p className={style.manifestWhy}>
                  <strong style={{ color: '#d4663a' }}>Why:</strong> {s.why}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className={style.note}>
          <p>
            <strong style={{ color: '#f0f0f0' }}>Where exactly to add them:</strong>{' '}
            GitHub repo → Settings → Secrets and variables → Actions →
            <strong style={{ color: '#f0f0f0' }}> New repository secret</strong>.
            Give it the name from the table above (e.g. <code>DISCORD_WEBHOOK</code>),
            paste the value, click Add secret. That is it.
          </p>
        </div>
      </section>

      {workflows.map(w => (
        <section key={w.name} className={style.section}>
          <p className={style.label}>// {w.name.toUpperCase()}</p>
          <h2 className={style.h2}>{w.purpose}</h2>
          <p className={style.lede}>
            <strong style={{ color: '#f0f0f0' }}>Trigger:</strong> {w.trigger} ·{' '}
            <strong style={{ color: '#f0f0f0' }}>File:</strong>{' '}
            <code>{w.filename}</code>
          </p>

          <div className={style.manifests}>
            <article className={style.manifest}>
              <div className={style.manifestHead}>
                <h3 className={style.manifestName}>{w.name}</h3>
                <span className={style.manifestFile}>{w.filename}</span>
              </div>
              <pre className={style.code}>
                <code>{w.yaml}</code>
              </pre>
            </article>
          </div>

          <h3 className={style.subhead}>What each block does</h3>
          <div className={style.checklist}>
            {w.sections.map(s => (
              <div key={s.title} className={style.checkItem}>
                <span className={style.checkMark}>›</span>
                <span className={style.checkText}>
                  <strong style={{ color: '#f0f0f0' }}>{s.title}</strong>
                  {' — '}
                  {s.detail}
                </span>
              </div>
            ))}
          </div>

          <h3 className={style.subhead}>Secrets used</h3>
          <div className={style.checklist}>
            {w.secrets.map(s => (
              <div key={s.key} className={style.checkItem}>
                <span className={style.checkMark}>✓</span>
                <span className={style.checkText}>
                  <code style={{ color: '#d4663a' }}>{s.key}</code>
                  {' — '}
                  {s.note}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className={style.section}>
        <p className={style.label}>// GOTCHAS</p>
        <h2 className={style.h2}>The six things that will trip you up.</h2>

        <div className={style.gotchas}>
          {gotchas.map(g => (
            <div key={g.title} className={style.gotcha}>
              <span className={style.gotchaIcon}>!</span>
              <div>
                <h3 className={style.gotchaTitle}>{g.title}</h3>
                <p className={style.gotchaDetail}>{g.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DeploymentPrevNext />
    </div>
  );
}