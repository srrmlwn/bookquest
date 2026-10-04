"use client";

import Buddy from "./Buddy";

export default function NoDatabase() {
  return (
    <main className="center-screen">
      <div className="pinpad">
        <Buddy size={120} />
        <h1>Almost ready</h1>
        <p className="muted">
          BookQuest needs its database. In Vercel, open the bookquest project → Storage → add Neon Postgres, then
          redeploy.
        </p>
      </div>
    </main>
  );
}
