"use client";

import { useState } from "react";
import Link from "next/link";

export default function Upload() {
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const formData = new FormData();
    formData.append("prompt", prompt);
    files.forEach((file, i) => {
      formData.append(`file${i}`, file);
    });

    const response = await fetch(`${convexUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    const { projectId } = await response.json();
    console.log("created project:", projectId);
    setPrompt("");
    setFiles([]);
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
          ← back
        </Link>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            create project
          </h1>
          <p className="text-gray-600 mb-8">upload 5-10 videos or photos and describe what you want</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="describe your video idea..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-32"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                files {files.length > 0 && `(${files.length})`}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  id="file-upload"
                  required
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-gray-600">
                    {files.length > 0 ? `${files.length} files selected` : "click to upload files"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">5-10 videos or photos</p>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {uploading ? "uploading..." : "create project"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
