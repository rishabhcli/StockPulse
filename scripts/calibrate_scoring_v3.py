#!/usr/bin/env python3
"""
Walk-forward calibration for StockPulse v3 scoring thresholds.

This script reads validated backtest outcomes, searches a threshold grid,
and writes the best configuration back to config/scoring_v3.json.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Dict, Iterable, List, Tuple

from data.backtester import Backtester, ValidationResult


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT / "config" / "scoring_v3.json"


def score_to_bucket(score: float, thresholds: Dict[str, int]) -> str:
    if score >= thresholds["strong_buy"]:
        return "STRONG BUY"
    if score >= thresholds["buy"]:
        return "BUY"
    if score >= thresholds["hold"]:
        return "HOLD"
    if score >= thresholds["sell"]:
        return "SELL"
    return "STRONG SELL"


def actionable_predictions(
    validations: Iterable[ValidationResult],
    thresholds: Dict[str, int],
) -> List[Tuple[str, ValidationResult]]:
    results = []
    for validation in validations:
        bucket = score_to_bucket(validation.score, thresholds)
        if bucket in {"STRONG BUY", "BUY", "SELL", "STRONG SELL"}:
            results.append((bucket, validation))
    return results


def objective(validations: Iterable[ValidationResult], thresholds: Dict[str, int]) -> Tuple[float, Dict[str, float]]:
    actionable = actionable_predictions(validations, thresholds)
    if len(actionable) < 10:
        return (-10_000.0, {"count": len(actionable), "hit_rate": 0.0, "avg_net_return": 0.0})

    net_returns = [validation.net_return_pct for _, validation in actionable]
    hit_rate = sum(1 for _, validation in actionable if validation.correct) / len(actionable)
    avg_net_return = mean(net_returns)
    long_count = sum(1 for bucket, _ in actionable if bucket in {"STRONG BUY", "BUY"})
    short_count = sum(1 for bucket, _ in actionable if bucket in {"STRONG SELL", "SELL"})

    # Penalize lopsided or sparse threshold sets.
    balance_penalty = abs(long_count - short_count) / max(len(actionable), 1)
    score = (avg_net_return * 100) + (hit_rate * 25) - (balance_penalty * 5)

    return score, {
        "count": len(actionable),
        "hit_rate": round(hit_rate * 100, 2),
        "avg_net_return": round(avg_net_return, 4),
    }


def candidate_thresholds() -> Iterable[Dict[str, int]]:
    for strong_buy in range(68, 86, 2):
        for buy in range(54, strong_buy, 2):
            for hold in range(40, buy, 1):
                for sell in range(24, hold, 2):
                    yield {
                        "strong_buy": strong_buy,
                        "buy": buy,
                        "hold": hold,
                        "sell": sell,
                    }


def split_walk_forward(validations: List[ValidationResult]) -> Tuple[List[ValidationResult], List[ValidationResult]]:
    ordered = sorted(validations, key=lambda item: item.timestamp)
    if len(ordered) < 20:
        return ordered, ordered
    split_index = max(int(len(ordered) * 0.7), 1)
    return ordered[:split_index], ordered[split_index:]


def calibrate_group(validations: List[ValidationResult]) -> Dict[str, object]:
    train, test = split_walk_forward(validations)

    best_thresholds = None
    best_train_metrics = None
    best_score = float("-inf")

    for thresholds in candidate_thresholds():
        current_score, metrics = objective(train, thresholds)
        if current_score > best_score:
            best_score = current_score
            best_thresholds = thresholds
            best_train_metrics = metrics

    if best_thresholds is None:
        raise RuntimeError("No candidate thresholds were generated.")

    _, test_metrics = objective(test, best_thresholds)
    return {
        "thresholds": best_thresholds,
        "train_metrics": best_train_metrics,
        "test_metrics": test_metrics,
    }


def load_config(path: Path) -> Dict[str, object]:
    with path.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


def save_config(path: Path, config: Dict[str, object]) -> None:
    with path.open("w", encoding="utf-8") as config_file:
        json.dump(config, config_file, indent=2, sort_keys=False)
        config_file.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Calibrate StockPulse v3 score thresholds.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to scoring config JSON.")
    parser.add_argument("--db", default=None, help="Optional path to backtest DB.")
    parser.add_argument("--days", type=int, default=540, help="Lookback window in days for validations.")
    parser.add_argument("--dry-run", action="store_true", help="Compute best thresholds without writing config.")
    args = parser.parse_args()

    backtester = Backtester(db_path=args.db) if args.db else Backtester()
    validations = backtester.validate_predictions(days=args.days, horizons=(5, 20, 60))
    if not validations:
        raise SystemExit("No validated predictions available for calibration.")

    by_instrument = defaultdict(list)
    for validation in validations:
        by_instrument[getattr(validation, "instrument_type", "equity")].append(validation)

    config_path = Path(args.config)
    config = load_config(config_path)
    updated = deepcopy(config)
    updated.setdefault("recommendation_thresholds", {})
    calibration_report = {}

    for instrument_type, bucket_validations in by_instrument.items():
        if len(bucket_validations) < 10:
            continue
        result = calibrate_group(bucket_validations)
        updated["recommendation_thresholds"][instrument_type] = result["thresholds"]
        calibration_report[instrument_type] = result

    updated["version"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    updated["last_calibration"] = {
        "days": args.days,
        "report": calibration_report,
    }

    print(json.dumps(updated["last_calibration"], indent=2))

    if not args.dry_run:
        save_config(config_path, updated)
        print(f"\nWrote calibrated thresholds to {config_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
