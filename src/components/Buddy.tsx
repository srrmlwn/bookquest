"use client";

export type BuddyMood = "idle" | "talking" | "listening" | "happy";

/** Buddy: an original, friendly reading character (a round teal pal holding a book). */
export default function Buddy({ mood = "idle", size = 160 }: { mood?: BuddyMood; size?: number }) {
  const happy = mood === "happy";
  return (
    <svg
      className={`buddy buddy-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Buddy, your reading friend"
    >
      {/* listening waves */}
      {mood === "listening" && (
        <g className="buddy-waves" fill="none" stroke="var(--teal)" strokeWidth="5" strokeLinecap="round">
          <path d="M28 70 q-12 22 0 44" />
          <path d="M14 60 q-18 32 0 64" />
          <path d="M172 70 q12 22 0 44" />
          <path d="M186 60 q18 32 0 64" />
        </g>
      )}
      <g className="buddy-body">
        {/* little sprout on top */}
        <path d="M100 30 q-4 -14 6 -22" stroke="var(--teal-dark)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="112" cy="10" rx="11" ry="7" fill="var(--leaf)" transform="rotate(-25 112 10)" />
        {/* body */}
        <path
          d="M100 30 C150 30 176 64 176 108 C176 152 144 176 100 176 C56 176 24 152 24 108 C24 64 50 30 100 30 Z"
          fill="var(--teal)"
        />
        <ellipse cx="100" cy="120" rx="52" ry="44" fill="var(--teal-light)" opacity="0.55" />
        {/* eyes */}
        {happy ? (
          <g stroke="var(--ink)" strokeWidth="6" fill="none" strokeLinecap="round">
            <path d="M64 86 q10 -12 20 0" />
            <path d="M116 86 q10 -12 20 0" />
          </g>
        ) : (
          <g className="buddy-eyes">
            <ellipse cx="74" cy="86" rx="12" ry="14" fill="var(--white)" />
            <ellipse cx="126" cy="86" rx="12" ry="14" fill="var(--white)" />
            <circle cx={mood === "listening" ? 76 : 75} cy={mood === "listening" ? 82 : 88} r="7" fill="var(--ink)" />
            <circle cx={mood === "listening" ? 128 : 127} cy={mood === "listening" ? 82 : 88} r="7" fill="var(--ink)" />
            <circle cx="78" cy="84" r="2.5" fill="var(--white)" />
            <circle cx="130" cy="84" r="2.5" fill="var(--white)" />
          </g>
        )}
        {/* cheeks */}
        <ellipse cx="56" cy="108" rx="10" ry="6" fill="var(--apricot)" opacity="0.7" />
        <ellipse cx="144" cy="108" rx="10" ry="6" fill="var(--apricot)" opacity="0.7" />
        {/* mouth */}
        {mood === "talking" ? (
          <ellipse className="buddy-mouth-talk" cx="100" cy="112" rx="11" ry="9" fill="var(--ink)" />
        ) : (
          <path
            d={happy ? "M84 106 q16 22 32 0 z" : "M88 108 q12 12 24 0"}
            stroke="var(--ink)"
            strokeWidth="5"
            fill={happy ? "var(--ink)" : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* open book held in front */}
        <g transform="translate(0 4)">
          <path d="M56 140 L100 148 L100 178 L56 170 Z" fill="var(--paper)" stroke="var(--apricot-dark)" strokeWidth="4" strokeLinejoin="round" />
          <path d="M144 140 L100 148 L100 178 L144 170 Z" fill="var(--paper)" stroke="var(--apricot-dark)" strokeWidth="4" strokeLinejoin="round" />
          <g stroke="var(--apricot)" strokeWidth="3" strokeLinecap="round">
            <path d="M66 151 L92 156" />
            <path d="M66 159 L92 164" />
            <path d="M108 156 L134 151" />
            <path d="M108 164 L134 159" />
          </g>
          {/* hands */}
          <circle cx="54" cy="156" r="10" fill="var(--teal-dark)" />
          <circle cx="146" cy="156" r="10" fill="var(--teal-dark)" />
        </g>
      </g>
    </svg>
  );
}
