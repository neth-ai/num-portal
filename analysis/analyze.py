"""
analyze.py – statistics for Chapter V (Results and Analysis).

Input : the CSV downloaded from NUM Portal (Experiment data -> "Download CSV for analysis")
        columns: date,method,scenario,run,result,seconds,steps,sha
Output: analysis/output/report.md  (Tables 10–13 filled in, ready to copy into the thesis)
        analysis/output/*.csv       (the same tables as CSV)
        analysis/output/*.png       (charts for the thesis)

Usage:
    pip install -r analysis/requirements.txt
    python analysis/analyze.py experiment-runs.csv
    python analysis/analyze.py experiment-runs.csv --apdex-a k6-manual.json --apdex-b k6-devops.json

Rules (as described in Chapter III, section 3.9):
  * Runs are paired by scenario and run number (A-S2-3 with B-S2-3).
  * Shapiro-Wilk on the paired differences; p > 0.05 -> paired t-test, otherwise Wilcoxon signed-rank.
  * Failure rate: Fisher's exact test on the 2x2 table (method x success/failure).
  * Significance level: 0.05. Effect sizes: Cohen's dz (t-test) or rank-biserial r (Wilcoxon).
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402

DEPLOY_SCENARIOS = ["S1", "S2", "S4", "S5"]   # Table 10 (deployment time) and H4 (manual steps)
FAILURE_SCENARIOS = ["S2", "S4", "S5"]        # Table 11 (failure rate)
NAMES = {"S1": "S1. First deployment", "S2": "S2. Normal feature update", "S3": "S3. Faulty release (recovery)",
         "S4": "S4. Environment mismatch", "S5": "S5. Configuration change"}
ALPHA = 0.05


def load(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, comment="#")
    df.columns = [c.strip().lower() for c in df.columns]
    df = df.rename(columns={"run_no": "run", "runno": "run"})
    df["method"] = df["method"].str.upper().str.strip()
    df["scenario"] = df["scenario"].str.upper().str.strip()
    df["result"] = df["result"].str.lower().str.strip()
    return df


def fmt(x, d=1):
    return "–" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.{d}f}"


def fmt_p(p):
    if p is None or (isinstance(p, float) and math.isnan(p)):
        return "–"
    return "< 0.001" if p < 0.001 else f"{p:.3f}"


def paired_test(a: np.ndarray, b: np.ndarray) -> dict:
    """Shapiro-Wilk on differences, then paired t-test or Wilcoxon signed-rank."""
    n = len(a)
    out = {"n_pairs": n, "test": "–", "p": float("nan"), "effect": float("nan"), "effect_name": "–", "shapiro_p": float("nan")}
    if n < 3:
        out["test"] = "not enough pairs"
        return out
    d = a - b
    out["shapiro_p"] = float(stats.shapiro(d).pvalue) if np.ptp(d) > 0 else float("nan")
    normal = not math.isnan(out["shapiro_p"]) and out["shapiro_p"] > ALPHA
    if normal:
        res = stats.ttest_rel(a, b)
        out.update(test="Paired t-test", stat=float(res.statistic), p=float(res.pvalue),
                   effect=float(d.mean() / d.std(ddof=1)) if d.std(ddof=1) > 0 else float("nan"), effect_name="Cohen's dz")
    else:
        nz = d[d != 0]
        if len(nz) == 0:
            out["test"] = "no differences"
            return out
        res = stats.wilcoxon(a, b)
        ranks = stats.rankdata(np.abs(nz))
        r = (ranks[nz > 0].sum() - ranks[nz < 0].sum()) / ranks.sum()
        out.update(test="Wilcoxon signed-rank", stat=float(res.statistic), p=float(res.pvalue), effect=float(r), effect_name="rank-biserial r")
    return out


def pairs(df: pd.DataFrame, scenarios: list[str], value: str, only_success: bool) -> pd.DataFrame:
    sub = df[df["scenario"].isin(scenarios)]
    if only_success:
        sub = sub[sub["result"] == "success"]
    wide = sub.pivot_table(index=["scenario", "run"], columns="method", values=value, aggfunc="mean")
    return wide.dropna(subset=[c for c in ["A", "B"] if c in wide.columns]) if {"A", "B"} <= set(wide.columns) else wide.iloc[0:0]


def describe(df: pd.DataFrame, value: str, scenarios: list[str], only_success: bool) -> pd.DataFrame:
    rows = []
    for s in scenarios + ["All"]:
        sub = df if s == "All" else df[df["scenario"] == s]
        sub = sub[sub["scenario"].isin(scenarios)]
        if only_success:
            sub = sub[sub["result"] == "success"]
        a = sub[sub["method"] == "A"][value]
        b = sub[sub["method"] == "B"][value]
        change = (b.mean() - a.mean()) / a.mean() * 100 if len(a) and len(b) and a.mean() else float("nan")
        rows.append({"Scenario": NAMES.get(s, "All scenarios"), "A n": len(a), "Method A mean": a.mean(), "Method A SD": a.std(ddof=1),
                     "A median": a.median(), "B n": len(b), "Method B mean": b.mean(), "Method B SD": b.std(ddof=1),
                     "B median": b.median(), "Change (%)": change})
    return pd.DataFrame(rows)


def failure_table(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    rows = []
    for s in FAILURE_SCENARIOS + ["All"]:
        sub = df[df["scenario"].isin(FAILURE_SCENARIOS)] if s == "All" else df[df["scenario"] == s]
        row = {"Scenario": NAMES.get(s, "All scenarios")}
        for m in ["A", "B"]:
            x = sub[sub["method"] == m]
            f = int((x["result"] == "failed").sum())
            row[f"Method {m} failures / runs"] = f"{f} / {len(x)}"
            row[f"Method {m} rate (%)"] = f / len(x) * 100 if len(x) else float("nan")
        rows.append(row)
    sub = df[df["scenario"].isin(FAILURE_SCENARIOS)]
    table = [[int(((sub["method"] == m) & (sub["result"] == "failed")).sum()), int(((sub["method"] == m) & (sub["result"] == "success")).sum())] for m in ["A", "B"]]
    test = {"table": table, "p": float("nan"), "odds_ratio": float("nan")}
    if sum(map(sum, table)) > 0:
        res = stats.fisher_exact(table)
        test.update(p=float(res.pvalue), odds_ratio=float(res.statistic))
    return pd.DataFrame(rows), test


def apdex_from_k6(path: str | None) -> dict | None:
    if not path:
        return None
    data = json.loads(Path(path).read_text())
    if "apdex" in data:  # apdex-summary.json written by tests/load/apdex.js
        return {"apdex": data["apdex"], "p95": data.get("p95"), "mean": data.get("mean")}
    m = data["metrics"]["http_req_duration"]["values"]  # k6 --summary-export
    return {"apdex": None, "p95": m.get("p(95)"), "mean": m.get("avg")}


def verdict(p):
    return "Supported" if not math.isnan(p) and p < ALPHA else "Not supported"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv")
    ap.add_argument("--apdex-a", help="k6 apdex-summary.json for Method A")
    ap.add_argument("--apdex-b", help="k6 apdex-summary.json for Method B")
    ap.add_argument("--out", default=str(Path(__file__).parent / "output"))
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    df = load(args.csv)
    dummy = Path(args.csv).read_text(encoding="utf-8").lstrip().upper().startswith("# DUMMY")

    # ---- H1: deployment time (successful runs, S1 S2 S4 S5)
    t10 = describe(df, "seconds", DEPLOY_SCENARIOS, only_success=True)
    p_time = pairs(df, DEPLOY_SCENARIOS, "seconds", only_success=True)
    h1 = paired_test(p_time["A"].to_numpy(), p_time["B"].to_numpy()) if len(p_time) else paired_test(np.array([]), np.array([]))

    # ---- H2: failure rate
    t11, h2 = failure_table(df)

    # ---- H3: recovery time (S3)
    s3 = df[df["scenario"] == "S3"]
    p_rec = pairs(df, ["S3"], "seconds", only_success=False)
    h3 = paired_test(p_rec["A"].to_numpy(), p_rec["B"].to_numpy()) if len(p_rec) else paired_test(np.array([]), np.array([]))
    rec = {m: s3[s3["method"] == m]["seconds"] for m in ["A", "B"]}

    # ---- H4: manual steps (all runs, S1 S2 S4 S5)
    p_steps = pairs(df, DEPLOY_SCENARIOS, "steps", only_success=False)
    h4 = paired_test(p_steps["A"].to_numpy(), p_steps["B"].to_numpy()) if len(p_steps) else paired_test(np.array([]), np.array([]))
    steps = {m: df[(df["method"] == m) & df["scenario"].isin(DEPLOY_SCENARIOS)]["steps"] for m in ["A", "B"]}

    apdex_a, apdex_b = apdex_from_k6(args.apdex_a), apdex_from_k6(args.apdex_b)

    # ---- save tables
    t10.to_csv(out / "table10_deployment_time.csv", index=False)
    t11.to_csv(out / "table11_failure_rate.csv", index=False)
    pd.DataFrame([{"Hypothesis": h, **r} for h, r in [("H1", h1), ("H3", h3), ("H4", h4)]]).to_csv(out / "tests.csv", index=False)

    # ---- charts
    if len(df):
        fig, ax = plt.subplots(figsize=(8, 4.5))
        data, labels, colors = [], [], []
        for s in DEPLOY_SCENARIOS:
            for m, c in [("A", "#c0392b"), ("B", "#2f6db5")]:
                v = df[(df["scenario"] == s) & (df["method"] == m) & (df["result"] == "success")]["seconds"]
                data.append(v.to_numpy()); labels.append(f"{s}\n{m}"); colors.append(c)
        bp = ax.boxplot(data, patch_artist=True)
        ax.set_xticks(range(1, len(labels) + 1), labels)
        for patch, c in zip(bp["boxes"], colors):
            patch.set_facecolor(c); patch.set_alpha(0.35)
        ax.set_ylabel("Deployment time (seconds)")
        ax.set_title("Deployment time by scenario (A = manual, B = DevOps)")
        ax.grid(axis="y", alpha=0.3)
        fig.tight_layout(); fig.savefig(out / "figure_deployment_time.png", dpi=200); plt.close(fig)

        fig, ax = plt.subplots(figsize=(7, 4))
        x = np.arange(len(FAILURE_SCENARIOS)); w = 0.38
        for i, (m, c) in enumerate([("A", "#c0392b"), ("B", "#2f6db5")]):
            rates = [((df["scenario"] == s) & (df["method"] == m) & (df["result"] == "failed")).sum() / max(1, ((df["scenario"] == s) & (df["method"] == m)).sum()) * 100 for s in FAILURE_SCENARIOS]
            ax.bar(x + (i - 0.5) * w, rates, w, label=f"Method {m}", color=c)
        ax.set_xticks(x, FAILURE_SCENARIOS); ax.set_ylabel("Failed deployments (%)"); ax.legend(); ax.grid(axis="y", alpha=0.3)
        ax.set_title("Deployment failure rate by scenario")
        fig.tight_layout(); fig.savefig(out / "figure_failure_rate.png", dpi=200); plt.close(fig)

    # ---- report
    L = []
    if dummy:
        L += ["> **WARNING: this report was made from DUMMY test data. Do not use these numbers in the thesis.**", ""]
    L += ["# Results for Chapter V", "", f"Input file: `{args.csv}` – {len(df)} runs "
          f"(Method A: {int((df['method'] == 'A').sum())}, Method B: {int((df['method'] == 'B').sum())})", ""]
    L += ["## Table 10: Deployment Time by Method and Scenario (successful runs, seconds)", "",
          "| Scenario | Method A mean (s) | Method A SD | Method B mean (s) | Method B SD | Change (%) |", "|---|---|---|---|---|---|"]
    for _, r in t10.iterrows():
        L.append(f"| {r['Scenario']} | {fmt(r['Method A mean'])} | {fmt(r['Method A SD'])} | {fmt(r['Method B mean'])} | {fmt(r['Method B SD'])} | {fmt(r['Change (%)'])} |")
    L += ["", f"H1 – {h1['test']} on {h1['n_pairs']} pairs: Shapiro-Wilk p = {fmt_p(h1['shapiro_p'])}; p = {fmt_p(h1['p'])}; "
          f"{h1['effect_name']} = {fmt(h1['effect'], 2)} → **{verdict(h1['p'])}**", ""]

    L += ["## Table 11: Deployment Failure Rate by Method and Scenario", "",
          "| Scenario | Method A failures / runs | Method A rate (%) | Method B failures / runs | Method B rate (%) |", "|---|---|---|---|---|"]
    for _, r in t11.iterrows():
        L.append(f"| {r['Scenario']} | {r['Method A failures / runs']} | {fmt(r['Method A rate (%)'])} | {r['Method B failures / runs']} | {fmt(r['Method B rate (%)'])} |")
    L += ["", f"H2 – Fisher's exact test on [[A failed, A success], [B failed, B success]] = {h2['table']}: p = {fmt_p(h2['p'])} → **{verdict(h2['p'])}**", ""]

    L += ["## Recovery time (S3, H3)", "",
          f"Method A: mean {fmt(rec['A'].mean())} s (SD {fmt(rec['A'].std(ddof=1))}, n = {len(rec['A'])}); "
          f"Method B: mean {fmt(rec['B'].mean())} s (SD {fmt(rec['B'].std(ddof=1))}, n = {len(rec['B'])}); "
          f"difference {fmt((rec['B'].mean() - rec['A'].mean()) / rec['A'].mean() * 100 if len(rec['A']) and rec['A'].mean() else float('nan'))}%.",
          f"H3 – {h3['test']} on {h3['n_pairs']} pairs: p = {fmt_p(h3['p'])}; {h3['effect_name']} = {fmt(h3['effect'], 2)} → **{verdict(h3['p'])}**", ""]

    L += ["## Manual steps (H4)", "",
          f"Method A: mean {fmt(steps['A'].mean())} commands (range {fmt(steps['A'].min(), 0)}–{fmt(steps['A'].max(), 0)}); "
          f"Method B: mean {fmt(steps['B'].mean())} human actions.",
          f"H4 – {h4['test']} on {h4['n_pairs']} pairs: p = {fmt_p(h4['p'])}; {h4['effect_name']} = {fmt(h4['effect'], 2)} → **{verdict(h4['p'])}**", ""]

    L += ["## Table 12: Response Time and Apdex After Deployment", "", "| Measure | Method A | Method B |", "|---|---|---|"]
    if apdex_a or apdex_b:
        g = lambda d, k: fmt(d.get(k), 3 if k == "apdex" else 0) if d and d.get(k) is not None else "–"  # noqa: E731
        L += [f"| Mean response time (ms) | {g(apdex_a, 'mean')} | {g(apdex_b, 'mean')} |",
              f"| 95th percentile response time (ms) | {g(apdex_a, 'p95')} | {g(apdex_b, 'p95')} |",
              f"| Apdex score (T = 1 s) | {g(apdex_a, 'apdex')} | {g(apdex_b, 'apdex')} |"]
    else:
        L += ["| (run tests/load/apdex.js against both addresses and pass --apdex-a / --apdex-b) | – | – |"]

    L += ["", "## Table 13: Summary of Hypothesis Testing", "", "| Hypothesis | Measure | Test | p-value | Result |", "|---|---|---|---|---|",
          f"| H1 | Deployment time | {h1['test']} | {fmt_p(h1['p'])} | {verdict(h1['p'])} |",
          f"| H2 | Failure rate | Fisher's exact test | {fmt_p(h2['p'])} | {verdict(h2['p'])} |",
          f"| H3 | Recovery time | {h3['test']} | {fmt_p(h3['p'])} | {verdict(h3['p'])} |",
          f"| H4 | Manual steps | {h4['test']} | {fmt_p(h4['p'])} | {verdict(h4['p'])} |", "",
          "Charts: `figure_deployment_time.png`, `figure_failure_rate.png`."]
    (out / "report.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))
    print(f"\nSaved to {out}/")


if __name__ == "__main__":
    main()
