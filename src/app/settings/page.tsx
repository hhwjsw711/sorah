"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type PreferredStyle = "playful" | "professional" | "travel";

export default function SettingsPage() {
  const { userId, signOut, isInitialized } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser, userId ? { userId } : "skip");
  const router = useRouter();

  const [name, setName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<PreferredStyle | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasExistingVoice, setHasExistingVoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceGenerateSuccess, setVoiceGenerateSuccess] = useState(false);
  const [hasVoiceId, setHasVoiceId] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const updateProfile = useAction(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const regenerateVoice = useAction(api.users.regenerateVoice);

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !userId) {
      router.push("/auth");
    }
  }, [isInitialized, userId, router]);

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setSelectedStyle(currentUser.preferredStyle || null);
      setHasExistingVoice(!!currentUser.voiceRecordingUrl);
      setHasVoiceId(!!currentUser.elevenlabsVoiceId);
    }
  }, [currentUser]);

  if (!isInitialized || !userId || currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">loading...</p>
        </div>
      </div>
    );
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      let voiceStorageId;
      
      // Upload new voice recording if available
      if (audioBlob) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": audioBlob.type },
          body: audioBlob,
        });
        const { storageId } = await result.json();
        voiceStorageId = storageId;
      }

      // Update profile
      await updateProfile({
        userId,
        name: name || undefined,
        preferredStyle: selectedStyle || undefined,
        voiceRecordingStorageId: voiceStorageId,
      });

      setSaveSuccess(true);
      setAudioBlob(null);
      if (voiceStorageId) {
        setHasExistingVoice(true);
        // Voice ID will be generated automatically by the updateProfile action
        setHasVoiceId(true);
      }
      
      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!userId || !currentUser?.voiceRecordingUrl) {
      alert("No voice recording found. Please record your voice first.");
      return;
    }

    setGeneratingVoice(true);
    setVoiceGenerateSuccess(false);
    try {
      const result = await regenerateVoice({ userId });

      if (result.success) {
        setHasVoiceId(true);
        setVoiceGenerateSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => setVoiceGenerateSuccess(false), 3000);
      } else {
        throw new Error(result.error || "Failed to generate voice");
      }
    } catch (error) {
      console.error("Error generating voice:", error);
      alert("Failed to generate voice. Please try again.");
    } finally {
      setGeneratingVoice(false);
    }
  };

  const styles: { value: PreferredStyle; label: string; description: string; emoji: string }[] = [
    { value: "playful", label: "playful", description: "fun, energetic, and creative", emoji: "🎨" },
    { value: "professional", label: "professional", description: "polished, business-focused", emoji: "💼" },
    { value: "travel", label: "travel", description: "adventurous and wanderlust", emoji: "✈️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">settings</h1>
            <p className="text-purple-200">manage your profile and preferences</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
          >
            ← back to home
          </button>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-500 text-white rounded-lg shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span>profile updated successfully!</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">personal information</h2>
            
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Phone (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  phone number
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                  {currentUser.phone || "not set"}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  phone number cannot be changed as it's linked to your account
                </p>
              </div>
            </div>
          </div>

          {/* Content Style */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">content style</h2>
            <p className="text-gray-600 mb-6">choose the style for your generated content</p>

            <div className="space-y-3">
              {styles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedStyle === style.value
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{style.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 capitalize">{style.label}</h3>
                      <p className="text-sm text-gray-600">{style.description}</p>
                    </div>
                    {selectedStyle === style.value && (
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Recording */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">voice recording</h2>
            <p className="text-gray-600 mb-6">
              {hasExistingVoice 
                ? "you have a voice recording saved. record a new one to replace it."
                : "record your voice to enable voice cloning for narrations"}
            </p>

            <div className="bg-gray-50 rounded-lg p-6 text-center">
              {!audioBlob ? (
                <>
                  {hasExistingVoice && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        ✓ voice recording on file
                      </p>
                    </div>
                  )}
                  <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-purple-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-4">
                    {recording ? "recording... click stop when done" : `click to ${hasExistingVoice ? "record new" : "start recording"}`}
                  </p>
                  {recording && (
                    <div className="mb-4 flex justify-center">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-8 bg-purple-600 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      recording
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {recording ? "stop recording" : hasExistingVoice ? "record new voice" : "start recording"}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-4">new recording ready to save!</p>
                  <audio src={URL.createObjectURL(audioBlob)} controls className="w-full mb-4" />
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="px-6 py-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    record again
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Voice AI Generation */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">AI voice cloning</h2>
            <p className="text-gray-600 mb-6">
              generate an AI voice clone from your recording for use in video narrations
            </p>

            <div className="space-y-4">
              {/* Voice Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${hasVoiceId ? 'bg-green-500' : hasExistingVoice ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {hasVoiceId ? "AI voice ready" : hasExistingVoice ? "Recording available" : "No recording"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {hasVoiceId 
                        ? "Your custom AI voice is ready to use" 
                        : hasExistingVoice 
                          ? "Generate AI voice from your recording"
                          : "Record your voice first"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {voiceGenerateSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="font-medium">AI voice generated successfully!</span>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              {hasExistingVoice && (
                <button
                  onClick={handleGenerateVoice}
                  disabled={generatingVoice}
                  className={`w-full py-3 px-4 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasVoiceId
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg"
                  }`}
                >
                  {generatingVoice ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      generating AI voice...
                    </span>
                  ) : (
                    hasVoiceId ? "regenerate AI voice" : "generate AI voice"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "saving changes..." : "save changes"}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-red-200">
            <h2 className="text-2xl font-bold text-red-600 mb-2">danger zone</h2>
            <p className="text-gray-600 mb-6">actions that affect your account</p>
            
            <button
              onClick={() => {
                if (confirm("Are you sure you want to sign out?")) {
                  signOut();
                  router.push("/auth");
                }
              }}
              className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all"
            >
              sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

