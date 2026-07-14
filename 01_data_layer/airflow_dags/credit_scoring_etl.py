"""
Airflow DAG: Credit Scoring ETL Pipeline
==========================================
Ce DAG orchestre le flux de traitement de la donnée (Data Engineering).
Il tourne quotidiennement pour préparer les features des clients et
les pousser dans le Feature Store basse latence (Redis).

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

from datetime import datetime, timedelta
import logging

try:
    from airflow import DAG
    from airflow.operators.python import PythonOperator
    from airflow.operators.bash import BashOperator
    from airflow.utils.dates import days_ago
except ImportError:
    # Fallback for static validation if Airflow is not installed locally
    from unittest.mock import MagicMock
    DAG = MagicMock()
    PythonOperator = MagicMock()
    BashOperator = MagicMock()
    days_ago = lambda x: datetime.now()

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'data_engineering_team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'credit_scoring_daily_etl',
    default_args=default_args,
    description='Pipeline ETL quotidien pour le moteur de risque (CEMAC)',
    schedule_interval='0 2 * * *', # Exécution à 2h00 du matin tous les jours
    start_date=days_ago(1),
    catchup=False,
    tags=['credit_risk', 'feature_store'],
) as dag:

    def log_start():
        logger.info("Début du pipeline ETL de Credit Scoring.")

    start_task = PythonOperator(
        task_id='start_pipeline',
        python_callable=log_start
    )

    # 1. Ingestion des données brutes (Core Banking, Bureaux de crédit, ERP)
    ingest_raw_data = BashOperator(
        task_id='ingest_raw_data',
        bash_command='python /app/01_data_layer/data_ingestion.py --mode daily_batch'
    )

    # 2. Data Quality Checks (Golden rules, Nulls, Ranges)
    data_quality_gate = BashOperator(
        task_id='data_quality_checks',
        bash_command='python /app/01_data_layer/data_quality_checks/run_checks.py --strict'
    )

    # 3. Feature Engineering (Calcul des 157 variables du modèle)
    feature_engineering = BashOperator(
        task_id='feature_engineering',
        bash_command='python /app/01_data_layer/feature_store/feature_engineering.py'
    )

    # 4. Push vers le Feature Store (Redis) pour latence < 10ms en production
    push_to_feature_store = BashOperator(
        task_id='push_to_redis_feature_store',
        bash_command='python /app/01_data_layer/feature_store/client.py --action push_batch'
    )
    
    # 5. Détection de Data Drift (Comparaison avec les distributions d'entraînement)
    detect_data_drift = BashOperator(
        task_id='detect_data_drift',
        bash_command='python /app/06_monitoring/drift_detector.py --alert_threshold 0.20'
    )

    # ── Définition des dépendances (Graphe d'exécution) ──
    start_task >> ingest_raw_data >> data_quality_gate >> feature_engineering >> push_to_feature_store >> detect_data_drift
