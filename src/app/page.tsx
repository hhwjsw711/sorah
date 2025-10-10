"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const projects = useQuery(api.tasks.getProjects);
  const simulateCompleted = useMutation(api.tasks.simulateCompleted);
  const deleteProject = useMutation(api.tasks.deleteProject);
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            sorah
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            turn your videos into magic
          </p>
          <Link href="/upload">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-lg font-semibold hover:shadow-lg transition-all hover:scale-105">
              create project
            </button>
          </Link>
        </div>

        {projects && projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">projects</h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div key={project._id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-gray-800 mb-2">{project.prompt}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{project.files.length} files</span>
                        <span>•</span>
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.status === "completed" 
                        ? "bg-green-100 text-green-700"
                        : project.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {project.status || "processing"}
                    </div>
                  </div>

                  {project.fileUrls && project.fileUrls.length > 0 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                      {project.fileUrls.map((url, i) => (
                        url && (
                          <div key={i} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
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
                  )}

                  {project.script && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">script</p>
                      <p className="text-sm text-gray-600">{project.script}</p>
                    </div>
                  )}

                  {(project.audioUrl || project.musicUrl || project.videoUrls) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.audioUrl && (
                        <a 
                          href={project.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                        >
                          🎤 audio
                        </a>
                      )}
                      {project.musicUrl && (
                        <a 
                          href={project.musicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                        >
                          🎵 music
                        </a>
                      )}
                      {project.videoUrls?.map((url, i) => (
                        <a 
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-200 transition-colors"
                        >
                          🎬 video {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {project.error && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-700 mb-1">error</p>
                      <p className="text-sm text-red-600">{project.error}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => simulateCompleted({ id: project._id })}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      simulate completed
                    </button>
                    <button
                      onClick={() => deleteProject({ id: project._id })}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
