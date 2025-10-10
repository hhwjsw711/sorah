"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function Home() {
  const tasks = useQuery(api.tasks.get);
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

        {tasks && tasks.length > 0 && (
          <div className="grid gap-4">
            {tasks.map(({ _id, text }) => (
              <div key={_id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                {text}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
