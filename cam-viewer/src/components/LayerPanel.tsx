import type { LayerConfig } from '../types/gerber';

interface LayerPanelProps {
  layers: LayerConfig[];
  onToggleLayer: (index: number) => void;
  onOpacityChange: (index: number, opacity: number) => void;
  onFitView: () => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleLayer,
  onOpacityChange,
  onFitView,
}) => {
  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h3>图层管理</h3>
        <button className="fit-btn" onClick={onFitView} title="适应窗口">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h4v1.5H3.5V6H2V2zM10 2h4v4h-1.5V3.5H10V2zM2 10h1.5v2.5H6V14H2v-4zM12.5 12.5V10H14v4h-4v-1.5h2.5z" />
          </svg>
        </button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div key={layer.fileName} className={`layer-item ${layer.visible ? '' : 'disabled'}`}>
            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggleLayer(index)}
              />
              <span
                className="color-indicator"
                style={{ backgroundColor: layer.color }}
              />
              <span className="layer-name">{layer.name}</span>
            </label>
            <input
              type="range"
              className="opacity-slider"
              min="0"
              max="100"
              value={Math.round(layer.opacity * 100)}
              onChange={(e) => onOpacityChange(index, parseInt(e.target.value) / 100)}
              title={`不透明度: ${Math.round(layer.opacity * 100)}%`}
            />
          </div>
        ))}
      </div>
      {layers.length === 0 && (
        <div className="empty-state">
          <p>暂无图层</p>
          <p className="hint">请加载 CAM 文件</p>
        </div>
      )}
    </div>
  );
};

export default LayerPanel;
