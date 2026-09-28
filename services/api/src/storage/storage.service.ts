import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Readable } from 'stream';

export interface StoredObject {
  key: string;
  bucket: string;
  etag?: string;
  versionId?: string;
  size?: number;
  contentType?: string;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/octet-stream',
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const PRESIGN_TTL_SEC = 900;

/** Real MinIO/S3 storage — clients only receive signed URLs + opaque keys, never permanent raw paths. */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly log = new Logger(StorageService.name);
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: this.config.get('S3_REGION') || 'us-east-1',
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.config.get('S3_SECRET_KEY') || 'minioadmin',
      },
    });
  }

  get bucket() {
    return this.config.get('S3_BUCKET') || 'bhairava';
  }

  get endpoint() {
    return this.config.get('S3_ENDPOINT') || 'http://localhost:9000';
  }

  async onModuleInit() {
    try {
      await this.ensureBucket();
      this.log.log(`MinIO/S3 bucket ready: ${this.bucket} @ ${this.endpoint}`);
    } catch (err) {
      this.log.warn(`MinIO bucket ensure failed (storage calls may fail): ${(err as Error).message}`);
    }
  }

  buildKey(orgId: string, folder: string, filename: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${orgId}/${folder}/${randomUUID()}-${safe}`;
  }

  validateUploadMeta(mimeType: string | undefined, sizeBytes: number | undefined) {
    const mime = mimeType || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`MIME type not allowed: ${mime}`);
    }
    if (sizeBytes != null && (sizeBytes < 0 || sizeBytes > MAX_UPLOAD_BYTES)) {
      throw new BadRequestException(`File size must be 0..${MAX_UPLOAD_BYTES} bytes`);
    }
    return { mime, maxBytes: MAX_UPLOAD_BYTES };
  }

  async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch {
      // create if missing
    }
    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
  }

  async getUploadUrl(key: string, contentType: string, sizeBytes?: number) {
    this.validateUploadMeta(contentType, sizeBytes);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: PRESIGN_TTL_SEC });
    return {
      uploadUrl,
      key,
      method: 'PUT' as const,
      headers: { 'Content-Type': contentType },
      expiresInSec: PRESIGN_TTL_SEC,
    };
  }

  async getDownloadUrl(key: string) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const downloadUrl = await getSignedUrl(this.client, cmd, { expiresIn: PRESIGN_TTL_SEC });
    return {
      downloadUrl,
      key,
      expiresInSec: PRESIGN_TTL_SEC,
    };
  }

  async putObject(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<StoredObject> {
    const buf = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
    this.validateUploadMeta(contentType, buf.byteLength);
    const res = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
      }),
    );
    return { key, bucket: this.bucket, etag: res.ETag, versionId: res.VersionId };
  }

  async headObject(key: string) {
    const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      key,
      bucket: this.bucket,
      etag: res.ETag,
      size: res.ContentLength,
      contentType: res.ContentType,
      versionId: res.VersionId,
    };
  }

  async getObjectBuffer(key: string): Promise<{ body: Buffer; contentType?: string }> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return { body: Buffer.concat(chunks), contentType: res.ContentType };
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  contentHash(buf: Buffer) {
    return createHash('sha256').update(buf).digest('hex');
  }
}