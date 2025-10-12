"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";
import DisplayCards from "@/components/ui/display-cards";
import { Video } from "lucide-react";
import MediaFileCard from "@/components/MediaFileCard";
import Tabs from "@/components/Tabs";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useQuery(api.tasks.getProject, { id: id as Id<"projects"> });
  const renderVideo = useAction(api.render.renderVideo);
  const regenerateScript = useAction(api.tasks.regenerateScript);
  const updateProjectScript = useMutation(api.tasks.updateProjectScript);
  const regenerateVoiceover = useAction(api.tasks.regenerateVoiceover);
  const regenerateMusic = useAction(api.tasks.regenerateMusic);
  const regenerateAnimations = useAction(api.tasks.regenerateAnimations);
  const generateUploadUrl = useMutation(api.tasks.generateUploadUrl);
  const addFilesToProject = useMutation(api.tasks.addFilesToProject);
  const getSandboxInfo = useAction(api.render.getSandboxInfo);
  const createSequence = useAction(api.render.createSequence);
  const renderFinalVideo = useAction(api.render.renderFinalVideo);
  const step1StartSandbox = useAction(api.render.step1StartSandbox);
  const step2UploadFiles = useAction(api.render.step2UploadFiles);
  const step3RunVideoEditor = useAction(api.render.step3RunVideoEditor);
  const step4RenderSequence = useAction(api.render.step4RenderSequence);
  const updateRenderStep = useMutation(api.tasks.updateRenderStep);
  const getPipelineStatus = useAction(api.render.getPipelineStatus);
  const animateImage = useAction(api.aiServices.animateImage);
  const runSandboxCommand = useAction(api.render.runSandboxCommand);
  const listSandboxFiles = useAction(api.render.listSandboxFiles);
  const readSandboxFile = useAction(api.render.readSandboxFile);
  const getSandboxFileDownloadUrl = useAction(api.render.getSandboxFileDownloadUrl);
  const downloadSandboxFolder = useAction(api.render.downloadSandboxFolder);
  const [rendering, setRendering] = useState(false);
  const [regeneratingScript, setRegeneratingScript] = useState(false);
  const [regeneratingVoiceover, setRegeneratingVoiceover] = useState(false);
  const [regeneratingMusic, setRegeneratingMusic] = useState(false);
  const [regeneratingAnimations, setRegeneratingAnimations] = useState(false);
  const [sandboxInfo, setSandboxInfo] = useState<{ outDirectory?: string; diskUsage?: string; error?: string } | null>(null);
  const [loadingSandbox, setLoadingSandbox] = useState(false);
  const [command, setCommand] = useState("");
  const [commandOutput, setCommandOutput] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);
  const [runningCommand, setRunningCommand] = useState(false);
  const [outFiles, setOutFiles] = useState<{ name: string; path: string; isDir: boolean }[]>([]);
  const [mediaFiles, setMediaFiles] = useState<{ name: string; path: string; isDir: boolean }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string; isText: boolean } | null>(null);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [saveScriptError, setSaveScriptError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [creatingSequence, setCreatingSequence] = useState(false);
  const [renderingFinal, setRenderingFinal] = useState(false);
  const [step1Running, setStep1Running] = useState(false);
  const [step2Running, setStep2Running] = useState(false);
  const [step3Running, setStep3Running] = useState(false);
  const [step4Running, setStep4Running] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<{
    sandboxExists: boolean;
    sandboxAlive: boolean;
    mediaUploaded: boolean;
    sequenceCreated: boolean;
    videoRendered: boolean;
  } | null>(null);
  const [animatingImageUrl, setAnimatingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isEditingScript) return;
    setScriptDraft(project?.script ?? "");
  }, [project?.script, isEditingScript]);

  const handleSaveScript = async () => {
    if (!project?._id) return;
    if (!scriptDraft.trim()) {
      setSaveScriptError("script cannot be empty");
      return;
    }

    setSavingScript(true);
    setSaveScriptError(null);
    try {
      await updateProjectScript({ id: project._id as Id<"projects">, script: scriptDraft });
      setIsEditingScript(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to save script";
      setSaveScriptError(message);
    } finally {
      setSavingScript(false);
    }
  };

  const loadFiles = async () => {
    if (!project?.sandboxId) return;
    
    setLoadingFiles(true);
    try {
      const [outResult, mediaResult] = await Promise.all([
        listSandboxFiles({ sandboxId: project.sandboxId, path: "/home/user/out" }),
        listSandboxFiles({ sandboxId: project.sandboxId, path: "/home/user/public/media" }),
      ]);
      
      if (outResult.success && "files" in outResult) {
        setOutFiles(outResult.files || []);
      }
      if (mediaResult.success && "files" in mediaResult) {
        setMediaFiles(mediaResult.files || []);
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const refreshPipelineStatus = async () => {
    try {
      console.log('[pipeline] refreshing status for project:', id);
      const status = await getPipelineStatus({ projectId: id as Id<"projects"> });
      console.log('[pipeline] status:', status);
      setPipelineStatus(status);
    } catch (error) {
      console.error('[pipeline] failed to get status:', error);
    }
  };

  useEffect(() => {
    refreshPipelineStatus();
    const interval = setInterval(refreshPipelineStatus, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (project?.sandboxId) {
      loadFiles();
    }
  }, [project?.sandboxId]);

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

  const hasInputMedia =
    (project.fileUrls?.some((url) => Boolean(url)) ?? false) ||
    Boolean(project.musicUrl) ||
    ((project.videoUrls?.length || 0) > 0);

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

          <div className="mt-6">
            <Tabs
              defaultTab="media"
              tabs={[
                {
                  id: "media",
                  label: "Media",
                  content: (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">input media</p>
                            <p className="text-xs text-gray-500">files that will be placed in public/media/</p>
                          </div>
                          <label className={`px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs cursor-pointer ${uploadingFiles ? 'opacity-50' : ''}`}>
                            {uploadingFiles ? "uploading..." : "upload more"}
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={uploadingFiles}
                              onChange={async (e) => {
                                const newFiles = Array.from(e.target.files || []);
                                if (newFiles.length === 0) return;
                                
                                setUploadingFiles(true);
                                try {
                                  const fileIds = [];
                                  const fileMetadata = [];
                                  for (const file of newFiles) {
                                    const uploadUrl = await generateUploadUrl();
                                    const result = await fetch(uploadUrl, {
                                      method: "POST",
                                      headers: { "Content-Type": file.type },
                                      body: file,
                                    });
                                    const { storageId } = await result.json();
                                    fileIds.push(storageId);
                                    fileMetadata.push({
                                      storageId,
                                      filename: file.name,
                                      contentType: file.type,
                                      size: file.size,
                                    });
                                  }
                                  
                                  await addFilesToProject({
                                    projectId: project._id as Id<"projects">,
                                    files: fileIds,
                                    fileMetadata,
                                  });
                                } catch (error) {
                                  console.error("upload error:", error);
                                  alert("failed to upload files");
                                } finally {
                                  setUploadingFiles(false);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                        {hasInputMedia ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {project.fileUrls?.map((url, i) =>
                              url ? (
                                <MediaFileCard 
                                  key={`file-${i}`} 
                                  url={url} 
                                  index={i}
                                  isAnimating={animatingImageUrl === url}
                                  onAnimate={async (imageUrl) => {
                                    setAnimatingImageUrl(imageUrl);
                                    try {
                                      const result = await animateImage({ imageUrl });
                                      if (result.success && result.data?.video?.url) {
                                        alert(`animation created! url: ${result.data.video.url}`);
                                      } else {
                                        alert('animation failed');
                                      }
                                    } catch (error) {
                                      console.error('animate error:', error);
                                      alert('animation failed');
                                    } finally {
                                      setAnimatingImageUrl(null);
                                    }
                                  }}
                                />
                              ) : null
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
                        ) : (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                            no input media yet
                          </div>
                        )}
                      </div>

                      {(project.videoUrls?.length || 0) > 0 && (
                        <div className="border-t pt-6">
                          <p className="text-sm font-medium text-gray-700 mb-1">generated media</p>
                          <p className="text-xs text-gray-500 mb-3">ai-animated videos from images</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {project.videoUrls?.map((url, i) => (
                              <div key={i} className="relative group">
                                <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                                  <div 
                                    className="w-full h-20 bg-pink-100 rounded mb-2 overflow-hidden"
                                    onMouseEnter={(e) => {
                                      const video = e.currentTarget.querySelector('video');
                                      if (video) video.play();
                                    }}
                                    onMouseLeave={(e) => {
                                      const video = e.currentTarget.querySelector('video');
                                      if (video) {
                                        video.pause();
                                        video.currentTime = 0;
                                      }
                                    }}
                                  >
                                    <video 
                                      src={url}
                                      className="w-full h-full object-cover"
                                      muted
                                      loop
                                    />
                                  </div>
                                  <p className="text-xs font-medium text-pink-900">video {i + 1}</p>
                                  <p className="text-xs text-pink-600">🎬 animated</p>
                                </div>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-pink-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-medium"
                                >
                                  view full
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(project.videoUrls?.length || 0) > 0 && (
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
                                className:
                                  i === 0
                                    ? "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                                    : i === 1
                                    ? "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                                    : "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
                              })) || []),
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: "script",
                  label: "Script",
                  content: (
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">prompt</p>
                        <p className="text-gray-800 p-4 bg-gray-50 rounded-lg">{project.prompt}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">created</p>
                        <p className="text-gray-600 text-sm">{new Date(project.createdAt).toLocaleString()}</p>
                      </div>

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
                          <div className="flex items-center justify-between mb-2 gap-3">
                            <p className="text-sm font-medium text-gray-700">generated script</p>
                            <div className="flex items-center gap-2">
                              {isEditingScript ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditingScript(false);
                                      setSaveScriptError(null);
                                      setScriptDraft(project.script ?? "");
                                    }}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveScript}
                                    disabled={savingScript || !scriptDraft.trim()}
                                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                                  >
                                    {savingScript ? "saving..." : "save"}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingScript(true);
                                    setSaveScriptError(null);
                                    setScriptDraft(project.script ?? "");
                                  }}
                                  className="px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  edit
                                </button>
                              )}
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
                          </div>
                          {isEditingScript ? (
                            <div>
                              <textarea
                                value={scriptDraft}
                                onChange={(event) => setScriptDraft(event.target.value)}
                                disabled={savingScript}
                                className="w-full min-h-[160px] rounded-lg border border-gray-200 p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60"
                              />
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>{scriptDraft.length} characters</span>
                                {saveScriptError && <span className="text-red-600">{saveScriptError}</span>}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-800 p-4 bg-gray-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                              {project.script}
                            </p>
                          )}
                          {!isEditingScript && saveScriptError && (
                            <p className="mt-2 text-xs text-red-600">{saveScriptError}</p>
                          )}
                        </div>
                      )}

                      {project.audioUrl && (
                        <div className="border-t pt-6">
                          <p className="text-sm font-medium text-gray-700 mb-2">voiceover</p>
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xs font-semibold text-purple-900">audio.mp3</p>
                                <p className="text-xs text-purple-600">voiceover</p>
                              </div>
                              <audio controls className="w-full h-8 md:w-64">
                                <source src={project.audioUrl} type="audio/mp3" />
                              </audio>
                            </div>
                          </div>
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
                    </div>
                  ),
                },
                {
                  id: "sandbox",
                  label: "Sandbox State",
                  content: (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-6 rounded-xl border-2 ${pipelineStatus?.sandboxAlive ? 'bg-green-50 border-green-300' : pipelineStatus?.sandboxExists ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`text-3xl ${pipelineStatus?.sandboxAlive ? 'animate-pulse' : ''}`}>
                              {pipelineStatus?.sandboxAlive ? '🟢' : pipelineStatus?.sandboxExists ? '🟡' : '⚫'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">sandbox</p>
                              <p className="text-xs text-gray-600">{pipelineStatus?.sandboxAlive ? 'running' : pipelineStatus?.sandboxExists ? 'paused/dead' : 'not created'}</p>
                            </div>
                          </div>
                          {pipelineStatus?.sandboxAlive ? (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(project.sandboxId!);
                              }}
                              className="mt-2 px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors text-xs w-full"
                            >
                              copy id
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                setCreatingSequence(true);
                                try {
                                  await createSequence({ projectId: id as Id<"projects"> });
                                  await refreshPipelineStatus();
                                  await loadFiles();
                                } finally {
                                  setCreatingSequence(false);
                                }
                              }}
                              disabled={creatingSequence}
                              className="mt-2 px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors text-xs w-full disabled:opacity-50"
                            >
                              {creatingSequence ? 'starting...' : pipelineStatus?.sandboxExists ? 'restart sandbox' : 'start sandbox'}
                            </button>
                          )}
                        </div>
                        
                        <div className={`p-6 rounded-xl border-2 ${pipelineStatus?.videoRendered ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-3xl">
                              {pipelineStatus?.videoRendered ? '🎬' : '📭'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">output video</p>
                              <p className="text-xs text-gray-600">{pipelineStatus?.videoRendered ? 'ready' : 'not rendered'}</p>
                            </div>
                          </div>
                          {pipelineStatus?.videoRendered && project.sandboxId ? (
                            <button
                              onClick={async () => {
                                const result = await getSandboxFileDownloadUrl({
                                  sandboxId: project.sandboxId!,
                                  filePath: '/home/user/out/Main.mp4',
                                });
                                if (result.success && 'downloadUrl' in result) {
                                  setSelectedFile({
                                    name: 'Main.mp4',
                                    content: result.downloadUrl || '',
                                    isText: false,
                                  });
                                }
                              }}
                              className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs w-full"
                            >
                              preview video
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">render pipeline</h3>
                        <div className="space-y-3">
                          <div className={`p-4 rounded-lg border-2 ${step1Running ? 'bg-blue-50 border-blue-300 animate-pulse' : pipelineStatus?.sandboxAlive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{pipelineStatus?.sandboxAlive ? '✅' : step1Running ? '⏳' : '1️⃣'}</span>
                                <div>
                                  <p className="font-medium text-gray-800">start sandbox</p>
                                  <p className="text-xs text-gray-600">create/connect to e2b environment</p>
                                </div>
                              </div>
                              {!pipelineStatus?.sandboxAlive && (
                                <button
                                  onClick={async () => {
                                    setStep1Running(true);
                                    try {
                                      await step1StartSandbox({ projectId: id as Id<"projects"> });
                                      await refreshPipelineStatus();
                                    } finally {
                                      setStep1Running(false);
                                    }
                                  }}
                                  disabled={step1Running}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs disabled:opacity-50"
                                >
                                  {step1Running ? 'starting...' : pipelineStatus?.sandboxExists ? 'restart' : 'start'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border-2 ${step2Running ? 'bg-blue-50 border-blue-300 animate-pulse' : pipelineStatus?.mediaUploaded ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{pipelineStatus?.mediaUploaded ? '✅' : step2Running ? '⏳' : '2️⃣'}</span>
                                <div>
                                  <p className="font-medium text-gray-800">upload files</p>
                                  <p className="text-xs text-gray-600">transfer media, audio, srt to sandbox</p>
                                </div>
                              </div>
                              {pipelineStatus?.sandboxAlive && !pipelineStatus?.mediaUploaded && (
                                <button
                                  onClick={async () => {
                                    setStep2Running(true);
                                    try {
                                      await step2UploadFiles({ projectId: id as Id<"projects"> });
                                      await refreshPipelineStatus();
                                      await loadFiles();
                                    } finally {
                                      setStep2Running(false);
                                    }
                                  }}
                                  disabled={step2Running}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs disabled:opacity-50"
                                >
                                  {step2Running ? 'uploading...' : 'upload'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border-2 ${step3Running ? 'bg-blue-50 border-blue-300 animate-pulse' : pipelineStatus?.sequenceCreated ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{pipelineStatus?.sequenceCreated ? '✅' : step3Running ? '⏳' : '3️⃣'}</span>
                                <div>
                                  <p className="font-medium text-gray-800">run video editor</p>
                                  <p className="text-xs text-gray-600">claude analyzes footage and creates composition</p>
                                </div>
                              </div>
                              {pipelineStatus?.mediaUploaded && !pipelineStatus?.sequenceCreated && (
                                <button
                                  onClick={async () => {
                                    setStep3Running(true);
                                    try {
                                      await step3RunVideoEditor({ projectId: id as Id<"projects"> });
                                      await refreshPipelineStatus();
                                      await loadFiles();
                                    } finally {
                                      setStep3Running(false);
                                    }
                                  }}
                                  disabled={step3Running}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs disabled:opacity-50"
                                >
                                  {step3Running ? 'editing...' : 'run editor'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border-2 ${step4Running ? 'bg-blue-50 border-blue-300 animate-pulse' : pipelineStatus?.videoRendered ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{pipelineStatus?.videoRendered ? '✅' : step4Running ? '⏳' : '4️⃣'}</span>
                                <div>
                                  <p className="font-medium text-gray-800">render sequence</p>
                                  <p className="text-xs text-gray-600">run bun remotion render</p>
                                </div>
                              </div>
                              {pipelineStatus?.sequenceCreated && !pipelineStatus?.videoRendered && (
                                <button
                                  onClick={async () => {
                                    setStep4Running(true);
                                    try {
                                      await step4RenderSequence({ projectId: id as Id<"projects"> });
                                      await refreshPipelineStatus();
                                      await loadFiles();
                                    } finally {
                                      setStep4Running(false);
                                    }
                                  }}
                                  disabled={step4Running}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs disabled:opacity-50"
                                >
                                  {step4Running ? 'rendering...' : 'render'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-6">
                        {project.sandboxId ? (
                          <div className="space-y-6">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-700">sandbox info</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      setLoadingSandbox(true);
                                      try {
                                        await refreshPipelineStatus();
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
                                  <button
                                    onClick={async () => {
                                      const result = await downloadSandboxFolder({
                                        sandboxId: project.sandboxId!,
                                        folderPath: "/home/user",
                                      });
                                      if (result.success && "base64Content" in result) {
                                        const binaryString = atob(result.base64Content || "");
                                        const bytes = new Uint8Array(binaryString.length);
                                        for (let i = 0; i < binaryString.length; i++) {
                                          bytes[i] = binaryString.charCodeAt(i);
                                        }
                                        const blob = new Blob([bytes], { type: "application/zip" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = "sandbox.zip";
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      }
                                    }}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    download zip
                                  </button>
                                </div>
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

                            <div className="p-4 bg-black rounded-lg border border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-green-400 font-mono text-sm">$</span>
                                <input
                                  type="text"
                                  value={command}
                                  onChange={(e) => setCommand(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (e.key === "Enter" && command.trim() && !runningCommand) {
                                      setRunningCommand(true);
                                      try {
                                        const result = await runSandboxCommand({
                                          sandboxId: project.sandboxId!,
                                          command: command.trim(),
                                        });
                                        if (result.success && "exitCode" in result) {
                                          setCommandOutput({
                                            stdout: result.stdout || "",
                                            stderr: result.stderr || "",
                                            exitCode: result.exitCode || 0,
                                          });
                                        } else if ("error" in result) {
                                          setCommandOutput({
                                            stdout: "",
                                            stderr: result.error || "command failed",
                                            exitCode: 1,
                                          });
                                        }
                                      } finally {
                                        setRunningCommand(false);
                                      }
                                    }
                                  }}
                                  placeholder="ls -la"
                                  disabled={runningCommand}
                                  className="flex-1 bg-transparent text-gray-100 font-mono text-sm outline-none placeholder-gray-500"
                                />
                              </div>
                              {commandOutput && (
                                <div className="mt-2 font-mono text-xs">
                                  {commandOutput.stdout && (
                                    <pre className="text-gray-300 whitespace-pre-wrap">{commandOutput.stdout}</pre>
                                  )}
                                  {commandOutput.stderr && (
                                    <pre className="text-red-400 whitespace-pre-wrap mt-2">{commandOutput.stderr}</pre>
                                  )}
                                  <div className="mt-2 text-[10px] text-gray-500">
                                    exit code: {commandOutput.exitCode}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700 mb-3">media files (public/media/)</p>
                              <button
                                onClick={async () => {
                                  await refreshPipelineStatus();
                                  await loadFiles();
                                }}
                                className="text-xs text-purple-600 hover:text-purple-800"
                                disabled={loadingFiles}
                              >
                                refresh
                              </button>
                              </div>
                              {loadingFiles ? (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 animate-pulse">
                                  loading files...
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {mediaFiles.map((file) => (
                                    <div key={file.path} className="flex items-center gap-2">
                                      <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className="text-lg">{file.isDir ? "📁" : "📄"}</span>
                                        <span className="text-sm font-mono">{file.name}</span>
                                      </div>
                                      {!file.isDir && (
                                        <>
                                          <button
                                            onClick={async () => {
                                              const result = await getSandboxFileDownloadUrl({
                                                sandboxId: project.sandboxId!,
                                                filePath: file.path,
                                              });
                                              if (result.success && "downloadUrl" in result) {
                                                window.open(result.downloadUrl, "_blank");
                                              }
                                            }}
                                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
                                            title="preview in browser"
                                          >
                                            👁
                                          </button>
                                          <button
                                            onClick={async () => {
                                              const result = await getSandboxFileDownloadUrl({
                                                sandboxId: project.sandboxId!,
                                                filePath: file.path,
                                              });
                                              if (result.success && "downloadUrl" in result) {
                                                const a = document.createElement("a");
                                                a.href = result.downloadUrl || "";
                                                a.download = file.name;
                                                a.click();
                                              }
                                            }}
                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                                            title="download file"
                                          >
                                            ⬇
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                  {mediaFiles.length === 0 && (
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                      no media files yet
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-3">output files (out/)</p>
                              {outFiles.length > 0 ? (
                                <div className="space-y-2">
                                  {outFiles.map((file) => (
                                    <div key={file.path} className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          if (!file.isDir) {
                                            setLoadingFileContent(true);
                                            setSelectedFile(null);
                                            try {
                                              const result = await readSandboxFile({
                                                sandboxId: project.sandboxId!,
                                                filePath: file.path,
                                              });
                                              if (result.success && "content" in result) {
                                                setSelectedFile({
                                                  name: file.name,
                                                  content: result.content || "",
                                                  isText: result.isText || false,
                                                });
                                              }
                                            } finally {
                                              setLoadingFileContent(false);
                                            }
                                          }
                                        }}
                                        disabled={file.isDir || loadingFileContent}
                                        className="flex-1 text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{file.isDir ? "📁" : "📄"}</span>
                                          <span className="text-sm font-mono">{file.name}</span>
                                        </div>
                                      </button>
                                      {!file.isDir && (
                                        <>
                                          <button
                                            onClick={async () => {
                                              const result = await getSandboxFileDownloadUrl({
                                                sandboxId: project.sandboxId!,
                                                filePath: file.path,
                                              });
                                              if (result.success && "downloadUrl" in result) {
                                                window.open(result.downloadUrl, "_blank");
                                              }
                                            }}
                                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
                                            title="preview in browser"
                                          >
                                            👁
                                          </button>
                                          <button
                                            onClick={async () => {
                                              const result = await getSandboxFileDownloadUrl({
                                                sandboxId: project.sandboxId!,
                                                filePath: file.path,
                                              });
                                              if (result.success && "downloadUrl" in result) {
                                                const a = document.createElement("a");
                                                a.href = result.downloadUrl || "";
                                                a.download = file.name;
                                                a.click();
                                              }
                                            }}
                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                                            title="download file"
                                          >
                                            ⬇
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                  no output files yet
                                </div>
                              )}
                            </div>

                            {selectedFile && (
                              <div className="p-4 bg-black rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-green-400 font-mono text-sm">{selectedFile.name}</p>
                                  <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-gray-400 hover:text-gray-200 text-xs"
                                  >
                                    close
                                  </button>
                                </div>
                                {selectedFile.isText ? (
                                  <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                                    {atob(selectedFile.content)}
                                  </pre>
                                ) : selectedFile.name.endsWith(".mp4") || selectedFile.name.endsWith(".webm") ? (
                                  <video
                                    controls
                                    className="w-full rounded"
                                    src={selectedFile.content.startsWith('http') ? selectedFile.content : `data:video/mp4;base64,${selectedFile.content}`}
                                  />
                                ) : selectedFile.name.endsWith(".png") || selectedFile.name.endsWith(".jpg") || selectedFile.name.endsWith(".jpeg") ? (
                                  <img
                                    alt={selectedFile.name}
                                    className="w-full rounded"
                                    src={selectedFile.content.startsWith('http') ? selectedFile.content : `data:image/png;base64,${selectedFile.content}`}
                                  />
                                ) : (
                                  <div className="text-gray-400 text-xs">binary file preview not available</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                            sandbox not available yet
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">convex storage</p>
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
                  ),
                },
              ]}
            />
          </div>

        </div>
      </div>
    </main>
  );
}
