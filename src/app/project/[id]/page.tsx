"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";
import DisplayCards from "@/components/ui/display-cards";
import { FileImage, Video, ChevronDown, ChevronUp } from "lucide-react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useQuery(api.tasks.getProject, { id: id as Id<"projects"> });
  const createSequence = useAction(api.render.createSequence);
  const renderFinalVideo = useAction(api.render.renderFinalVideo);
  const regenerateScript = useAction(api.tasks.regenerateScript);
  const regenerateVoiceover = useAction(api.tasks.regenerateVoiceover);
  const regenerateMusic = useAction(api.tasks.regenerateMusic);
  const regenerateAnimations = useAction(api.tasks.regenerateAnimations);
  const getSandboxFileDownloadUrl = useAction(api.render.getSandboxFileDownloadUrl);
  
  const [creatingSequence, setCreatingSequence] = useState(false);
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [regeneratingScript, setRegeneratingScript] = useState(false);
  const [regeneratingVoiceover, setRegeneratingVoiceover] = useState(false);
  const [regeneratingMusic, setRegeneratingMusic] = useState(false);
  const [regeneratingAnimations, setRegeneratingAnimations] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const handleCreateSequence = async () => {
    setCreatingSequence(true);
    try {
      await createSequence({ projectId: id as Id<"projects"> });
    } finally {
      setCreatingSequence(false);
    }
  };

  const handleRenderVideo = async () => {
    setRenderingVideo(true);
    try {
      await renderFinalVideo({ projectId: id as Id<"projects"> });
    } finally {
      setRenderingVideo(false);
    }
  };

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

  const inputsReady = project.audioUrl && project.musicUrl && project.videoUrls && project.videoUrls.length > 0;
  const renderStep = project.renderStep || "not_started";
  const sandboxAlive = project.sandboxStatus === "alive";

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
          ← back to home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {project.prompt}
            </h1>
            <div className="flex items-center gap-3">
              {inputsReady && renderStep === "not_started" && (
                <button
                  onClick={handleCreateSequence}
                  disabled={creatingSequence}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {creatingSequence ? "creating..." : "render"}
                </button>
              )}
              {renderStep === "editing_sequence" && !sandboxAlive && (
                <button
                  onClick={handleCreateSequence}
                  disabled={creatingSequence}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {creatingSequence ? "recreating..." : "re-create sandbox"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">created</p>
              <p className="text-gray-600 text-sm">{new Date(project.createdAt).toLocaleString()}</p>
            </div>

            {project.fileUrls && project.fileUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-6">source images</p>
                <DisplayCards
                  cards={project.fileUrls.slice(0, 3).filter((url): url is string => url !== null).map((url, i) => ({
                    icon: <FileImage className="size-4 text-purple-300" />,
                    title: `image ${i + 1}`,
                    description: "source material",
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

            <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">input generation</h2>
              
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${project.script ? "bg-green-50" : project.status === "processing" ? "bg-yellow-50 animate-pulse" : "bg-gray-50"}`}>
                  <div className={`text-2xl ${project.script ? "opacity-100" : "opacity-30"}`}>
                    {project.script ? "✓" : project.status === "processing" ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">1. script</p>
                    <p className="text-sm text-gray-600">15-second social media script</p>
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
                      {regeneratingScript ? "..." : "regenerate"}
                    </button>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${project.audioUrl ? "bg-green-50" : project.script ? "bg-yellow-50 animate-pulse" : "bg-gray-50"}`}>
                  <div className={`text-2xl ${project.audioUrl ? "opacity-100" : "opacity-30"}`}>
                    {project.audioUrl ? "✓" : project.script ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">2. voiceover</p>
                    <p className="text-sm text-gray-600">elevenlabs text-to-speech</p>
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
                      {regeneratingVoiceover ? "..." : "regenerate"}
                    </button>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${project.musicUrl ? "bg-green-50" : project.audioUrl ? "bg-yellow-50 animate-pulse" : "bg-gray-50"}`}>
                  <div className={`text-2xl ${project.musicUrl ? "opacity-100" : "opacity-30"}`}>
                    {project.musicUrl ? "✓" : project.audioUrl ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">3. background music</p>
                    <p className="text-sm text-gray-600">matching audio track</p>
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
                      {regeneratingMusic ? "..." : "regenerate"}
                    </button>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg ${project.videoUrls && project.videoUrls.length > 0 ? "bg-green-50" : (project.musicUrl && project.status === "processing") ? "bg-yellow-50 animate-pulse" : "bg-gray-50"}`}>
                  <div className={`text-2xl ${project.videoUrls && project.videoUrls.length > 0 ? "opacity-100" : "opacity-30"}`}>
                    {project.videoUrls && project.videoUrls.length > 0 ? "✓" : (project.musicUrl && project.status === "processing") ? "⏳" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">4. animated videos</p>
                    <p className="text-sm text-gray-600">fal ai image-to-video</p>
                  </div>
                  {((project.videoUrls && project.videoUrls.length > 0) || project.musicUrl) && project.status !== "processing" && (
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

            {inputsReady && (
              <>
                <div className="border-t pt-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">render process</h2>
                  
                  {renderStep === "not_started" && (
                    <div className="p-6 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-600 mb-4">ready to create your video</p>
                      <button
                        onClick={handleCreateSequence}
                        disabled={creatingSequence}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {creatingSequence ? "starting..." : "start render"}
                      </button>
                    </div>
                  )}

                  {(renderStep === "creating_sandbox" || renderStep === "uploading_media" || renderStep === "editing_sequence") && (
                    <div className="space-y-3">
                      {!sandboxAlive && renderStep === "editing_sequence" && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 font-medium mb-2">⚠️ sandbox died</p>
                          <p className="text-sm text-red-600 mb-3">the sandbox environment is no longer available</p>
                          <button
                            onClick={handleCreateSequence}
                            disabled={creatingSequence}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {creatingSequence ? "recreating..." : "re-create sandbox"}
                          </button>
                        </div>
                      )}
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl animate-spin">⚙️</div>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900">
                              {renderStep === "creating_sandbox" && "creating sandbox environment..."}
                              {renderStep === "uploading_media" && "uploading media files..."}
                              {renderStep === "editing_sequence" && "claude is editing video sequence..."}
                            </p>
                            {project.renderProgress?.details && (
                              <p className="text-sm text-blue-700">{project.renderProgress.details}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {renderStep === "editing_sequence" && sandboxAlive && (
                        <button
                          onClick={handleRenderVideo}
                          disabled={renderingVideo}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {renderingVideo ? "rendering..." : "render video (skip wait)"}
                        </button>
                      )}
                    </div>
                  )}

                  {renderStep === "rendering_video" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl animate-spin">🎬</div>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">rendering final video...</p>
                          <p className="text-sm text-blue-700">running remotion render</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {renderStep === "completed" && project.renderedVideoUrl && (
                    <div className="space-y-4">
                      <div className="p-6 bg-green-50 rounded-lg text-center border border-green-200">
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-green-800 font-medium text-lg mb-4">render complete!</p>
                        <video
                          controls
                          className="w-full max-w-md mx-auto rounded-lg shadow-lg mb-4"
                          src={project.renderedVideoUrl}
                        />
                        <a 
                          href={project.renderedVideoUrl}
                          download="main.mp4"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          <span>⬇</span>
                          download main.mp4
                        </a>
                      </div>
                    </div>
                  )}

                  {renderStep === "failed" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 font-medium mb-2">render failed</p>
                      <p className="text-sm text-red-600 mb-3">{project.renderError || "unknown error"}</p>
                      <button
                        onClick={handleRenderVideo}
                        disabled={renderingVideo}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {renderingVideo ? "retrying..." : "retry render"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {project.script && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">generated script</p>
                <p className="text-gray-800 p-4 bg-gray-50 rounded-lg leading-relaxed">{project.script}</p>
              </div>
            )}

            {(project.audioUrl || project.musicUrl || project.videoUrls) && (
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-1">generated media</p>
                <p className="text-xs text-gray-500 mb-6">ai-generated assets</p>
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

            <div className="border-t pt-6">
              <button
                onClick={() => setDebugOpen(!debugOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="font-medium text-gray-700">debug info</span>
                {debugOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
              </button>
              
              {debugOpen && (
                <div className="mt-4 space-y-4">
                  {project.sandboxId && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">sandbox</p>
                      <p className="font-mono text-xs text-gray-600 mb-2">id: {project.sandboxId}</p>
                      <p className="text-xs text-gray-600">
                        status: <span className={sandboxAlive ? "text-green-600" : "text-red-600"}>
                          {sandboxAlive ? "alive" : "dead"}
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {project.error && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-700 mb-2">error log</p>
                      <p className="text-xs text-red-600">{project.error}</p>
                    </div>
                  )}

                  {project.renderError && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-700 mb-2">render error</p>
                      <p className="text-xs text-red-600">{project.renderError}</p>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">render step</p>
                    <p className="text-xs text-gray-600">{renderStep}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
