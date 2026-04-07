import { useState, useCallback, useRef, useEffect } from 'react';
import CanvasViewer from './components/CanvasViewer';
import LayerPanel from './components/LayerPanel';
import FileLoader from './components/FileLoader';
import { GerberParser } from './parser/gerberParser';
import { GerberRenderer } from './renderer/gerberRenderer';
import type { LayerConfig, ViewState } from './types/gerber';
import { LAYER_COLORS } from './types/gerber';
import './App.css';

function getLayerInfo(fileName: string) {
  const lowerName = fileName.toLowerCase();
  for (const [ext, info] of Object.entries(LAYER_COLORS)) {
    if (lowerName.endsWith(ext)) {
      return info;
    }
  }
  return { color: '#cccccc', label: fileName, opacity: 0.85 };
}

function App() {
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [loading, setLoading] = useState(false);
  const [showFileLoader, setShowFileLoader] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFilesLoaded = useCallback((files: { name: string; content: string }[]) => {
    setLoading(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const parser = new GerberParser();
      const newLayers: LayerConfig[] = [];

      for (const file of files) {
        try {
          const parsed = parser.parse(file.content, file.name);
          const info = getLayerInfo(file.name);
          newLayers.push({
            name: info.label,
            fileName: file.name,
            color: info.color,
            visible: true,
            opacity: info.opacity,
            layer: parsed,
          });
        } catch (error) {
          console.error(`Failed to parse ${file.name}:`, error);
        }
      }

      // Sort layers by type (outline first, then copper, then others)
      const order = ['.rout', '.gbl', '.gbs', '.gbo', '.gbp', '.drill.out', '.gtp', '.gts', '.gto', '.gtl'];
      newLayers.sort((a, b) => {
        const aOrder = order.findIndex(ext => a.fileName.toLowerCase().endsWith(ext));
        const bOrder = order.findIndex(ext => b.fileName.toLowerCase().endsWith(ext));
        return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
      });

      setLayers(newLayers);
      setShowFileLoader(false);
      setLoading(false);

      // Fit view after render
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const fitView = GerberRenderer.calculateFitView(newLayers, rect.width, rect.height);
          setViewState(fitView);
        }
      });
    }, 50);
  }, []);

  const handleToggleLayer = useCallback((index: number) => {
    setLayers(prev => prev.map((l, i) =>
      i === index ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  const handleOpacityChange = useCallback((index: number, opacity: number) => {
    setLayers(prev => prev.map((l, i) =>
      i === index ? { ...l, opacity } : l
    ));
  }, []);

  const handleFitView = useCallback(() => {
    if (containerRef.current && layers.length > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const fitView = GerberRenderer.calculateFitView(layers, rect.width, rect.height);
      setViewState(fitView);
    }
  }, [layers]);

  const handleLoadMore = useCallback(() => {
    setShowFileLoader(true);
  }, []);

  // Load sample files from 2213243cam directory
  const handleLoadSample = useCallback(async () => {
    setLoading(true);
    const sampleFiles = [
      'set.gtl', 'set.gbl', 'set.gto', 'set.gbo',
      'set.gts', 'set.gbs', 'set.gtp', 'set.gbp',
      'set.drill.out', 'set.rout'
    ];

    const results: { name: string; content: string }[] = [];
    for (const fname of sampleFiles) {
      try {
        const response = await fetch(`/cam/${fname}`);
        if (response.ok) {
          const content = await response.text();
          results.push({ name: fname, content });
        }
      } catch {
        console.warn(`Could not load sample file: ${fname}`);
      }
    }

    if (results.length > 0) {
      handleFilesLoaded(results);
    } else {
      setLoading(false);
    }
  }, [handleFilesLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        handleFitView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitView]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>CAM Viewer</h1>
        <div className="header-actions">
          {layers.length > 0 && (
            <button className="header-btn" onClick={handleLoadMore}>
              + 加载文件
            </button>
          )}
          <button className="header-btn sample-btn" onClick={handleLoadSample}>
            加载示例
          </button>
        </div>
      </header>

      <div className="app-body">
        <LayerPanel
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onOpacityChange={handleOpacityChange}
          onFitView={handleFitView}
        />

        <div className="viewer-area" ref={containerRef}>
          {showFileLoader && layers.length === 0 ? (
            <FileLoader onFilesLoaded={handleFilesLoaded} loading={loading} />
          ) : (
            <CanvasViewer
              layers={layers}
              viewState={viewState}
              onViewStateChange={setViewState}
            />
          )}
        </div>
      </div>

      {showFileLoader && layers.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowFileLoader(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <FileLoader onFilesLoaded={handleFilesLoaded} loading={loading} />
            <button className="modal-close" onClick={() => setShowFileLoader(false)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
