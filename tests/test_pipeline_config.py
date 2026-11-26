import yaml

from src.pipeline_config import apply_pipeline_config


def test_settings_precedence_and_credentials(tmp_path):
    path = tmp_path / "config.yaml"
    pipeline = {
        "summary_lang": "en",
        "daily_llm": {"model": "daily", "base_url": "https://daily.example"},
        "triage_llm": {"use_separate_model": False, "model": "other"},
        "rerank": {"profile": "custom", "base_url": "https://rank.example", "model": "rank", "min_interval_seconds": 0},
    }
    old = {"SUMMARY_LANG":"zh", "DEEPSEEK_MODEL":"old", "DEEPSEEK_API_KEY":"main-key", "TRIAGE_API_KEY":"triage-key"}
    path.write_text(yaml.safe_dump({"pipeline":pipeline}))
    env = old.copy()
    apply_pipeline_config(path, env)
    assert env["SUMMARY_LANG"] == "en"
    assert env["DEEPSEEK_FILTER_MODEL"] == env["TRIAGE_MODEL"] == "daily"
    assert env["TRIAGE_API_KEY"] == "main-key"
    assert env["RERANK_API_BASE_URL"] == "https://rank.example"
    assert env["SILICONFLOW_RERANK_MIN_INTERVAL_SECONDS"] == "0"

    pipeline["triage_llm"]["use_separate_model"] = True
    path.write_text(yaml.safe_dump({"pipeline":pipeline}))
    env = old.copy()
    apply_pipeline_config(path, env, "siliconflow")
    assert env["TRIAGE_MODEL"] == "other"
    assert env["TRIAGE_API_KEY"] == "triage-key"
    assert env["RERANK_PROVIDER"] == "siliconflow"
    assert env["RERANK_API_BASE_URL"] == "https://api.siliconflow.cn/v1/rerank"

    path.write_text("subscriptions: {}")
    env = old.copy()
    apply_pipeline_config(path, env)
    assert env == old
