import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (ctx, bucket) => {
    // Add any upload validation logic here
    // For now, allow all uploads
  },
  onUpload: async (ctx, bucket, key) => {
    // This callback runs after metadata sync
    // We'll handle database saving in the upload component
    console.log(`File uploaded: ${key} in bucket ${bucket}`);
  },
});
