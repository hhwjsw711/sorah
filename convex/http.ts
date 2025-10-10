import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    
    const fileIds = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && typeof value !== "string") {
        const file = value as File;
        const blob = await file.arrayBuffer();
        const storageId = await ctx.storage.store(new Blob([blob]));
        fileIds.push(storageId);
      }
    }

    const projectId = await ctx.runMutation(api.tasks.createProject, {
      prompt,
      files: fileIds,
    });

    return new Response(JSON.stringify({ projectId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
