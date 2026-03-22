import React, { useEffect, useState } from "react";
import "./ImageAdjuster.css";

const MOVE_STEP = 10;
const ZOOM_STEP = 0.1;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;

function ImageAdjuster({ src, alt = "Selected Preview" }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Reset adjustments whenever user selects a different image.
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, [src]);

  const moveImage = (deltaX, deltaY) => {
    setPosition((previous) => ({
      x: previous.x + deltaX,
      y: previous.y + deltaY,
    }));
  };

  const zoomImage = (delta) => {
    setScale((previous) => {
      const nextScale = previous + delta;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(nextScale.toFixed(2))));
    });
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  return (
    <div className="image-adjuster">
      <div className="image-adjuster__viewport">
        <img
          src={src}
          alt={alt}
          className="image-adjuster__image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      <div className="image-adjuster__controls">
        <div className="image-adjuster__arrow-grid" role="group" aria-label="Move image">
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--up"
            onClick={() => moveImage(0, -MOVE_STEP)}
            aria-label="Move Up"
            title="Move Up"
          >
            ⬆️
          </button>
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--left"
            onClick={() => moveImage(-MOVE_STEP, 0)}
            aria-label="Move Left"
            title="Move Left"
          >
            ⬅️
          </button>
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--down"
            onClick={() => moveImage(0, MOVE_STEP)}
            aria-label="Move Down"
            title="Move Down"
          >
            ⬇️
          </button>
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--right"
            onClick={() => moveImage(MOVE_STEP, 0)}
            aria-label="Move Right"
            title="Move Right"
          >
            ➡️
          </button>
        </div>

        <div className="image-adjuster__utility">
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--zoom"
            onClick={() => zoomImage(ZOOM_STEP)}
            aria-label="Zoom In"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="image-adjuster__btn image-adjuster__btn--zoom"
            onClick={() => zoomImage(-ZOOM_STEP)}
            aria-label="Zoom Out"
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            className="image-adjuster__reset"
            onClick={resetPosition}
          >
            Reset Position
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageAdjuster;
