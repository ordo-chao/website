import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const overviewPoints = [
  'Vault is a centralized secrets manager — it stores, encrypts, and audits access to credentials.',
  'It encrypts data at rest before writing to disk. Reading the raw storage is not enough to read the secret.',
  'Clients authenticate (Kubernetes SA, LDAP, AppRole) and receive a scoped token with policies.',
  'In this cluster, Vault is the single source of truth for every application password and API key.',
  'The ClusterSecretStore below is how External Secrets Operator talks to it.',
  'Every other deployment page on this site reads secrets from Vault. None of them ever see a password in Git.',
];

const whyPoints = [
  {
    title: 'Centralized, not scattered',
    detail: 'Without Vault, every app has its own .env file, its own Kubernetes Secret, its own CI variable. Rotating a password means hunting all of them. Vault puts every secret behind one API with one audit log.',
  },
  {
    title: 'Encrypted at rest',
    detail: 'Vault encrypts secrets before writing to the backing store. Even if someone gets the disk, the secrets are unreadable without the Vault unseal keys.',
  },
  {
    title: 'Auditable',
    detail: 'Every read, write, and authentication is logged. When a password leaks, you can answer "who read this secret, and when?" — which is impossible with a plain Kubernetes Secret.',
  },
  {
    title: 'One integration for the whole cluster',
    detail: 'External Secrets Operator authenticates to Vault once, via a Kubernetes ServiceAccount. Every app then reads its own path. Adding a new app does not mean adding a new secret store — it means adding a new ExternalSecret.',
  },
];

const manifestSections = [
  {
    title: 'Raft integrated storage',
    detail: 'ha.raft.enabled: true means Vault stores its data on local disk and replicates via Raft consensus. No external Consul or database is required. With replicas: 1, this is a single-node Raft cluster — fine for a lab, but a single point of failure. Production requires 3 nodes for quorum.',
  },
  {
    title: 'setNodeId: true',
    detail: 'Each Vault node needs a unique Raft node_id. The Helm chart sets it based on the pod name when this is true. Without it, a multi-node cluster cannot form.',
  },
  {
    title: 'tlsDisable: true',
    detail: 'This tells the Helm chart not to terminate TLS inside the pod. Traefik handles TLS at the Ingress. That works, but it means the hop from Traefik to Vault is plain HTTP inside the cluster. Acceptable if the cluster network is trusted; a production posture would enable internal TLS.',
  },
  {
    title: 'Resources',
    detail: '256Mi request / 512Mi limit. Vault is not memory-hungry at rest, but a full Raft log or heavy audit logging can push it. The limit is generous relative to the request, which gives Vault room to breathe during spikes.',
  },
  {
    title: 'Ingress + cert-manager',
    detail: 'The UI and API are exposed at vault.example.com via Traefik. cert-manager issues the certificate. Once the Ingress is Ready, the ClusterSecretStore below can reach the Vault API over HTTPS.',
  },
  {
    title: 'ServerSideApply: true',
    detail: 'Vault ships large CRDs and Helm charts with big manifests. Server-side apply avoids the "metadata.annotations: Too long" error that client-side apply hits on large resources.',
  },
];

const clusterStoreSections = [
  {
    title: 'server: https://vault.example.com',
    detail: 'The external URL of Vault. ESO talks to Vault over the same Ingress that humans use. This is why the Ingress and TLS must be working before any ExternalSecret can sync.',
  },
  {
    title: 'path: secret · version: v2',
    detail: 'Vault\'s KV v2 engine stores secrets at `secret/data/<path>`. The ClusterSecretStore declares the mount path (`secret`) and the engine version (`v2`). ExternalSecrets then reference relative paths like `Services/MyApp/prod`, and ESO constructs the full Vault API path.',
  },
  {
    title: 'auth.kubernetes.mountPath: kubernetes',
    detail: 'This is the Vault auth method that trusts Kubernetes ServiceAccount tokens. ESO presents a SA token, Vault validates it against the cluster, and issues a Vault token. No static Vault token is stored anywhere.',
  },
  {
    title: 'role: external-secrets',
    detail: 'A Vault role that binds the ServiceAccount to a Vault policy. The policy determines which secret paths ESO is allowed to read. If this role does not exist in Vault, every ExternalSecret fails with a permission error.',
  },
  {
    title: 'serviceAccountRef: external-secrets / external-secrets',
    detail: 'The ServiceAccount that ESO runs as. Vault validates this SA\'s token. If the namespace or name is wrong, authentication fails silently — ExternalSecrets show SecretSyncedError with no obvious cause.',
  },
];

const gotchas = [
  {
    title: 'Vault starts sealed — you must initialize and unseal it',
    detail: 'After Argo deploys Vault, the pod runs but the API returns 503. You must run `vault operator init` to generate unseal keys and the root token, then `vault operator unseal` with the keys. Without this, nothing can read or write secrets.',
  },
  {
    title: 'The Kubernetes auth role must exist in Vault',
    detail: 'The ClusterSecretStore references role: external-secrets. If that role is not created in Vault (with a policy granting read on secret/data/*), every ExternalSecret fails. The role is not created by the Helm chart — it is a manual Vault configuration step.',
  },
  {
    title: 'replicas: 1 is not high availability',
    detail: 'The manifest says ha.enabled: true and raft.enabled: true, but replicas: 1 means there is one node. Raft with one node has no fault tolerance. If the pod dies, Vault is down until it restarts. Production needs 3 replicas.',
  },
  {
    title: 'tlsDisable: true means Traefik-to-Vault is HTTP',
    detail: 'The Ingress terminates TLS from the client, but the connection from Traefik to the Vault pod is plain HTTP on port 8200. On a trusted cluster network this is acceptable. If the cluster spans untrusted networks, enable internal TLS.',
  },
  {
    title: 'The root token is a master key — handle it like one',
    detail: 'vault operator init prints a root token. That token can do anything. Do not store it in Git, do not paste it in Slack. Use it once to create the external-secrets role and policy, then revoke it and use scoped tokens for everything else.',
  },
  {
    title: 'ClusterSecretStore is cluster-wide by design',
    detail: 'Every namespace can read from this store unless you add conditions. That is intentional here — every app should read its own path. But it also means a compromised pod in any namespace can attempt to read other apps\' paths if the Vault policy is too broad. Scope the policy to specific paths per app.',
  },
];

export default function DeployVaultPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ SECRETS / HASHICORP VAULT ]</p>
        <h1 className={style.title}>
          WHAT IS<br />
          <span className={style.titleMuted}>VAULT?</span>
        </h1>
        <p className={style.sub}>
          Vault is the single place where every password, API key, and token
          in this cluster is stored. It encrypts them at rest, audits every
          read, and lets External Secrets Operator materialize them into
          Kubernetes Secrets — so nothing sensitive ever touches Git. Here is
          what it does, why it is here, and the two manifests that wire it up.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT VAULT IS</p>
        <h2 className={style.h2}>A secrets manager, not a config store.</h2>
        <p className={style.lede}>
          Vault centralizes privileged access and secret management. It stores
          secrets encrypted, gates access with authentication and policies,
          and logs every interaction.
        </p>

        <div className={style.checklist}>
          {overviewPoints.map(p => (
            <div key={p} className={style.checkItem}>
              <span className={style.checkMark}>✓</span>
              <span className={style.checkText}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHY THIS CLUSTER USES IT</p>
        <h2 className={style.h2}>Every app reads from one source.</h2>

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
        <p className={style.label}>// ARGOCD APPLICATION</p>
        <h2 className={style.h2}>Deploying Vault itself.</h2>
        <p className={style.lede}>
          This manifest deploys the Vault Helm chart. Argo reconciles the
          cluster toward it — Raft storage, Ingress, TLS, and the UI.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Vault Application</h3>
              <span className={style.manifestFile}>argocd/vault.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://helm.releases.hashicorp.com
    chart: vault
    targetRevision: "0.30.0"
    helm:
      values: |
        global:
          tlsDisable: true

        server:
          ha:
            enabled: true
            replicas: 1
            raft:
              enabled: true
              setNodeId: true

          ingress:
            enabled: true
            ingressClassName: traefik
            annotations:
              cert-manager.io/cluster-issuer: letsencrypt-prod
            hosts:
              - host: vault.example.com
                paths:
                  - /
            pathType: Prefix
            tls:
              - secretName: vault-tls
                hosts:
                  - vault.example.com

          resources:
            requests:
              memory: 256Mi
              cpu: 250m
            limits:
              memory: 512Mi
              cpu: 500m

        ui:
          enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {manifestSections.map(s => (
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
      </section>

      <section className={style.section}>
        <p className={style.label}>// CLUSTERSECRETSTORE</p>
        <h2 className={style.h2}>How every app reads from Vault.</h2>
        <p className={style.lede}>
          This is the bridge. External Secrets Operator uses this
          ClusterSecretStore to authenticate to Vault and pull secrets into
          Kubernetes Secrets — the same pattern every deployment page on this
          site relies on.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Vault ClusterSecretStore</h3>
              <span className={style.manifestFile}>external-secrets/vault-store.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: "external-secrets"
            namespace: "external-secrets"`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {clusterStoreSections.map(s => (
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