import React, { useState } from 'react';

type ListAvatarProps = {
  src?: string | null;
  alt: string;
  initials: string;
  className?: string;
  fallbackClassName?: string;
  initialsClassName?: string;
};

/**
 * List-row avatar: lazy-loads the image and keeps failure state local
 * so one broken image does not re-render the whole table.
 */
export function ListAvatar({
  src,
  alt,
  initials,
  className = 'w-10 h-10 rounded-full object-cover border-2 border-neutral-line-200',
  fallbackClassName = 'w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white text-sm',
  initialsClassName,
}: ListAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage) {
    return (
      <div className={fallbackClassName}>
        <span className={initialsClassName}>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src as string}
      alt={alt}
      className={className}
      width={40}
      height={40}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
