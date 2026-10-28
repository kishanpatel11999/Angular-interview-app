# AI Security, Data Privacy, and Enterprise Confidentiality

> **Phase:** 6 — Safe AI-Assisted Development  
> **Related:** [ai-coding-workflow.md](./ai-coding-workflow.md) | [agentic-coding-and-tool-safety.md](./agentic-coding-and-tool-safety.md) | [secure-coding-checklist.md](../04-security/secure-coding-checklist.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Enterprise Risk Landscape of AI Tools](#the-enterprise-risk-landscape-of-ai-tools)
4. [Protecting Intellectual Property & Proprietary Algorithms](#protecting-intellectual-property--proprietary-algorithms)
5. [The Danger of Leaking Credentials, Secrets, and API Keys](#the-danger-of-leaking-credentials-secrets-and-api-keys)
6. [Data Privacy: Handling Customer PII, Production Logs, and DB Dumps](#data-privacy-handling-customer-pii-production-logs-and-db-dumps)
7. [Enterprise Data Retention Policies vs Consumer AI Models](#enterprise-data-retention-policies-vs-consumer-ai-models)
8. [Supply Chain Attacks via AI-Hallucinated Dependencies ("Slopsquatting")](#supply-chain-attacks-via-ai-hallucinated-dependencies-slopsquatting)
9. [Safe vs Hazardous Data Classification Matrix](#safe-vs-hazardous-data-classification-matrix)
10. [Anonymization & Sanitization Techniques Before Prompting](#anonymization--sanitization-techniques-before-prompting)
11. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
12. [Hands-On Scenario: Cleaning a Bug Report Before Submitting to an LLM](#hands-on-scenario-cleaning-a-bug-report-before-submitting-to-an-llm)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master enterprise data protection policies when utilizing Large Language Models (LLMs) and AI coding agents.
- Identify and prevent accidental leaks of trade secrets, proprietary algorithms, and sensitive intellectual property.
- Prevent credential and API key exposure in AI prompts and model context windows.
- Understand GDPR, HIPAA, and SOC 2 implications of pasting production telemetry, database dumps, or customer Personally Identifiable Information (PII) into AI tools.
- Defend against AI-induced supply chain attacks involving fabricated or typosquatted npm packages.
- Sanitize and tokenize production logs and code snippets safely prior to model submission.

---

## The Enterprise Risk Landscape of AI Tools

When a developer inputs source code or debug logs into a web-based AI assistant or IDE agent, that data traverses the boundary of the enterprise network:
1. **Model Training Risks (Consumer Tiers):** Free or consumer AI accounts often retain prompt data to train future foundational models. Sensitive trade secrets may later be reproduced in answers to external users.
2. **Third-Party Data Breaches:** Prompts stored in cloud provider conversation histories can be exposed via account takeovers, unauthorized browser extensions, or vendor vulnerabilities.
3. **Regulatory Non-Compliance:** Transmitting unmasked user health data (HIPAA) or European personal data (GDPR) to external AI inference endpoints violates international privacy regulations, triggering substantial organizational fines.

---

## Protecting Intellectual Property & Proprietary Algorithms

### What Constitutes High-Risk Intellectual Property?
- Proprietary high-frequency trading algorithms, specialized risk models, or internal pricing logic.
- Unpublished patent applications and novel architectural blueprints.
- Internal domain models and unpublished API schema definitions.

### Safe Practice: Structural Abstraction
Instead of pasting full proprietary business logic, extract the abstract mathematical or programming pattern:
```typescript
// ❌ HAZARDOUS: Pasting proprietary trading algorithm with internal domain entities
// "Here is our GoldmanSachsCreditRiskEngine.ts that computes the default spread for corporate client AcmeCorp..."

// ✅ SAFE: Abstracting to standard computer science problem
// "I have an array of weighted numeric risk nodes and need a memoized topological sort algorithm in TypeScript."
```

---

## The Danger of Leaking Credentials, Secrets, and API Keys

### Threat Scenario
A developer troubleshooting an HTTP 403 error in their Angular interceptor copies the raw network curl command and pastes it into an AI chat:
```bash
# ⚠️ CATASTROPHIC LEAK:
curl -H "Authorization: Bearer eyJhbGciOi..." -H "X-AWS-Secret-Key: AKIAIOSFODNN7EXAMPLE" https://api.enterprise.com/internal/payments
```
The bearer token and AWS access key are now recorded in the AI vendor's cloud logs. If the token possesses admin privileges, the entire corporate infrastructure is compromised.

### Prevention: Automated Secret Scanning
- Configure pre-commit hooks (`git-secrets`, `trufflehog`) that block commits or clipboard copies containing detected API keys.
- Never paste raw environment files (`environment.prod.ts`) into AI tools.

---

## Data Privacy: Handling Customer PII, Production Logs, and DB Dumps

### The Production Log Trap
Developers often paste multi-megabyte production stack traces into AI assistants:
```json
// ⚠️ CONTAINS UNMASKED PII:
{
  "timestamp": "2026-10-28T14:32:00Z",
  "error": "PaymentFailedException",
  "customer": {
    "name": "Jane Smith",
    "email": "jane.smith@gmail.com",
    "creditCard": "4111-XXXX-XXXX-1111",
    "ssn": "000-12-3456"
  }
}
```
Pasting this into an unauthorized AI tool constitutes an immediate data breach under GDPR Article 33 and HIPAA compliance rules.

---

## Enterprise Data Retention Policies vs Consumer AI Models

| Dimension | Consumer / Free AI Models | Enterprise AI Agreements (Zero Data Retention) |
|---|---|---|
| **Data Used for Training?** | **YES** (Default opt-in) | **NO** (Contractually prohibited) |
| **Prompt Logging on Cloud** | Retained indefinitely or 30 days | Zero retention or encrypted customer-controlled key |
| **SOC 2 Type II / ISO 27001** | Not guaranteed | Verified compliance |
| **Private VPC Deployment** | Unavailable | Available (Azure OpenAI, AWS Bedrock, Google Cloud Vertex) |

> ⚠️ **Organizational Rule:** Only utilize AI coding tools that have been explicitly vetted by your organization's Information Security (InfoSec) and Legal compliance teams under an Enterprise Zero-Retention agreement.

---

## Supply Chain Attacks via AI-Hallucinated Dependencies ("Slopsquatting")

### How Attackers Exploit AI Code Generation
1. Large Language Models occasionally **hallucinate** package names that do not exist (e.g., recommending `npm install angular-signal-virtual-table`).
2. Threat actors monitor common AI hallucinations or scan public prompt repositories.
3. The attacker registers the non-existent package name on npm containing malicious code (a reverse shell or crypto-miner).
4. Unsuspecting developers copy the AI's terminal command and run `npm install angular-signal-virtual-table`, infecting their development machine or CI/CD runner!

### Defenses:
- **Never blindly install hallucinated packages:** Always verify the package exists, check its GitHub repository, star count, download metrics, and maintenance history.
- **Enforce package lockfile integrity:** Never approve PRs with unexpected new dependencies without architectural review.

---

## Safe vs Hazardous Data Classification Matrix

| Data Type | AI Sharing Status | Handling Instructions |
|---|---|---|
| **Public Framework Documentation** (Angular, RxJS, TypeScript) | 🟢 **Safe** | Can be shared freely |
| **Generic UI Code** (CSS flexbox, HTML buttons, generic table layout) | 🟢 **Safe** | Can be shared freely |
| **Database Connection Strings & Passwords** | 🔴 **CRITICAL HAZARD** | **NEVER SHARE** under any circumstances |
| **OAuth Client Secrets / Private JWT Keys** | 🔴 **CRITICAL HAZARD** | **NEVER SHARE** under any circumstances |
| **Customer Personally Identifiable Information (PII)** | 🔴 **CRITICAL HAZARD** | Must be 100% scrubbed/anonymized |
| **Proprietary Business Logic / Novel Algorithms** | 🟡 **Restricted** | Abstract into generic algorithms first |
| **Internal Domain Models & Microservice URLs** | 🟡 **Restricted** | Replace with `example.com` and generic names |

---

## Anonymization & Sanitization Techniques Before Prompting

When sharing code snippets with an approved enterprise AI tool:
1. **Tokenize Domains:** Replace `internal-service.corp.company.com` with `api.example.com`.
2. **Anonymize Names:** Replace real company names, employee names, or client names with generic placeholders (`AcmeCorp`, `UserA`).
3. **Scrub Identifiers:** Replace real GUIDs, account numbers, or IP addresses with dummy values (`192.0.2.1`, `user-uuid-001`).

---

## Senior Interview Questions with Detailed Answers

### Q1: What are the security and legal risks of an engineer using free consumer AI tools (e.g., ChatGPT Free) to debug proprietary Angular enterprise code?
**Answer:**
1. **Intellectual Property Contamination & Leakage:** Consumer tier models frequently use user prompts for model training. Proprietary algorithms, unreleased features, or patentable logic can be absorbed into model weights and regurgitated to external parties.
2. **Regulatory Non-Compliance:** If the developer pastes production logs, user identifiers, or telemetry containing PII, it constitutes a reportable regulatory breach under GDPR (fines up to 4% of global turnover) and HIPAA.
3. **Confidentiality Breach:** Violates standard employment non-disclosure agreements (NDAs) and SOC 2 compliance certifications, which mandate that source code reside only within authorized, audited infrastructure.
4. **Remedy:** Mandate the use of enterprise-licensed AI tools operating under explicit **Zero Data Retention** agreements where model training is legally disabled.

---

### Q2: Explain the concept of AI package hallucination ("slopsquatting") and how an engineering team protects their codebase against it.
**Answer:**
LLMs predict the most statistically probable next token, not factual database queries. When asked for an Angular library to solve a specific problem, an LLM might generate a plausible-sounding package name that does not actually exist.
Attackers analyze LLM outputs or common hallucinations, register those fictitious package names on the public npm registry, and embed malicious install scripts (`preinstall` hooks) that execute arbitrary commands or steal environment variables.
**Protective measures:**
1. Maintain an internal curated npm registry or private proxy (Verdaccio, Artifactory) with package whitelisting.
2. Mandate developer verification: verify download metrics, GitHub repo activity, author reputation, and license before installing any new package.
3. Integrate automated dependency scanning in CI (Socket.dev, Snyk) that flags newly published or zero-reputation packages.

---

## Hands-On Scenario: Cleaning a Bug Report Before Submitting to an LLM

### Raw Incident Log (UNSAFE TO SUBMIT)
```
[2026-10-28 10:14:02] ERROR OrderProcessor - Failed to charge card for user john.doe@bankofamerica.com
Account: BOA-CHECKING-99482103
Endpoint: https://core-payment.internal.ny.prod.bankofamerica.corp/v2/transactions
Bearer Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJqb2huXzEyMyJ9...
Error: Timeout after 5000ms while processing payload: {"amount": 4500.00, "currency": "USD"}
```

### Sanitized Prompt for AI (SAFE TO SUBMIT)
```
"I am debugging an Angular HttpClient timeout issue when sending a POST request to an external payment endpoint.
The request times out after 5000ms. Here is the sanitized error payload:

Endpoint: https://api.example.com/v2/transactions
Payload: { "amount": 100.00, "currency": "USD" }
Timeout: 5000ms

How should I configure retryWhen with exponential backoff and handle timeout cancellation using RxJS in an Angular functional interceptor?"
```

---

## Revision Checklist

- [ ] Distinguish between consumer AI data retention policies and Enterprise Zero-Retention agreements.
- [ ] Understand why production logs and stack traces must never contain raw PII when prompted.
- [ ] Implement pre-commit hooks to prevent credential leakage in AI context windows.
- [ ] Guard against "slopsquatting" and hallucinated npm package supply chain attacks.
- [ ] Safely sanitize and abstract proprietary code before seeking AI assistance.
