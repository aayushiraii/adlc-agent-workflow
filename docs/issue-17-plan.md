# Implementation Plan — Issue #17: Set Up CI/CD Pipeline and Deploy Application to Production

---

## Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #17 |
| **Title** | Set Up CI/CD Pipeline and Deploy Application to Production |
| **Priority** | 🔴 High |
| **ADLC Phase** | Deployment |
| **Labels** | `deployment`, `high-priority`, `devops` |
| **Assigned Agent** | DevOps Agent |
| **Dependencies** | #16 – Conduct Code and Security Review Across All Services |

---

## Objective

Establish a fully automated CI/CD pipeline using GitHub Actions, provision production-grade cloud infrastructure (compute, database, cache, CDN), configure secrets management, deploy all services of the food delivery application to production, and set up comprehensive monitoring, alerting, and a tested rollback procedure — ensuring the platform is live, observable, and resilient.

---

## Phase 1 — Requirement Analysis

### Functional Requirements
- A **CI pipeline** must automatically run tests and lint checks on every pull request, preventing merges of failing code.
- A **CD pipeline** must automatically deploy to the **staging environment** on every merge to the `develop` branch.
- A **CD pipeline** must automatically deploy to the **production environment** on every merge to the `main` branch.
- All **environment variables and secrets** must be managed through a secrets manager (e.g., AWS Secrets Manager) — no plaintext secrets in source code or pipeline configuration files.
- The **production database** must be provisioned with automated backups enabled.
- **Health check endpoints** must be live for all services and actively monitored.
- **Alerts** must be configured for key signals: error rate, latency thresholds, and downtime/service unavailability.
- A **rollback procedure** must be documented and validated through a tested rollback execution.

### Business Rules
- No code may reach production without passing CI checks (tests + lint).
- Production deployments must only be triggered from the `main` branch — no direct, manual deployments bypass the pipeline.
- Secrets must never be stored in environment files, Docker images, or GitHub repository configuration.
- Rollback must be executable without requiring a full re-deployment from source — it must restore the previous known-good state rapidly.

### Constraints
- Cloud provider: **AWS** (or equivalent — to be confirmed).
- CI/CD tool: **GitHub Actions**.
- Monitoring: **Datadog** or **CloudWatch** (to be confirmed).
- Container orchestration: **Docker + Kubernetes (EKS)** or **AWS ECS** (to be confirmed).
- All services must be containerized using Docker before pipeline setup begins.
- Infrastructure must be provisioned using Infrastructure-as-Code (IaC) — no manual console provisioning.
- Dependency #16 (Code and Security Review) must be fully completed and signed off before production deployment.

---

## Phase 2 — Design

### Branch & Pipeline Strategy

| Branch | Pipeline Trigger | Target Environment |
|---|---|---|
| Any PR branch | Push / PR open | CI only (tests + lint) |
| `develop` | Merge | Staging deployment |
| `main` | Merge | Production deployment |

### Infrastructure Architecture

| Component | Technology |
|---|---|
| Cloud Provider | AWS (or equivalent) |
| Compute | EKS (Kubernetes) or ECS (Fargate) |
| Container Registry | Amazon ECR |
| Database | Amazon RDS (PostgreSQL/MySQL) with Multi-AZ and automated backups |
| Cache | Amazon ElastiCache (Redis) |
| CDN | Amazon CloudFront |
| Secrets Management | AWS Secrets Manager |
| DNS & Load Balancing | Route 53 + Application Load Balancer (ALB) |
| Object Storage | Amazon S3 (static assets, media uploads) |
| IaC | Terraform or AWS CDK |

### CI Pipeline Design (GitHub Actions)
- Trigger: every PR and push to any branch.
- Steps:
  1. Checkout code
  2. Install dependencies
  3. Run lint checks (ESLint, Prettier, or equivalent per service)
  4. Run unit tests
  5. Run integration tests
  6. Build Docker image (validate build succeeds)
  7. Run SAST / dependency audit (Snyk, Semgrep, or equivalent)
  8. Report results — block merge on failure

### CD Pipeline Design — Staging (GitHub Actions)
- Trigger: merge to `develop`.
- Steps:
  1. Build Docker images for all services
  2. Tag images with commit SHA
  3. Push images to Amazon ECR
  4. Pull secrets from AWS Secrets Manager
  5. Apply Kubernetes/ECS deployment manifests to staging cluster
  6. Run smoke tests against staging
  7. Notify team of deployment status (Slack/email)

### CD Pipeline Design — Production (GitHub Actions)
- Trigger: merge to `main`.
- Steps:
  1. Build Docker images for all services
  2. Tag images with release version tag
  3. Push images to Amazon ECR
  4. Pull secrets from AWS Secrets Manager
  5. Apply Kubernetes/ECS deployment manifests to production cluster (rolling update strategy)
  6. Run health check validation post-deployment
  7. Notify team of deployment status
  8. Tag the release in GitHub

### Rollback Design
- Kubernetes: `kubectl rollout undo deployment/<service>` restores the previous ReplicaSet.
- ECS: Redeploy the previous task definition revision.
- Database: No destructive schema changes are applied without a tested migration rollback script.
- Rollback procedure documented in `docs/runbooks/rollback.md`.
- Rollback must be tested in staging before production go-live.

### Monitoring & Alerting Design

| Signal | Threshold | Alert Channel |
|---|---|---|
| Error rate (5xx) | > 1% over 5 min | PagerDuty / Slack |
| API latency (p95) | > 2000ms | PagerDuty / Slack |
| Service downtime | Health check failure > 1 min | PagerDuty / Slack |
| Database CPU | > 80% sustained | CloudWatch / Datadog alert |
| Memory utilization | > 85% | CloudWatch / Datadog alert |
| Disk usage | > 75% | CloudWatch / Datadog alert |

---

## Phase 3 — Implementation

### Infrastructure Provisioning (IaC)
- [ ] Write Terraform/CDK modules for: VPC, subnets, security groups, IAM roles, and networking.
- [ ] Provision **Amazon EKS cluster** (or ECS cluster) for staging and production environments.
- [ ] Provision **Amazon RDS** instance (Multi-AZ, automated backups, encryption at rest enabled).
- [ ] Provision **Amazon ElastiCache** (Redis) cluster for session and caching.
- [ ] Provision **Amazon ECR** repositories for each service's Docker image.
- [ ] Provision **Amazon CloudFront** distribution with S3 origin for static assets.
- [ ] Configure **Application Load Balancer (ALB)** with HTTPS listeners and ACM SSL certificates.
- [ ] Configure **Route 53** DNS records pointing to ALB.
- [ ] Configure **AWS Secrets Manager** with all required secrets per environment (staging, production).

### Containerization
- [ ] Validate and finalize `Dockerfile` for each service (auth, restaurant, cart, checkout, payment, order, frontend).
- [ ] Implement multi-stage Docker builds to minimize image size.
- [ ] Verify all service images build cleanly and run in a local Docker Compose environment before pipeline integration.

### CI Pipeline Setup (GitHub Actions)
- [ ] Create `.github/workflows/ci.yml` — lint, test, Docker build, SAST scan on every PR.
- [ ] Configure branch protection rules on `develop` and `main` to require CI pass before merge.
- [ ] Configure secrets in GitHub Actions (AWS credentials via OIDC — no long-lived keys).
- [ ] Set up test result and coverage reporting (e.g., Codecov or GitHub Actions summary).

### CD Pipeline Setup — Staging
- [ ] Create `.github/workflows/deploy-staging.yml` — triggered on merge to `develop`.
- [ ] Implement image build, ECR push, and Kubernetes/ECS deployment steps.
- [ ] Configure post-deployment smoke test step.
- [ ] Configure Slack/email deployment notification.

### CD Pipeline Setup — Production
- [ ] Create `.github/workflows/deploy-production.yml` — triggered on merge to `main`.
- [ ] Implement image build with release version tag, ECR push, and rolling deployment to production.
- [ ] Configure post-deployment health check validation step.
- [ ] Configure GitHub release tagging step on successful deployment.
- [ ] Configure Slack/email deployment notification.

### Secrets Management
- [ ] Populate AWS Secrets Manager with all service secrets (DB credentials, API keys, payment gateway keys, JWT secret, etc.) per environment.
- [ ] Update all services to read secrets from AWS Secrets Manager at runtime (not from environment files or image layers).
- [ ] Validate no secrets are present in any Docker image layer or pipeline logs.

### Health Checks
- [ ] Implement `/health` endpoint on each backend service (returns 200 OK with basic service status).
- [ ] Configure ALB health checks for each service target group.
- [ ] Configure Kubernetes liveness and readiness probes (or ECS health check definitions).

### Monitoring & Alerting Setup
- [ ] Install and configure Datadog agent (or CloudWatch agent) on all cluster nodes.
- [ ] Create Datadog/CloudWatch dashboards for: request rate, error rate, latency (p50/p95/p99), pod/container health.
- [ ] Configure alerts for all thresholds defined in the monitoring design.
- [ ] Integrate alerting with PagerDuty and/or Slack.

### Rollback Procedure
- [ ] Document rollback steps for Kubernetes (`kubectl rollout undo`) and ECS (redeploy previous task definition) in `docs/runbooks/rollback.md`.
- [ ] Document database migration rollback procedure.
- [ ] Execute and validate the rollback procedure in the staging environment before production go-live.

---

## Phase 4 — Testing

### CI Pipeline Validation
- Confirm CI pipeline triggers correctly on PR creation and push.
- Confirm lint failures block PR merge.
- Confirm test failures block PR merge.
- Confirm SAST findings are surfaced in PR checks.

### CD Pipeline Validation — Staging
- Confirm merge to `develop` triggers staging deployment automatically.
- Confirm Docker images are built, tagged, and pushed to ECR correctly.
- Confirm secrets are injected at runtime from AWS Secrets Manager (not hardcoded).
- Confirm smoke tests pass post-deployment to staging.

### CD Pipeline Validation — Production
- Confirm merge to `main` triggers production deployment automatically.
- Confirm rolling deployment completes with zero downtime.
- Confirm health check endpoints return 200 OK for all services post-deployment.
- Confirm deployment notification is sent to the team.
- Confirm GitHub release tag is created on successful deployment.

### Infrastructure Validation Scenarios

| # | Scenario | Expected Result |
|---|---|---|
| 1 | PR with failing tests | CI blocks merge; PR cannot be merged |
| 2 | PR with passing tests | CI passes; merge is permitted |
| 3 | Merge to `develop` | Staging deployment triggered and completed successfully |
| 4 | Merge to `main` | Production deployment triggered with rolling update; zero downtime |
| 5 | Secrets injection validation | No secrets present in image layers or pipeline logs |
| 6 | Database backup validation | Automated backup runs on schedule; restore tested successfully |
| 7 | Health check validation | All `/health` endpoints return 200 OK and are monitored |
| 8 | Alert trigger test | Simulated error spike triggers alert within defined threshold window |
| 9 | Rollback execution (staging) | Previous version restored successfully via documented rollback procedure |
| 10 | CDN & static asset delivery | Frontend assets served via CloudFront with correct caching headers |

### Post-Deployment Validation
- All services healthy and returning expected responses in production.
- Monitoring dashboards are populated with live data.
- No critical alerts firing post go-live.
- Rollback procedure documented, tested, and accessible to the team.

---

## Risks

### Technical Risks
- **Zero-Downtime Deployment Failures** — Improper rolling update configuration (missing readiness probes, aggressive termination grace periods) can cause brief service unavailability during deployments. Mitigation: validate rolling update strategy in staging with traffic simulation before production go-live.
- **Secrets Leakage in Pipeline Logs** — If secrets are accidentally echoed in GitHub Actions steps, they may appear in build logs. Mitigation: use GitHub Actions secret masking, never echo secret values, and audit all pipeline steps before enabling.
- **Database Migration Risk** — Production database schema migrations applied during deployment can cause irreversible data loss if not tested with a rollback script. Mitigation: test all migrations in staging with a production-equivalent dataset; require a rollback script for every migration.
- **IaC Drift** — If any infrastructure is manually modified in the AWS console outside of Terraform/CDK, state drift will cause future IaC applies to fail or produce unexpected changes. Mitigation: enforce IaC-only infrastructure changes via policy; enable AWS Config for drift detection.
- **Container Image Vulnerabilities** — Base Docker images may contain known CVEs. Mitigation: run container image vulnerability scanning (e.g., Amazon ECR native scanning or Trivy) as a CI step before deployment.

### Dependency Risks
- **Issue #16 (Code and Security Review) must be fully completed and signed off** before any production deployment is initiated. Deploying without security review approval exposes the platform to unmitigated vulnerabilities.
- **All services must be containerized** with finalized, validated Dockerfiles before pipeline setup can proceed.
- **AWS account and IAM permissions** must be provisioned and accessible to the DevOps team before infrastructure work begins.

### Requirement Gaps
- The **cloud provider** is listed as "AWS or equivalent" — the specific provider must be confirmed before IaC modules are written.
- The **container orchestration platform** (Kubernetes/EKS vs. ECS/Fargate) is not finalized — this is a significant architectural decision.
- The **monitoring platform** (Datadog vs. CloudWatch) is not confirmed.
- The **database engine** (PostgreSQL vs. MySQL vs. other) is not specified.
- **Multi-region or single-region** deployment strategy is not defined.
- **Auto-scaling policies** for compute are not defined.
- The **notification channel** for deployment and alert events is not specified.

---

## Approval Questions

1. **Cloud Provider** — Is AWS confirmed as the production cloud provider, or is an alternative (GCP, Azure) being considered?
2. **Container Orchestration** — Should the platform use **Kubernetes (EKS)** or **AWS ECS (Fargate)**?
3. **Monitoring Platform** — Is **Datadog** or **AWS CloudWatch** (or both) the agreed monitoring solution?
4. **Database Engine** — Which database engine should RDS be provisioned with — **PostgreSQL**, **MySQL**, or another?
5. **Multi-Region Strategy** — Is the production deployment **single-region** at launch, or is **multi-region** required?
6. **Auto-Scaling** — What are the agreed thresholds for compute auto-scaling (e.g., scale out at 70% CPU, scale in at 30% CPU)?
7. **Notification Channels** — Which channels should deployment and alert notifications be sent to (Slack channel, PagerDuty, email)?
8. **IaC Tool** — Should infrastructure be provisioned using **Terraform** or **AWS CDK**?
9. **GitHub Actions Authentication to AWS** — Should the pipeline authenticate to AWS using **OIDC (recommended)** or **IAM access keys stored as GitHub secrets**?
10. **Staging Environment Parity** — Should staging mirror production infrastructure exactly, or is a reduced-cost configuration acceptable?

---

## Final Recommendation

> **⛔ Blocked by Dependency + Requires Clarification**

This issue is currently **blocked** by the completion of Issue **#16** (Code and Security Review). Production deployment must not proceed until all services have passed the security review and received formal sign-off.

Additionally, several critical architectural decisions — **cloud provider confirmation**, **container orchestration choice (EKS vs. ECS)**, **monitoring platform**, and **database engine** — must be resolved before IaC modules and pipeline workflows can be written.

**Recommended next steps:**
1. Confirm closure and sign-off of Issue #16.
2. Answer the approval questions above, especially items 1 (cloud provider), 2 (orchestration), 3 (monitoring), and 4 (database engine).
3. Confirm AWS account access and IAM permissions are available to the DevOps team.
4. Finalize and validate all service Dockerfiles before pipeline setup begins.
5. Once unblocked and clarifications are addressed, this issue is fully ready to move into the **Deployment** phase.

---

*Plan generated on 2026-06-26 | Approved by Raj Sanghvi*
