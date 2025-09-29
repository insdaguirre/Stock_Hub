import os
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


def _get_s3_client():
    """Create an S3-compatible client using environment variables.

    Supported env vars:
    - S3_ENDPOINT (optional for R2/B2/MinIO); if empty, uses AWS default
    - S3_ACCESS_KEY_ID
    - S3_SECRET_ACCESS_KEY
    - S3_REGION (optional)
    """
    endpoint_url = os.getenv("S3_ENDPOINT") or None
    access_key = os.getenv("S3_ACCESS_KEY_ID")
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
    region = os.getenv("S3_REGION") or "us-east-1"

    session = boto3.session.Session()
    config = Config(s3={"addressing_style": "virtual"})
    client = session.client(
        "s3",
        region_name=region,
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=config,
    )
    return client


def _get_bucket_name() -> str:
    bucket = os.getenv("MODELS_BUCKET")
    if not bucket:
        raise RuntimeError("MODELS_BUCKET env var not set")
    return bucket


def build_model_key(symbol: str, model_name: str, version: str) -> str:
    symbol = symbol.upper()
    return f"models/{model_name}/{version}/{symbol}.bin"


def save_model_bytes(symbol: str, model_name: str, version: str, data: bytes) -> str:
    client = _get_s3_client()
    bucket = _get_bucket_name()
    key = build_model_key(symbol, model_name, version)
    try:
        client.put_object(Bucket=bucket, Key=key, Body=data, ContentType="application/octet-stream")
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"Failed to upload model to storage: {e}")
    return key


def load_model_bytes(symbol: str, model_name: str, version: str) -> Optional[bytes]:
    client = _get_s3_client()
    bucket = _get_bucket_name()
    key = build_model_key(symbol, model_name, version)
    try:
        obj = client.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()
    except client.exceptions.NoSuchKey:
        return None
    except (BotoCoreError, ClientError) as e:
        # Treat missing keys or access errors as None for callers; they can decide to train
        if isinstance(e, ClientError) and e.response.get("Error", {}).get("Code") == "NoSuchKey":
            return None
        raise RuntimeError(f"Failed to load model from storage: {e}")


def delete_model(symbol: str, model_name: str, version: str) -> None:
    client = _get_s3_client()
    bucket = _get_bucket_name()
    key = build_model_key(symbol, model_name, version)
    try:
        client.delete_object(Bucket=bucket, Key=key)
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"Failed to delete model from storage: {e}")


def storage_health() -> bool:
    """Lightweight health check by listing the bucket with max-keys=1.
    Returns True if reachable and authorized, else False.
    """
    try:
        client = _get_s3_client()
        bucket = _get_bucket_name()
        client.list_objects_v2(Bucket=bucket, MaxKeys=1)
        return True
    except Exception:
        return False


