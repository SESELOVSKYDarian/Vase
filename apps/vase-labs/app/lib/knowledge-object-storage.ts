import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function configuration() {
  const bucket = process.env.KNOWLEDGE_S3_BUCKET?.trim();
  const endpoint = process.env.KNOWLEDGE_S3_ENDPOINT?.trim();
  const region = process.env.KNOWLEDGE_S3_REGION?.trim() || "auto";
  if (!bucket || !endpoint) throw new Error("KNOWLEDGE_STORAGE_NOT_CONFIGURED");
  return { bucket, client: new S3Client({ region, endpoint, forcePathStyle: true, credentials: {
    accessKeyId: process.env.KNOWLEDGE_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.KNOWLEDGE_S3_SECRET_ACCESS_KEY ?? "",
  } }) };
}

export async function createKnowledgeUploadUrl(key: string, contentType: string) {
  const { client, bucket } = configuration();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 600 });
}

export async function downloadKnowledgeObject(key: string) {
  const { client, bucket } = configuration();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("KNOWLEDGE_FILE_MISSING");
  return Buffer.from(await response.Body.transformToByteArray());
}
