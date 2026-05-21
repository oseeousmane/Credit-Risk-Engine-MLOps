"""
Script de lancement rapide — entraîne le modèle PD et l'installe dans le moteur Python.

Usage:
  python run_training.py                    # LightGBM (rapide, ~3min)
  python run_training.py --model xgboost   # XGBoost PROD_CHAMPION (~8min)
"""
import sys, os, argparse, logging, shutil

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("run_training")

# Résoudre les imports relatifs
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["lightgbm", "xgboost"], default="lightgbm")
    args = parser.parse_args()

    logger.info(f"=== Démarrage entraînement PD Model [{args.model.upper()}] ===")
    logger.info(f"Root: {ROOT}")

    from train import run_training_pipeline

    results = run_training_pipeline(
        model_name="pd_model_v2",
        model_type=args.model,
        use_temporal_split=True,
    )

    meta = results["training_metadata"]
    model_path = results["model_path"]

    print(f"\n{'='*60}")
    print(f"  ENTRAÎNEMENT TERMINÉ — {meta['model_type']}")
    print(f"{'='*60}")
    print(f"  Data hash     : {meta.get('data_hash_sha256', 'N/A')}")
    print(f"  Split         : {meta.get('split_strategy', 'N/A')}")
    print(f"  Train samples : {meta.get('n_train_samples', 'N/A'):,}")
    print(f"  Features      : {meta.get('n_features', 'N/A')}")
    print(f"  Train AUC     : {meta['train_auc']:.4f}")
    print(f"  Val AUC       : {meta['val_auc']:.4f}")
    print(f"  Val Brier     : {meta['val_brier']:.4f}")
    print(f"  Calibré       : {meta.get('is_calibrated', False)}")

    if "test_metrics" in meta:
        t = meta["test_metrics"]
        gini_flag = "[OK]" if t.get("gini", 0) >= 0.45 else "[!] SOUS LE FLOOR 45%"
        print(f"\n  --- Validation Test ---")
        print(f"  Test AUC      : {t['auc']:.4f}")
        print(f"  Test Gini     : {t['gini']:.4f}  {gini_flag}")
        print(f"  Test KS       : {t['ks']:.4f}")
        print(f"  Brier score   : {t['brier']:.4f}")
        if "grade" in t:
            print(f"  Grade         : {t['grade']}")

    print(f"\n  Artefact      : {model_path}")

    # Top 10 features
    print(f"\n  Top 10 features (importance gain):")
    for i, f in enumerate(results["top_features"][:10], 1):
        bar = "█" * int(f.get("importance_normalized", 0) * 50)
        print(f"    {i:2d}. {f['feature']:<40} {bar}")

    print(f"\n{'='*60}")
    print(f"  Moteur Python chargera automatiquement l'artefact au prochain démarrage.")
    print(f"  Chemin attendu : 02_modeling/pd_model/artifacts/pd_model_v2.pkl")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
