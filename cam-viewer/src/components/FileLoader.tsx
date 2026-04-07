import React, { useCallback } from 'react';

interface FileLoaderProps {
  onFilesLoaded: (files: { name: string; content: string }[]) => void;
  loading: boolean;
}

const FileLoader: React.FC<FileLoaderProps> = ({ onFilesLoaded, loading }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    loadFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      loadFiles(Array.from(e.target.files));
    }
  }, []);

  const loadFiles = async (files: File[]) => {
    const results: { name: string; content: string }[] = [];
    for (const file of files) {
      const content = await file.text();
      results.push({ name: file.name, content });
    }
    onFilesLoaded(results);
  };

  return (
    <div
      className="file-loader"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="drop-zone">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M24 32V16M24 16l-8 8M24 16l8 8" />
          <path d="M8 32v4a4 4 0 004 4h24a4 4 0 004-4v-4" />
        </svg>
        <p>{loading ? '解析中...' : '拖放 CAM/Gerber 文件到这里'}</p>
        <p className="hint">或者点击下方按钮选择文件</p>
        <label className="file-input-label">
          选择文件
          <input
            type="file"
            multiple
            accept=".gtl,.gbl,.gto,.gbo,.gts,.gbs,.gtp,.gbp,.out,.rout,.gbr,.ger"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
};

export default FileLoader;
