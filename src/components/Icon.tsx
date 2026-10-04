export default function Icon({ name }: { name: "lock" | "replay" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
        </>
      ) : (
        <>
          <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
          <path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
