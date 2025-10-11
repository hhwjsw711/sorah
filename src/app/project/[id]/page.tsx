"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useQuery(api.tasks.getProject, { id: id as Id<"projects"> });

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
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              project.status === "completed" 
                ? "bg-green-100 text-green-700"
                : project.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700 animate-pulse"
            }`}>
              {project.status || "processing"}
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
                <p className="text-sm font-medium text-gray-700 mb-3">generated media</p>
                <div className="grid grid-cols-2 gap-3">
                  {project.audioUrl && (
                    <a 
                      href={project.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors text-center"
                    >
                      🎤 download voiceover
                    </a>
                  )}
                  {project.musicUrl && (
                    <a 
                      href={project.musicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors text-center"
                    >
                      🎵 download music
                    </a>
                  )}
                  {project.videoUrls?.map((url, i) => (
                    <a 
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-pink-100 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-200 transition-colors text-center"
                    >
                      🎬 download video {i + 1}
                    </a>
                  ))}
                </div>
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
