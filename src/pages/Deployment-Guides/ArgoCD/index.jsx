import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'ArgoCD is the GitOps controller — it watches Git and reconciles the cluster toward it',
  'Every deploy is a commit, every rollback is a revert, drift is reverted automatically',
  'ArgoCD supports two sources: raw manifests in Git, or Helm charts from a chart repository',
  'In this cluster, ArgoCD is the only writer to the cluster — kubectl apply is never used in production',
  'Every Application in this series is an ArgoCD resource, not a raw manifest',
];

const whyPoints = [
  {
    title: 'Git is the only source of truth',
    detail: 'ArgoCD continuously compares the desired state (Git) with the actual state (Kubernetes). If someone edits a Deployment manually, ArgoCD detects the drift and reverts it [citation:6]. There is no "I fixed it in the cluster" — the fix must be a commit.',
  },
  {
    title: 'Helm charts without helm install',
    detail: 'ArgoCD treats Helm as a manifest generator. It runs helm template internally, applies the result, and manages the lifecycle. This means you get Helm packaging without Helm release records — helm ls will not show the app [citation:1][citation:7]. That is expected.',
  },
  {
    title: 'Rollback is a Git revert',
    detail: 'If a deploy breaks, revert the commit. ArgoCD syncs the previous state. No special rollback command, no Helm revision to track — the history that shipped the change can un-ship it.',
  },
  {
    title: 'Self-heal prevents cluster drift',
    detail: 'With selfHeal: true, manual cluster changes are reverted to match Git. This is why every guide in this series says "never edit the deployment manually" — ArgoCD will undo it on the next reconciliation loop.',
  },
];

const applicationStructure = [
  {
    title: 'source (or sources)',
    detail: 'Where the manifests come from. A single source points at a Git path or a Helm chart. Multi-source (used by Mailu) points at a chart plus a values file in a separate repository [citation:7].',
  },
  {
    title: 'destination',
    detail: 'The target cluster and namespace. server: https://kubernetes.default.svc means "the cluster ArgoCD runs in". namespace is where the resources land.',
  },
  {
    title: 'syncPolicy',
    detail: 'automated: true enables auto-sync. prune: true deletes resources removed from Git (dangerous for stateful apps). selfHeal: true reverts manual edits. Mailu uses prune: false for exactly this reason.',
  },
  {
    title: 'syncOptions',
    detail: 'CreateNamespace: true creates the target namespace if missing. ServerSideApply: true avoids annotation size limits on large charts. ApplyOutOfSyncOnly: true makes syncs target only drifted resources [citation:7].',
  },
];

const commands = [
  {
    name: 'argocd app list',
    detail: 'Lists every Application and its sync/health status. The first command to run when something is wrong.',
    code: `argocd app list`,
  },
  {
    name: 'argocd app get',
    detail: 'Detailed status for one Application: sync status, health, resource tree, and the rendered manifests [citation:7].',
    code: `argocd app get myapp`,
  },
  {
    name: 'argocd app sync',
    detail: 'Triggers a sync manually. Use --prune to delete resources removed from Git (only when prune is not already enabled in syncPolicy).',
    code: `argocd app sync myapp`,
  },
  {
    name: 'argocd app history',
    detail: 'Shows the deployment history for an Application — every sync, with the Git commit that triggered it.',
    code: `argocd app history myapp`,
  },
  {
    name: 'argocd app rollback',
    detail: 'Rolls back to a previous sync revision. Equivalent to reverting the Git commit, but faster for emergencies.',
    code: `argocd app rollback myapp 3`,
  },
  {
    name: 'argocd app diff',
    detail: 'Shows what would change if the app were synced right now. Useful before a manual sync to see what ArgoCD is about to do.',
    code: `argocd app diff myapp`,
  },
];

const gotchas = [
  {
    title: 'helm ls does not show ArgoCD apps',
    detail: 'ArgoCD renders Helm charts but does not create Helm release records. This is by design. Use argocd app get <name> to inspect the app, not helm ls [citation:1][citation:7].',
  },
  {
    title: 'prune: true can delete data',
    detail: 'If a PVC is removed from Git, prune: true deletes it. For stateful apps (Postgres, Redis, MinIO), this is catastrophic. The Mailu guide sets prune: false for this reason. Be deliberate about prune.',
  },
  {
    title: 'selfHeal reverts manual fixes',
    detail: 'If you kubectl edit a Deployment to fix an emergency, ArgoCD will revert it on the next sync. The fix must be committed to Git. This is the GitOps model — it is not a bug.',
  },
  {
    title: 'CreateNamespace: true is not always safe',
    detail: 'Grafana, Vault, and Longhorn use CreateNamespace: true. Mailu does not. The difference is deliberate: a mail server should not appear because a namespace was auto-created. Match the policy to the risk.',
  },
  {
    title: 'targetRevision: "*" breaks the audit trail',
    detail: 'A wildcard chart version means ArgoCD can deploy a new chart release without a commit. You cannot point at a Git commit and say "this is what deployed." Pin the version [citation:7].',
  },
  {
    title: 'Application CRD vs raw manifests',
    detail: 'Every guide in this series deploys an ArgoCD Application, not raw Kubernetes manifests. The Application is a resource that tells ArgoCD what to sync. You apply the Application once — ArgoCD handles everything after that.',
  },
];

export default function DeployArgoCDPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / ARGO CD ]</p>
        <h1 className={style.title}>
          SYNC WITH<br />
          <span className={style.titleMuted}>ARGO CD</span>
        </h1>
        <p className={style.sub}>
          ArgoCD is the GitOps controller. It watches Git and reconciles the
          cluster toward it — every deploy is a commit, every rollback is a
          revert, and drift is reverted automatically. Here is the Application
          structure, the CLI commands, and the sync policies that make this
          cluster safe to operate.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>The GitOps controller.</h2>

        <div className={style.checklist}>
          {stackPoints.map(p => (
            <div key={p} className={style.checkItem}>
              <span className={style.checkMark}>✓</span>
              <span className={style.checkText}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHY THIS CLUSTER USES IT</p>
        <h2 className={style.h2}>Git is the only writer.</h2>

        <div className={style.checklist}>
          {whyPoints.map(p => (
            <div key={p.title} className={style.checkItem}>
              <span className={style.checkMark}>›</span>
              <span className={style.checkText}>
                <strong style={{ color: '#f0f0f0' }}>{p.title}</strong>
                {' — '}
                {p.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// APPLICATION STRUCTURE</p>
        <h2 className={style.h2}>Four blocks that define a deploy.</h2>

        <div className={style.manifests}>
          {applicationStructure.map((a, i) => (
            <article key={a.title} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{a.title}</h3>
              </div>
              <p className={style.manifestWhy}>{a.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// CLI COMMANDS</p>
        <h2 className={style.h2}>What you run against the cluster.</h2>
        <p className={style.lede}>
          Unlike Helm commands, these are the commands you actually run. ArgoCD
          is the interface to the cluster — not kubectl.
        </p>

        <div className={style.manifests}>
          {commands.map((c, i) => (
            <article key={c.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{c.name}</h3>
              </div>
              <p className={style.manifestWhy}>{c.detail}</p>
              <pre className={style.code}>
                <code>{c.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

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