# Daily Paper Reader

**English** · [简体中文](README.zh-CN.md) · [Live Demo](https://mux2001.github.io/daily-paper-reader/)

An inbox-style workspace for triaging daily papers in three minutes—scan today's batch, queue what's worth a deep read, and archive the rest.

![Widescreen paper inbox with a TL;DR and a structured 2×2 reading grid](docs/Screenshot.png)

## Why This Fork

Built on top of [`ziwenhahaha/daily-paper-reader`](https://github.com/ziwenhahaha/daily-paper-reader)'s retrieval pipeline, this fork rethinks the daily reading experience around four changes:

- **Keyboard-first inbox.** Triage happens in a single widescreen view: a compact queue on the left, a 2×2 structured summary grid on the right, and `j` / `k` / `s` / `x` shortcuts under your fingers. A progress ring tracks the current batch alongside a 12-week activity heatmap.
- **Precomputed Min-Max previews.** Each candidate arrives with a clear breakdown—where prior methods hit a wall, how the new approach works, key experimental numbers, and which figures or tables to check first. Everything is extracted ahead of time during the daily batch job, so clicking a paper opens instantly with zero LLM wait (with the original abstract tucked right below).
- **Flexible deep-read exits.** Press `c` to ask follow-up questions in a side-by-side panel without covering the paper, copy a self-contained **Deep-Read Pack** into your favorite frontier model (no API key needed), or export clean Markdown straight to disk or Obsidian.
- **Decoupled UI and summary languages.** Toggle **中 / EN** in the header to switch the interface and prompt templates on the fly. On the backend, `SUMMARY_LANG` sets the language for newly generated batches while keeping previously cached summaries intact.

## How It Works

1. **GitHub Actions** fetches candidate papers matching your topics in `config.yaml`, reranks and scores them, and writes the selected batch with precomputed previews to `docs/data/daily/`.
2. **GitHub Pages** hosts the compiled web reader and static JSON feeds. The scheduled workflow runs daily at `18:37 UTC` (`02:37` UTC+8) and automatically triggers a Pages release whenever a new batch is produced.
3. **Your browser** reads the static feed, syncs reading state and personal notes to your own Supabase project, and talks directly to your configured LLM endpoint only when you open **Ask AI**.

## 5-Minute Quick Start

1. **Fork the repo.** Fork **MuX2001/daily-paper-reader** with **Copy the `dev` branch only** checked (so `dev` is your default branch), then edit `subscriptions.intent_profiles` in [config.yaml](config.yaml) to match your research topics.
2. **Set up state sync (Supabase).** Create a Supabase project for your personal reading state, open its SQL Editor, and run [create_paper_states_schema.sql](sql/create_paper_states_schema.sql) in full—this sets up the state/notes/feedback schema, auth grants, and per-user row-level security (RLS). Enable **Email/Password** sign-in under Authentication. *(Note: `config.yaml` already points to public paper retrieval sources out of the box, so you don't need to build your own paper catalog; the remaining [SQL scripts](sql/) are only for catalog maintenance or analytics.)*
3. **Add daily model secrets.** In your fork, go to **Settings → Secrets and variables → Actions** and add two **Repository secrets**: `DEEPSEEK_API_KEY` (your provider key) and `DEEPSEEK_MODEL` (e.g., `deepseek-flash`). That's all you need for daily runs—no repository variables or personal GitHub token required.
4. **Enable Actions & Pages.** Enable workflows in the **Actions** tab. Set **Settings → Actions → General → Workflow permissions** to **Read and write**, then set **Settings → Pages** to **Deploy from a branch → `dev` → `/(root)`** and click **Save**. The release workflow commits the built reader and daily feeds back to `dev` and triggers Pages deployment.
5. **Run your first batch.** Trigger **Actions → daily-paper-reader → Run workflow** on `dev` (keep action as `daily` and content mode as `triage`). Once published, open your Pages URL, go to **Settings → Account & sync**, enter and verify your Supabase URL and publishable/`anon` key, and sign up with an email account. Star a paper and refresh to confirm cloud sync is working.

**Optional integrations.** Set up **Ask AI** only if you want in-browser paper chat—**Copy Deep-Read Pack** works without any API key. For **Obsidian**, pick your preferred export mode and vault name in Settings. Coming from an older version? Use **Data & maintenance** to preview and import legacy browser records or JSON backups into your account.

**Local development.** To run the Python pipeline locally, activate a Python 3.11 environment with [requirements.txt](requirements.txt) and [requirements-reader.txt](requirements-reader.txt), copy [.env.example](.env.example) to `.env` with your daily API key and model ID, and run:

```bash
PYTHONPATH=src python src/main.py --content-mode triage --export-triage
```

To launch the web reader locally against existing feed data in `docs/data` (Node.js 24, no Python run needed):

```bash
npm ci
DPR_READER_DATA_DIR="$PWD/docs/data" npm run dev -- --port 5173 --strictPort
```

Then open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## Secrets & Configuration Reference

### 1. GitHub Actions Secrets & Variables

The two secrets from Step 3 are all you need for standard daily digests. Everything else below is optional—GitHub automatically provides the `GITHUB_TOKEN` used to commit feeds and publish Pages.

| Name | Type | Description & default |
|---|---|---|
| `DEEPSEEK_API_KEY` | Secret | Required for daily scoring and default triage summaries. |
| `DEEPSEEK_MODEL` | Secret | Model ID for daily runs (e.g., `deepseek-flash`). Triage requires either this secret or the `TRIAGE_MODEL` variable. |
| `DEEPSEEK_BASE_URL` | Variable / Secret | Custom OpenAI-compatible endpoint. Deep-read jobs check the Variable first. Default: `https://api.deepseek.com`. |
| `SUMMARY_LANG` | Variable | Output language for newly generated previews (`zh` by default, or `en` for English). |

> **Model note:** Older scoring scripts still accept the legacy alias `deepseek-v4-flash`, but new setups should use `deepseek-flash`. See the [DeepSeek pricing & model docs](https://api-docs.deepseek.com/quick_start/pricing/).

<details><summary>Feedback personalization & notifications</summary>

| Name | Type | Description & default |
|---|---|---|
| `DPR_STATE_SUPABASE_URL`, `DPR_STATE_SERVICE_KEY`, `DPR_FEEDBACK_USER_ID` | Secret | Provide all three (state project URL, server service key, and your Auth user UUID) to re-weight daily rankings from your `+` / `-` feedback. Leave unset to disable. |
| `DPR_NOTIFY_FEISHU_WEBHOOK` | Secret | Feishu bot webhook URL for daily digest pushes. Leave unset to skip notifications. |

</details>

<details><summary>Retrieval, reranking & triage overrides</summary>

| Name | Type | Description & default |
|---|---|---|
| `DPR_EMBED_API_URL`, `DPR_EMBED_API_KEY` | Secret | Custom embedding endpoint and key. Defaults to `https://zwwen.online/embed` with built-in public fallback. |
| `RERANK_PROFILE` | Secret | Reranker preset (manual workflow inputs override this value). Default: `public-zwwen-rerank`. |
| `RERANK_PROVIDER`, `RERANK_MODEL`, `RERANK_API_BASE_URL`, `RERANK_API_KEY` | Secret | Granular reranker overrides; defaults follow the selected preset. |
| `PUBLIC_RERANK_API_BASE_URL`, `PUBLIC_RERANK_API_KEY` | Secret | Public reranker overrides. Defaults to `https://zwwen.online/rerank` with built-in fallback. |
| `SILICONFLOW_RERANK_URL`, `SILICONFLOW_API_KEY` | Secret | Used only with the SiliconFlow preset (`https://api.siliconflow.cn/v1/rerank`); requires your SiliconFlow API key. |
| `SILICONFLOW_RERANK_MIN_INTERVAL_SECONDS` | Secret | Minimum delay between SiliconFlow requests (`8` seconds by default in Actions). |
| `DAILY_READER_MODEL` | Variable | Optional override for both daily scoring and triage. Select Flash or Pro in Workspace settings → Daily Model & Research Connection. Inherit to restore the existing settings. |
| `TRIAGE_API_KEY`, `TRIAGE_MODEL`, `TRIAGE_BASE_URL` | Secret / Variable / Variable | Dedicated credentials for the triage summary step; falls back to the corresponding `DEEPSEEK_*` settings if unset. |

</details>

<details><summary>Optional cloud deep-read workflow</summary>

These apply only if you trigger server-side deep-read jobs via GitHub Actions (**Copy Deep-Read Pack** in the UI needs none of these). The cloud job also accepts `DEEPSEEK_MODEL` and `DEEPSEEK_BASE_URL` as repository variables.

| Name | Type | Description & default |
|---|---|---|
| `DEEP_READ_API_KEY` | Secret | Dedicated API key for cloud deep reads. Falls back to `DEEPSEEK_API_KEY` when using the same endpoint. |
| `DEEP_READ_MODEL`, `DEEP_READ_BASE_URL` | Variable / Secret | Dedicated model and endpoint (Variables override Secrets; inherits daily settings if unset). Official endpoint defaults to `deepseek-flash`; custom endpoints require an explicit model ID. |
| `OBSIDIAN_NOTES_REPO` | Variable | Target private vault repo (`owner/repo`) for pushing generated notes. Leave unset to skip repo sync. |
| `OBSIDIAN_NOTES_BRANCH`, `OBSIDIAN_NOTES_FOLDER` | Variable | Target branch and folder inside the vault repo. Defaults: `main` and `Inbox`. |
| `OBSIDIAN_NOTES_TOKEN` | Secret | Fine-grained PAT with `Contents: Read and write` on the vault repo (required only when `OBSIDIAN_NOTES_REPO` is set). |

</details>

<details><summary>Catalog maintenance & legacy compatibility</summary>

| Name | Type | Description & default |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Secret | Read-only paper catalog overrides for topic research and starter packs (uses `config.yaml` defaults if unset). |
| `SUPABASE_SERVICE_KEY` | Secret | Required only for paper catalog ingestion/maintenance workflows (restricted to allowlisted repos). |
| `OPENREVIEW_USERNAME`, `OPENREVIEW_PASSWORD` | Secret | Optional credentials for conference paper scraping; defaults to public anonymous access. |
| `SUMMARY_API_KEY`, `SUMMARY_BASE_URL`, `SUMMARY_MODEL` | Secret | Legacy summary pipeline overrides; falls back to daily settings. |
| `LLM_PRIMARY_BASE_URL` | Secret | Legacy internal binding; leave unset. |

</details>

### 2. Supabase Frontend Configuration

| Account & sync field | What to enter |
|---|---|
| Supabase URL | Project URL where you ran `create_paper_states_schema.sql`. Click **Save & verify** after entering. |
| Publishable / anon key | The public client `anon` key for that same project. Data access is isolated per user via Postgres RLS. |
| Email & password | Sign up or sign in to sync your reading queue, archived items, feedback, and personal notes across devices. |

> **Security:** Never paste a Supabase `service_role` key into the web UI or commit it to Git. Server-only keys (`SUPABASE_SERVICE_KEY` for catalog maintenance and `DPR_STATE_SERVICE_KEY` for optional feedback ranking) belong strictly in GitHub Secrets—only the public `anon` / publishable key should touch the browser.

### 3. Browser Workspace Settings

| Tab | Purpose & inputs |
|---|---|
| Web AI chat | Pick a preset (DeepSeek, OpenAI, OpenRouter, or Custom), enter Base URL, Model ID, and API Key, then test and save. |
| Research tasks | Point to your fork (`owner/repo`), branch `dev`, and a GitHub PAT to trigger workflows or update subscriptions from the UI. |
| Export & Obsidian | Choose Markdown download, Obsidian URI, or both, and customize your vault name, inbox folder, and filename template. No GitHub token needed. |
| Data & maintenance | Preview and import legacy reading history from `localStorage` or JSON backups, clear locally stored keys, or toggle local-only test mode. |

> **Token scope:** When configuring a GitHub token in the browser, always create a **fine-grained PAT** scoped strictly to your single fork with **Actions: Read and write** (add **Contents: Read and write** only if you edit `config.yaml` from the UI). Avoid classic PATs with broad `repo` access. API keys and tokens live only in page memory by default—check **Remember on this browser** (`localStorage`) only on trusted personal devices.

## Keyboard Shortcuts & Branch Policy

| Key | Action |
|---|---|
| `j` / `k` | Next / previous paper |
| `s` | Add to or remove from Reading Queue |
| `x` | Archive or restore current paper |
| `o` | Open original PDF |
| `c` | Toggle side-by-side Ask AI panel |
| `/` | Focus search input |
| `Esc` | Close active panel or modal |
| `?` | Show shortcut cheat sheet |

All active development, scheduled runs, Pages deployments, and pull requests target **`dev`**. The **`main`** branch is kept strictly as a clean fast-forward mirror of upstream [`ziwenhahaha/daily-paper-reader`](https://github.com/ziwenhahaha/daily-paper-reader) so useful upstream fixes can be cherry-picked onto `dev` without merge noise. See [AGENTS.md](AGENTS.md) for maintenance details.