import pandas as pd
import numpy as np
import os

def generate_mock_home_credit(num_records=1000, output_dir="raw"):
    """
    Generate a mock dataset mirroring the Kaggle Home Credit Default Risk structure.
    Used for testing the pipeline when the real dataset is not immediately available.
    """
    np.random.seed(42)
    
    # Base columns
    sk_id_curr = np.arange(100000, 100000 + num_records)
    
    # target (imbalanced, roughly 8% default rate)
    target = np.random.choice([0, 1], size=num_records, p=[0.92, 0.08])
    
    # Feature generation with some minimal logic to ensure model has something to learn
    amt_income_total = np.random.lognormal(mean=11.5, sigma=0.5, size=num_records)
    amt_credit = amt_income_total * np.random.uniform(1.5, 5.0, size=num_records)
    amt_annuity = amt_credit * np.random.uniform(0.05, 0.10, size=num_records)
    
    # Add negative correlation between income and target
    prob_target_high_income = np.where(amt_income_total > np.median(amt_income_total), 0.04, 0.12)
    target = np.array([np.random.choice([0, 1], p=[1-p, p]) for p in prob_target_high_income])
    
    # Days birth (negative values, age between 20 and 70)
    days_birth = -np.random.randint(20 * 365, 70 * 365, size=num_records)
    
    # Days employed
    days_employed = -np.random.randint(0, 40 * 365, size=num_records)
    # Some anomalies (365243)
    anomaly_idx = np.random.choice(num_records, size=int(num_records * 0.18), replace=False)
    days_employed[anomaly_idx] = 365243
    
    # Categorical
    code_gender = np.random.choice(['M', 'F', 'XNA'], size=num_records, p=[0.34, 0.65, 0.01])
    flag_own_car = np.random.choice(['Y', 'N'], size=num_records, p=[0.34, 0.66])
    flag_own_realty = np.random.choice(['Y', 'N'], size=num_records, p=[0.69, 0.31])
    name_education_type = np.random.choice(
        ['Secondary / secondary special', 'Higher education', 'Incomplete higher', 'Lower secondary', 'Academic degree'], 
        size=num_records, p=[0.71, 0.24, 0.03, 0.01, 0.01]
    )
    
    ext_source_1 = np.random.uniform(0, 1, size=num_records)
    ext_source_2 = np.random.uniform(0, 1, size=num_records)
    ext_source_3 = np.random.uniform(0, 1, size=num_records)
    
    # Correlate EXT_SOURCE with target
    ext_source_2[target == 1] *= 0.8  # Defaulters have slightly lower scores
    ext_source_3[target == 1] *= 0.8
    
    df = pd.DataFrame({
        'SK_ID_CURR': sk_id_curr,
        'TARGET': target,
        'NAME_CONTRACT_TYPE': np.random.choice(['Cash loans', 'Revolving loans'], size=num_records, p=[0.9, 0.1]),
        'CODE_GENDER': code_gender,
        'FLAG_OWN_CAR': flag_own_car,
        'FLAG_OWN_REALTY': flag_own_realty,
        'CNT_CHILDREN': np.random.poisson(0.5, size=num_records),
        'AMT_INCOME_TOTAL': amt_income_total,
        'AMT_CREDIT': amt_credit,
        'AMT_ANNUITY': amt_annuity,
        'AMT_GOODS_PRICE': amt_credit * 0.9,
        'NAME_INCOME_TYPE': np.random.choice(['Working', 'Commercial associate', 'Pensioner', 'State servant'], size=num_records),
        'NAME_EDUCATION_TYPE': name_education_type,
        'DAYS_BIRTH': days_birth,
        'DAYS_EMPLOYED': days_employed,
        'EXT_SOURCE_1': ext_source_1,
        'EXT_SOURCE_2': ext_source_2,
        'EXT_SOURCE_3': ext_source_3,
    })
    
    # Introduce some missing values
    df.loc[np.random.choice(df.index, size=int(num_records*0.1)), 'EXT_SOURCE_1'] = np.nan
    df.loc[np.random.choice(df.index, size=int(num_records*0.05)), 'AMT_ANNUITY'] = np.nan
    
    # Save to raw
    output_path = os.path.join(os.path.dirname(__file__), output_dir)
    os.makedirs(output_path, exist_ok=True)
    file_path = os.path.join(output_path, 'application_train.csv')
    df.to_csv(file_path, index=False)
    print(f"Generated mock dataset with {num_records} rows at {file_path}")
    return df

if __name__ == "__main__":
    generate_mock_home_credit(25000)
