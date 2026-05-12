import { useState } from "react";
import { Icon } from "./icons/Icon";

interface Props {
  src?: string | null;
  onEdit?: () => void;
  alt?: string;
  fallback?: string;
}

export function ImagePreview({ src, onEdit, alt = "", fallback = "No image" }: Props) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;
  return (
    <div className="pg-hero">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="pg-hero-img"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="pg-hero-fallback">{fallback}</div>
      )}
      {onEdit && (
        <button
          type="button"
          className="pg-hero-edit"
          onClick={onEdit}
          title="Edit image"
          aria-label="Edit image"
        >
          <Icon name="edit" size={14} />
        </button>
      )}
    </div>
  );
}
