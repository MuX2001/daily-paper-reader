"""Resolve published non-secret settings before launching pipeline stages."""
import os
from pathlib import Path

import yaml


def apply_pipeline_config(path, env=None, rerank_override=None):
    env = os.environ if env is None else env
    source = Path(path)
    config = yaml.safe_load(source.read_text()) if source.is_file() else {}
    settings = (config or {}).get("pipeline", {})
    daily = settings.get("daily_llm", {})
    triage = settings.get("triage_llm", {})
    rerank = settings.get("rerank", {})

    def assign(value, *names):
        if value is not None and str(value).strip():
            for name in names:
                env[name] = str(value).strip()

    assign(settings.get("summary_lang"), "SUMMARY_LANG")
    assign(daily.get("model"), "DEEPSEEK_MODEL", "DEEPSEEK_FILTER_MODEL", "SUMMARY_MODEL", "DEEPSEEK_REWRITE_MODEL")
    assign(daily.get("base_url"), "DEEPSEEK_BASE_URL", "SUMMARY_BASE_URL", "LLM_PRIMARY_BASE_URL")
    if daily and env.get("DEEPSEEK_API_KEY"):
        env["SUMMARY_API_KEY"] = env["DEEPSEEK_API_KEY"]
    if triage or daily:
        separate = triage.get("use_separate_model", False)
        for field, suffix in (("model", "MODEL"), ("base_url", "BASE_URL"), ("", "API_KEY")):
            name = "TRIAGE_" + suffix
            value = None
            if separate:
                value = triage.get(field) or env.get(name)
            env[name] = value or env.get("DEEPSEEK_" + suffix, "")

    override = rerank_override or env.get("DPR_DISPATCH_RERANK_PROFILE")
    profile = override or rerank.get("profile")
    if profile:
        if override and override != rerank.get("profile"):
            rerank = {}
        profiles = {
            "public-zwwen-rerank": ("public_zwwen", "https://zwwen.online/rerank", "Qwen/Qwen3-Reranker-0.6B"),
            "siliconflow": ("siliconflow", "https://api.siliconflow.cn/v1/rerank", "BAAI/bge-reranker-v2-m3"),
            "siliconflow-qwen3-0.6b": ("siliconflow", "https://api.siliconflow.cn/v1/rerank", "Qwen/Qwen3-Reranker-0.6B"),
            "custom": ("custom", "", ""),
        }
        env["RERANK_PROFILE"] = profile
        if profile in profiles:
            provider, url, model = profiles[profile]
            assign(provider if profile != "custom" else rerank.get("provider") or provider, "RERANK_PROVIDER")
            endpoint_var = {"public_zwwen":"PUBLIC_RERANK_API_BASE_URL", "siliconflow":"SILICONFLOW_RERANK_URL"}.get(provider, "RERANK_API_BASE_URL")
            address = rerank.get("base_url") or env.get(endpoint_var) or env.get("RERANK_API_BASE_URL") or url
            assign(address, endpoint_var, "RERANK_API_BASE_URL")
            assign(rerank.get("model") or env.get("RERANK_MODEL") or model, "RERANK_MODEL")
            assign(rerank.get("min_interval_seconds"), "SILICONFLOW_RERANK_MIN_INTERVAL_SECONDS")
