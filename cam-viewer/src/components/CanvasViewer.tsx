import { useRef, useEffect, useState, useCallback } from 'react';
import { GerberRenderer } from '../renderer/gerberRenderer';
import type { LayerConfig, ViewState } from '../types/gerber';

interface CanvasViewerProps {
  layers: LayerConfig[];
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
}

const CanvasViewer: React.FC<CanvasViewerProps> = ({ layers, viewState, onViewStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GerberRenderer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new GerberRenderer(canvasRef.current);
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        rendererRef.current?.resize(width, height);
        rendererRef.current?.render(layers, viewState);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [layers, viewState]);

  // Re-render when layers or view state change
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(layers, viewState);
    }
  }, [layers, viewState]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = viewState.scale * zoomFactor;

    // Zoom towards mouse position
    const newOffsetX = mouseX - (mouseX - viewState.offsetX) * zoomFactor;
    const newOffsetY = mouseY - (mouseY - viewState.offsetY) * zoomFactor;

    onViewStateChange({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }, [viewState, onViewStateChange]);

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: viewState.offsetX,
        offsetY: viewState.offsetY,
      };
    }
  }, [viewState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update cursor position for coordinate display
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      // Convert screen coords to board coords
      const boardX = (canvasX - viewState.offsetX) / viewState.scale;
      const boardY = -(canvasY - (rect.height - viewState.offsetY)) / viewState.scale;
      setCursorPos({ x: boardX, y: boardY });
    }

    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onViewStateChange({
        ...viewState,
        offsetX: dragStartRef.current.offsetX + dx,
        offsetY: dragStartRef.current.offsetY - dy,
      });
    }
  }, [isDragging, viewState, onViewStateChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {cursorPos && (
        <div className="coord-display">
          X: {cursorPos.x.toFixed(3)} mm &nbsp; Y: {cursorPos.y.toFixed(3)} mm
        </div>
      )}
    </div>
  );
};

export default CanvasViewer;
