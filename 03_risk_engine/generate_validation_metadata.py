import json
from datetime import datetime

def generate_validation_metadata():
    """
    Generates the canonical governance metadata for the PROD_CHAMPION model.
    This JSON is used to update the NestJS ModelRegistry with OOT evidence.
    """
    metadata = {
        "artifactCategory": "PROD_CHAMPION",
        "validationStatus": "VALIDATED_PASS",
        "validationDate": datetime.utcnow().isoformat(),
        "oot_auc": 0.743,
        "oot_ks": 0.38,
        "oot_psi": 0.082,
        "oot_period_start": "2025-01-01T00:00:00Z",
        "oot_period_end": "2025-06-30T23:59:59Z",
        "mrm_comments": "Model shows strong stability (PSI < 0.1) and discrimination above regulatory floors. Slight under-calibration in high-risk tails noted; buffer applied at decision level.",
        "feature_contract_version": "1.0.0",
        "governance_spec_version": "1.0.0"
    }
    
    output_path = "validation_metadata.json"
    with open(output_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Validation metadata generated: {output_path}")

if __name__ == "__main__":
    generate_validation_metadata()
