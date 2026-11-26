import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  aspectClass?: string;
}

export function EditorialImage({
  src,
  alt,
  title,
  className = '',
  aspectClass = 'aspect-[4/3]',
}: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${aspectClass} w-full bg-[#EBE6DC] dark:bg-[#131C2E] border border-[#D8D3C8] dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <BookOpen className="w-7 h-7 text-[#8C6D32] dark:text-[#C9A458] mb-2" />
        <span className="font-serif text-sm text-[#3E434E] dark:text-slate-300 line-clamp-2 max-w-xs">
          {title || alt || 'WDS Editorial Archive'}
        </span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-[#EBE6DC] dark:bg-[#131C2E] ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300"
      />
    </div>
  );
}
