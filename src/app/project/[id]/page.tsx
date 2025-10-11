"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import type { Id } from "../../../../convex/_generated/dataModel";
import DisplayCards from "@/components/ui/display-cards";
import { FileImage, Video } from "lucide-react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useQuery(api.tasks.getProject, { id: id as Id<"projects"> });
  const renderVideo = useAction(api.render.renderVideo);
  const regenerateScript = useAction(api.tasks.regenerateScript);
  const regenerateVoiceover = useAction(api.tasks.regenerateVoiceover);
  const regenerateMusic = useAction(api.tasks.regenerateMusic);
  const regenerateAnimations = useAction(api.tasks.regenerateAnimations);
  const getSandboxInfo = useAction(api.render.getSandboxInfo);
  const [rendering, setRendering] = useState(false);
  const [regeneratingScript, setRegeneratingScript] = useState(false);
  const [regeneratingVoiceover, setRegeneratingVoiceover] = useState(false);
  const [regeneratingMusic, setRegeneratingMusic] = useState(false);
  const [regeneratingAnimations, setRegeneratingAnimations] = useState(false);
  const [sandboxInfo, setSandboxInfo] = useState<{ outDirectory?: string; diskUsage?: string; error?: string } | null>(null);
  const [loadingSandbox, setLoadingSandbox] = useState(false);

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
              {(project.status === "completed" || project.status === "failed" || project.status === "rendering") && (
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
                  {rendering ? "rendering..." : project.renderedVideoUrl ? "re-render" : project.status === "rendering" ? "restart render" : project.status === "failed" ? "retry render" : "render video"}
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
                <p className="text-sm font-medium text-gray-700 mb-6">uploaded files ({project.fileUrls.length})</p>
                <DisplayCards
                  cards={project.fileUrls.slice(0, 3).filter((url): url is string => url !== null).map((url, i) => ({
                    icon: <FileImage className="size-4 text-purple-300" />,
                    title: `image ${i + 1}`,
                    description: "ready for processing",
                    date: new Date(project.createdAt).toLocaleDateString(),
                    titleClassName: "text-purple-500",
                    mediaUrl: url,
                    mediaType: "image" as const,
                    className: i === 0 
                      ? "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                      : i === 1
                      ? "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                      : "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
                  }))}
                />
              </div>
            )}

            {(project.audioUrl || project.musicUrl || project.videoUrls) && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">media files for rendering</p>
                <p className="text-xs text-gray-500 mb-3">files that will be placed in public/media/</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {project.audioUrl && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-2xl mb-2">🎤</div>
                      <p className="text-xs font-medium text-purple-900">audio.mp3</p>
                      <p className="text-xs text-purple-600 mb-2">voiceover</p>
                      <audio controls className="w-full h-8">
                        <source src={project.audioUrl} type="audio/mp3" />
                      </audio>
                    </div>
                  )}
                  {project.musicUrl && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-2xl mb-2">🎵</div>
                      <p className="text-xs font-medium text-blue-900">music.mp3</p>
                      <p className="text-xs text-blue-600 mb-2">background</p>
                      <audio controls className="w-full h-8">
                        <source src={project.musicUrl} type="audio/mp3" />
                      </audio>
                    </div>
                  )}
                  {project.videoUrls?.map((url, i) => (
                    <div key={i} className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                      <div className="text-2xl mb-2">🎬</div>
                      <p className="text-xs font-medium text-pink-900">video{i}.mp4</p>
                      <p className="text-xs text-pink-600">animated</p>
                    </div>
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
                  {(project.script || project.status === "failed") && (
                    <button
                      onClick={async () => {
                        setRegeneratingScript(true);
                        try {
                          await regenerateScript({ projectId: id as Id<"projects"> });
                        } finally {
                          setRegeneratingScript(false);
                        }
                      }}
                      disabled={regeneratingScript}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      {regeneratingScript ? "..." : project.script ? "regenerate" : "start"}
                    </button>
                  )}
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
                  {(project.audioUrl || (project.script && project.status === "failed")) && (
                    <button
                      onClick={async () => {
                        setRegeneratingVoiceover(true);
                        try {
                          await regenerateVoiceover({ projectId: id as Id<"projects"> });
                        } finally {
                          setRegeneratingVoiceover(false);
                        }
                      }}
                      disabled={regeneratingVoiceover}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      {regeneratingVoiceover ? "..." : project.audioUrl ? "regenerate" : "start"}
                    </button>
                  )}
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
                  {(project.musicUrl || (project.audioUrl && project.status === "failed")) && (
                    <button
                      onClick={async () => {
                        setRegeneratingMusic(true);
                        try {
                          await regenerateMusic({ projectId: id as Id<"projects"> });
                        } finally {
                          setRegeneratingMusic(false);
                        }
                      }}
                      disabled={regeneratingMusic}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      {regeneratingMusic ? "..." : project.musicUrl ? "regenerate" : "start"}
                    </button>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  project.videoUrls && project.videoUrls.length > 0 ? "bg-green-50" : (project.musicUrl && project.status === "processing") ? "bg-yellow-50 animate-pulse" : "bg-gray-50"
                }`}>
                  <div className={`text-2xl ${project.videoUrls && project.videoUrls.length > 0 ? "opacity-100" : "opacity-30"}`}>
                    {project.videoUrls && project.videoUrls.length > 0 ? "✓" : (project.musicUrl && project.status === "processing") ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">5. animate images</p>
                    <p className="text-sm text-gray-600">generating 3-second videos from images using fal ai</p>
                  </div>
                  {((project.videoUrls && project.videoUrls.length > 0) || (project.musicUrl && project.status === "failed")) && project.status !== "processing" && (
                    <button
                      onClick={async () => {
                        setRegeneratingAnimations(true);
                        try {
                          await regenerateAnimations({ projectId: id as Id<"projects"> });
                        } finally {
                          setRegeneratingAnimations(false);
                        }
                      }}
                      disabled={regeneratingAnimations}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      {regeneratingAnimations ? "..." : (project.videoUrls && project.videoUrls.length > 0) ? "regenerate" : "start"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {project.script && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">generated script</p>
                  <button
                    onClick={async () => {
                      setRegeneratingScript(true);
                      try {
                        await regenerateScript({ projectId: id as Id<"projects"> });
                      } finally {
                        setRegeneratingScript(false);
                      }
                    }}
                    disabled={regeneratingScript}
                    className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {regeneratingScript ? "regenerating..." : "regenerate"}
                  </button>
                </div>
                <p className="text-gray-800 p-4 bg-gray-50 rounded-lg leading-relaxed">{project.script}</p>
              </div>
            )}

            {project.srtContent && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">subtitles (SRT)</p>
                <div className="p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{project.srtContent}</pre>
                </div>
              </div>
            )}

            {(project.audioUrl || project.musicUrl || project.videoUrls) && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-1">generated media</p>
                <p className="text-xs text-gray-500 mb-6">all ai-generated files ready to download</p>
                <DisplayCards
                  cards={[
                    ...(project.videoUrls?.slice(0, 3).map((url, i) => ({
                      icon: <Video className="size-4 text-pink-300" />,
                      title: `video ${i + 1}`,
                      description: "3-second animation",
                      date: "ai-generated",
                      titleClassName: "text-pink-500",
                      mediaUrl: url,
                      mediaType: "video" as const,
                      className: i === 0 
                        ? "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                        : i === 1
                        ? "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                        : "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
                    })) || []),
                  ]}
                />
              </div>
            )}

            {project.status === "rendering" && project.renderProgress && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">render progress</h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl animate-spin">⚙️</div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">{project.renderProgress.step}</p>
                      {project.renderProgress.details && (
                        <p className="text-sm text-blue-700">{project.renderProgress.details}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    last updated: {new Date(project.renderProgress.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {project.sandboxId && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">sandbox info</p>
                  <button
                    onClick={async () => {
                      setLoadingSandbox(true);
                      try {
                        const result = await getSandboxInfo({ sandboxId: project.sandboxId! });
                        setSandboxInfo(result as { outDirectory?: string; diskUsage?: string; error?: string });
                      } finally {
                        setLoadingSandbox(false);
                      }
                    }}
                    disabled={loadingSandbox}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {loadingSandbox ? "loading..." : "refresh"}
                  </button>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-2">
                  <p className="font-mono text-xs text-gray-600">id: {project.sandboxId}</p>
                  {sandboxInfo && !sandboxInfo.error && (
                    <>
                      {sandboxInfo.outDirectory && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">out/ directory:</p>
                          <pre className="bg-white p-2 rounded border border-gray-300 text-xs overflow-x-auto">{sandboxInfo.outDirectory}</pre>
                        </div>
                      )}
                      {sandboxInfo.diskUsage && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">disk usage:</p>
                          <pre className="bg-white p-2 rounded border border-gray-300 text-xs overflow-x-auto">{sandboxInfo.diskUsage}</pre>
                        </div>
                      )}
                    </>
                  )}
                  {sandboxInfo?.error && (
                    <p className="text-red-600 text-xs">{sandboxInfo.error}</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">output files (out/)</p>
              {project.renderedVideoUrl ? (
                <>
                  <p className="text-xs text-gray-500 mb-3">rendered video ready</p>
                  <a 
                    href={project.renderedVideoUrl}
                    download
                    className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 text-purple-800 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    <span className="text-2xl">🎥</span>
                    <div className="flex-1 text-left">
                      <div className="font-bold">Main.mp4</div>
                      <div className="text-xs text-purple-600">final rendered video from remotion</div>
                    </div>
                    <span className="text-xs">⬇</span>
                  </a>
                </>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm text-gray-600">not rendered yet</p>
                  <p className="text-xs text-gray-500 mt-1">click render button to generate video</p>
                </div>
              )}
            </div>

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
