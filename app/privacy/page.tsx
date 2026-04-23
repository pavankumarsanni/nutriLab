import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NutriFitLab",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
        <a href="/" className="text-sm text-green-600 hover:text-green-700 transition-colors mb-6 inline-block">
          ← Back to NutriFitLab
        </a>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 2026</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. What We Collect</h2>
            <p className="mb-2">When you use NutriFitLab, we collect the following:</p>
            <ul className="space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>From Google sign-in:</strong> your name, email address, and profile photo. We do not receive your Google password.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>From your profile setup:</strong> height, current weight, target weight, age, activity level, and any injuries or physical limitations you choose to provide.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>From your activity:</strong> chat conversations and messages, saved recipes, generated meal plans, and generated workout plans.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Why We Collect It</h2>
            <ul className="space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>To authenticate you securely via Google OAuth.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>To personalise AI-generated meal plans and workout plans based on your stats and goals.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>To save your chat history, recipes, meal plans, and workouts so you can access them across sessions.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. How We Use AI</h2>
            <p>NutriFitLab uses <strong>Claude AI by Anthropic</strong> to generate responses in the chat, meal plans, and workout plans. When you send a message or generate a plan, the content of your request is sent to Anthropic&apos;s API to produce a response. Anthropic is a sub-processor of your data for this purpose. Please refer to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Anthropic&apos;s Privacy Policy</a> for how they handle data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. How Long We Keep It</h2>
            <p>Your data is stored for as long as your account exists. When you delete your account using the <strong>&quot;Delete my account&quot;</strong> option in the sidebar, all of your data — including your profile, conversations, saved recipes, meal plans, and workouts — is permanently and immediately deleted from our database.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Third Parties</h2>
            <ul className="space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>We do <strong>not</strong> sell your data to any third party.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>Google</strong> — used for authentication only. We receive your basic profile information.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>Anthropic</strong> — receives your chat and generation requests to produce AI responses.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>Neon (PostgreSQL)</strong> — your data is stored in an encrypted cloud database.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span><strong>Vercel</strong> — the app is hosted on Vercel. All traffic is served over HTTPS.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>Access the data we hold about you.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>Delete all your data at any time using the <strong>&quot;Delete my account&quot;</strong> option.</span></li>
              <li className="flex gap-2"><span className="text-green-600 flex-shrink-0">•</span><span>Request a copy of your data by contacting us.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Contact</h2>
            <p>If you have any questions about this Privacy Policy or how your data is handled, please contact us at <strong>labsnutrifit@gmail.com</strong>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
