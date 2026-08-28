const AVATAR_COLORS = ["#1d9bf0", "#f91880", "#ff7a00", "#00ba7c", "#7856ff", "#e0245e"];

function colorForUser(userId: number): string {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

interface AvatarProps {
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ userId, displayName, avatarUrl, size = "md" }: AvatarProps) {
  const sizeClass = size === "sm" ? "avatar--sm" : size === "lg" ? "avatar--lg" : "";

  if (avatarUrl) {
    return <img className={`avatar ${sizeClass}`} src={avatarUrl} alt={displayName} />;
  }

  const initial = (displayName || "?").charAt(0).toUpperCase();
  return (
    <div className={`avatar ${sizeClass}`} style={{ background: colorForUser(userId) }}>
      {initial}
    </div>
  );
}
