"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useQuery(api.tasks.getProject, { id: id as Id<"projects"> });
  const renderVideo = useAction(api.render.renderVideo);
  const [rendering, setRendering] = useState(false);

  if (!project) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-600">loading project...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
          ← back to home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              project status
            </h1>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                project.status === "completed" 
                  ? "bg-green-100 text-green-700"
                  : project.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : project.status === "rendering"
                  ? "bg-blue-100 text-blue-700 animate-pulse"
                  : "bg-yellow-100 text-yellow-700 animate-pulse"
              }`}>
                {project.status || "processing"}
              </div>
              {(project.status === "completed" || project.status === "failed") && !project.renderedVideoUrl && (
                <button
                  onClick={async () => {
                    setRendering(true);
                    try {
                      await renderVideo({ projectId: id as Id<"projects"> });
                    } catch (error) {
                      console.error("render error:", error);
                    } finally {
                      setRendering(false);
                    }
                  }}
                  disabled={rendering}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {rendering ? "rendering..." : project.status === "failed" ? "retry render" : "render video"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">prompt</p>
              <p className="text-gray-800 p-4 bg-gray-50 rounded-lg">{project.prompt}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">created</p>
              <p className="text-gray-600 text-sm">{new Date(project.createdAt).toLocaleString()}</p>
            </div>

            {project.fileUrls && project.fileUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">uploaded files ({project.fileUrls.length})</p>
                <div className="grid grid-cols-4 gap-3">
                  {project.fileUrls.map((url, i) => (
                    url && (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        <Image
                          src={url}
                          alt={`file ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">processing stages</h2>
              
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.status ? "bg-green-50" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.status ? "opacity-100" : "opacity-30"}`}>
                    {project.status ? "✓" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">1. upload files</p>
                    <p className="text-sm text-gray-600">files uploaded and stored</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.script ? "bg-green-50" : project.status === "processing" ? "bg-yellow-50 animate-pulse" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.script ? "opacity-100" : "opacity-30"}`}>
                    {project.script ? "✓" : project.status === "processing" ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">2. generate script</p>
                    <p className="text-sm text-gray-600">creating 15-second social media script</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.audioUrl ? "bg-green-50" : project.script ? "bg-yellow-50 animate-pulse" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.audioUrl ? "opacity-100" : "opacity-30"}`}>
                    {project.audioUrl ? "✓" : project.script ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">3. generate voiceover</p>
                    <p className="text-sm text-gray-600">converting script to speech with elevenlabs</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.musicUrl ? "bg-green-50" : project.audioUrl ? "bg-yellow-50 animate-pulse" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.musicUrl ? "opacity-100" : "opacity-30"}`}>
                    {project.musicUrl ? "✓" : project.audioUrl ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">4. generate background music</p>
                    <p className="text-sm text-gray-600">creating matching background track</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.videoUrls && project.videoUrls.length > 0 ? "bg-green-50" : project.musicUrl ? "bg-yellow-50 animate-pulse" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.videoUrls && project.videoUrls.length > 0 ? "opacity-100" : "opacity-30"}`}>
                    {project.videoUrls && project.videoUrls.length > 0 ? "✓" : project.musicUrl ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">5. animate images</p>
                    <p className="text-sm text-gray-600">generating 3-second videos from images using fal ai</p>
                  </div>
                </div>
              </div>
            </div>

            {project.script && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">generated script</p>
                <p className="text-gray-800 p-4 bg-gray-50 rounded-lg leading-relaxed">{project.script}</p>
              </div>
            )}

            {(project.audioUrl || project.musicUrl || project.videoUrls) && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-1">download media</p>
                <p className="text-xs text-gray-500 mb-3">all generated files ready to download</p>
                <div className="space-y-2">
                  {project.audioUrl && (
                    <a 
                      href={project.audioUrl}
                      download
                      className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                    >
                      <span className="text-xl">🎤</span>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">voiceover audio</div>
                        <div className="text-xs text-purple-600">professional narration from script</div>
                      </div>
                      <span className="text-xs">⬇</span>
                    </a>
                  )}
                  {project.musicUrl && (
                    <a 
                      href={project.musicUrl}
                      download
                      className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-xl">🎵</span>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">background music</div>
                        <div className="text-xs text-blue-600">ai-generated track matching voiceover length</div>
                      </div>
                      <span className="text-xs">⬇</span>
                    </a>
                  )}
                  {project.videoUrls?.map((url, i) => (
                    <a 
                      key={i}
                      href={url}
                      download
                      className="flex items-center gap-3 px-4 py-3 bg-pink-50 border border-pink-200 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-100 transition-colors"
                    >
                      <span className="text-xl">🎬</span>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">animated video {i + 1}</div>
                        <div className="text-xs text-pink-600">3-second animation from uploaded image</div>
                      </div>
                      <span className="text-xs">⬇</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {project.renderedVideoUrl && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-1">final rendered video</p>
                <p className="text-xs text-gray-500 mb-3">complete video ready to use</p>
                <a 
                  href={project.renderedVideoUrl}
                  download
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 text-purple-800 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <span className="text-2xl">🎥</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold">final rendered video</div>
                    <div className="text-xs text-purple-600">complete video with all effects and transitions</div>
                  </div>
                  <span className="text-xs">⬇</span>
                </a>
              </div>
            )}

            {project.error && (
              <div className="border-t pt-6">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">error occurred</p>
                  <p className="text-sm text-red-600">{project.error}</p>
                </div>
              </div>
            )}

            {project.status === "completed" && (
              <div className="border-t pt-6">
                <div className="p-6 bg-green-50 rounded-lg text-center border border-green-200">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-green-800 font-medium text-lg">project completed!</p>
                  <p className="text-sm text-green-600 mt-1">all media files are ready to download</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
