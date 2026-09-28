# MinIO / S3 object backup notes

- Local MinIO volume: Docker volume `bhairava_minio` (see `infrastructure/docker-compose.yml`).
- For volume snapshot: stop MinIO briefly or use `mc mirror` to a second bucket/prefix.
- Example (when `mc` configured):

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mirror --overwrite local/bhairava ./backups/minio_bhairava_$(date +%Y%m%d)
```

- Production S3: enable bucket versioning + cross-region replication; use AWS Backup or lifecycle policies.
- Document storage keys are org-scoped paths from `StorageService.buildKey`.
