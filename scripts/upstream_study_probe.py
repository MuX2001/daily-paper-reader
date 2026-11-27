"""Offline upstream integration study. See others/plans/upstream_feasibility_report.md."""
import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
IDS = ("2611.24938v2", "2611.32016v1")


def documents(kind, samples):
    if kind == "host":
        from reader_fulltext import html_text, pdf_text
        from bs4 import BeautifulSoup
        from reader_thumbnail import pdf_figure
        import fitz
    else:
        from arxiv_digest.fulltext import html_text, pdf_text

    for pid in IDS:
        html = (samples / f"{pid}.html").read_text()
        pdf = (samples / f"{pid}.pdf").read_bytes()
        start = time.perf_counter()
        page = html_text(html, pid) if kind == "host" else html_text(html)
        html_elapsed = time.perf_counter() - start
        start = time.perf_counter()
        plain = pdf_text(pdf, pid) if kind == "host" else pdf_text(pdf)
        print(pid, "html/pdf seconds", round(html_elapsed, 3), round(time.perf_counter()-start, 3),
              "chars", len(page), len(plain), "## headings", page.count("## "),
              "references heading", bool(re.search(r"(?im)^\s*references\s*$", page)))
        if kind == "host":
            soup = BeautifulSoup(html, "html.parser").find("article")
            math = [m["alttext"] for m in soup.select("math[alttext]")]
            print("TeX exact occurrences covered", sum(f"${m}$" in page for m in math), len(math))
            print("HTML anchor/caption/image", [(f.get("id"), f.figcaption.get_text(" ", strip=True)[:65],
                  len(f.select("img[src]"))) for f in soup.select("figure[id]") if f.figcaption][:3])
            with fitz.open(stream=pdf, filetype="pdf") as document:
                for label in ("Figure 1", "Figure 2"):
                    try:
                        image, caption, number, box = pdf_figure(document, label)
                        print(label, number, image.size, [round(v) for v in box], caption[:85])
                    except ValueError as exc:
                        print(label, str(exc))
        else:
            print("TeX spans", len(re.findall(r"\$[^$\n]+\$", page)))


def bridge(samples):
    from arxiv_digest.crossover import Bridge, BridgeMap, score_crossovers
    from arxiv_digest.models import Paper
    path = ROOT / "archive/20261127/recommend/arxiv_papers_20261127.standard.json"
    data = json.loads(path.read_text())
    papers = []
    for p in data["deep_dive"] + data["quick_skim"]:
        stamp = datetime.fromisoformat(p["published"].replace("Z", "+00:00"))
        pid, version = p["id"].rsplit("v", 1)
        papers.append(Paper(pid, int(version), p["title"], p["abstract"], tuple(p["authors"]),
                            tuple(p["categories"]), p["primary_category"], stamp, stamp))
    # Fixed mechanism probe. The phrase list is researcher-supplied.
    link = Bridge("robot learning", "math.OC", "optimization", "trajectory optimization",
                  ("optimal control", "descent direction", "quadratic programming"))
    query = BridgeMap(link.interest, ("How to optimize a trajectory?",), (link,))
    ranked = sorted(score_crossovers(papers, [query], None, None, None),
                    key=lambda candidate: -candidate.best.score)
    for candidate in ranked[:5]:
        print(candidate.paper.id, candidate.best.score, candidate.paper.title)

    print("positive scores", sum(c.best.score > 0 for c in ranked), "/", len(ranked))
    # The historical model output is optional for a fresh checkout.
    scores = samples / "report/scores.csv"
    if scores.exists():
        with scores.open(encoding="utf-8-sig") as source:
            rows = list(csv.DictReader(source))
        best = ranked[0].paper
        row = next(row for row in rows if row["title"] == best.title)
        version_id = f"{best.id}v{best.version}"
        folder = samples / "sources" / hashlib.sha256(version_id.encode()).hexdigest()
        metadata = json.loads((folder / "source.json").read_text())
        article = (folder / "fulltext.txt").read_text()
        assert metadata["paper_id"] == version_id
        assert metadata["sha256"] == hashlib.sha256(article.encode()).hexdigest()
        assert " ".join(row["evidence"].split()) in " ".join(article.split())
        print("historical quality rank", row["new_rank"], "eligible", row["eligible"],
              "verified source", metadata["source_url"], metadata["sha256"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("host", "candidate", "bridge"))
    parser.add_argument("samples", type=Path)
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT / "src"))
    if args.mode == "bridge":
        bridge(args.samples)
    else:
        documents(args.mode, args.samples)
