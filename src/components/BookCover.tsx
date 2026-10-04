"use client";

const PALETTE = ["#2a9d8f", "#f4a261", "#d1607a", "#5aa9e6", "#4fa64a", "#d9a420", "#8a6fd1"];

export function coverColor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function BookCover({
  title,
  cover,
  variant = "large",
}: {
  title: string;
  cover: string | null;
  variant?: "large" | "thumb";
}) {
  if (variant === "thumb") {
    return cover ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="thumb" src={cover} alt="" />
    ) : (
      <div className="thumb-ph" style={{ background: coverColor(title) }} aria-hidden>
        {title.trim()[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="cover" src={cover} alt={title} />
  ) : (
    <div className="cover-placeholder" style={{ background: coverColor(title) }}>
      {title}
    </div>
  );
}
