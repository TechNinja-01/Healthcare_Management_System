"""
S3-compatible (MinIO) object storage helper for consultation recordings.

Recordings are uploaded straight from the browser to MinIO using presigned
multipart URLs, so recording bytes never pass through this backend — the
server only brokers the presigned URLs and tracks metadata in Postgres.
"""

from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config.settings import settings


class StorageNotConfigured(RuntimeError):
    """Raised when MinIO credentials are missing."""


@lru_cache(maxsize=1)
def get_s3_client():
    if not settings.MINIO_ENDPOINT or not settings.MINIO_ACCESS_KEY:
        raise StorageNotConfigured(
            "MinIO is not configured. Set MINIO_ENDPOINT / "
            "MINIO_ACCESS_KEY / MINIO_SECRET_KEY."
        )

    scheme = "https" if settings.MINIO_SECURE else "http"
    endpoint_url = f"{scheme}://{settings.MINIO_ENDPOINT}"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def ensure_bucket() -> None:
    client = get_s3_client()
    bucket = settings.MINIO_BUCKET
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)


def create_multipart_upload(
    key: str,
    content_type: str = "video/webm",
) -> str:
    client = get_s3_client()
    ensure_bucket()
    response = client.create_multipart_upload(
        Bucket=settings.MINIO_BUCKET,
        Key=key,
        ContentType=content_type,
    )
    return response["UploadId"]


def presign_upload_part(
    key: str,
    upload_id: str,
    part_number: int,
    expires: int | None = None,
) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "upload_part",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": key,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        ExpiresIn=expires or settings.RECORDING_URL_TTL_SECONDS,
    )


def complete_multipart_upload(
    key: str,
    upload_id: str,
    parts: list[dict],
) -> None:
    """`parts` is a list of {"PartNumber": int, "ETag": str}."""
    client = get_s3_client()
    ordered = sorted(parts, key=lambda p: p["PartNumber"])
    client.complete_multipart_upload(
        Bucket=settings.MINIO_BUCKET,
        Key=key,
        UploadId=upload_id,
        MultipartUpload={"Parts": ordered},
    )


def abort_multipart_upload(key: str, upload_id: str) -> None:
    client = get_s3_client()
    try:
        client.abort_multipart_upload(
            Bucket=settings.MINIO_BUCKET,
            Key=key,
            UploadId=upload_id,
        )
    except ClientError:
        pass


def presign_get(key: str, expires: int | None = None) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.MINIO_BUCKET, "Key": key},
        ExpiresIn=expires or settings.RECORDING_URL_TTL_SECONDS,
    )
