import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  claimFiles: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "4MB", maxFileCount: 5 },
  })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata?.userId);
      console.log("file url", file.url);
      return { uploadedBy: metadata?.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

