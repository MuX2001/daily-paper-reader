from pathlib import Path


SYNC_WORKFLOW = Path(".github/workflows/sync.yml")


def test_sync_workflow_is_manual_only():
    text = SYNC_WORKFLOW.read_text(encoding="utf-8")

    assert "workflow_dispatch:" in text, "sync.yml should still support manual dispatch"
    assert "schedule:" not in text, "sync.yml must not run automatic scheduled sync"
    assert "cron:" not in text, "sync.yml must not define cron triggers"
    assert "github.event_name == 'schedule'" not in text
    assert "shuf -i" not in text, "random delay is only needed for scheduled auto-sync"


def test_sync_workflow_does_not_request_pages_rebuild():
    text = SYNC_WORKFLOW.read_text(encoding="utf-8")

    assert "pages: write" not in text
    assert "Request GitHub Pages rebuild" not in text
    assert "/pages/builds" not in text


def test_mirror_check_has_no_write_access_and_all_jobs_are_dev_scoped():
    import yaml

    for path in SYNC_WORKFLOW.parent.glob("*.yml"):
        workflow = yaml.safe_load(path.read_text())
        for name, job in workflow["jobs"].items():
            assert "github.ref == 'refs/heads/dev'" in job["if"], (path, name)
        # PyYAML's safe loader treats the Actions key "on" as boolean True.
        triggers = workflow[True]
        for event in ("push", "pull_request"):
            if event in triggers:
                assert triggers[event]["branches"] == ["dev"], path

    mirror = yaml.safe_load(SYNC_WORKFLOW.read_text())
    assert mirror["permissions"] == {"contents": "read"}
