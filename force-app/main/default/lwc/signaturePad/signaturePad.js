import { LightningElement } from 'lwc';

/**
 * A canvas-based signature capture component with mouse and touch support.
 * @alias SignaturePad
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-signature-pad onsignaturechange={handleSignatureChange}></c-signature-pad>
 */
export default class SignaturePad extends LightningElement {
  penColor = '#000000';
  strokeWidth = 2;
  isEmpty = true;

  _canvas;
  _ctx;
  _isDrawing = false;
  _strokes = [];
  _currentPoints = [];
  _lastX = 0;
  _lastY = 0;
  _initialized = false;

  renderedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    this._canvas = this.template.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    const { width, height } = this._canvas.getBoundingClientRect();
    this._canvas.width = width || this._canvas.offsetWidth || 600;
    this._canvas.height = height || this._canvas.offsetHeight || 240;
  }

  _getEventPos(event) {
    const rect = this._canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  }

  _beginStroke(pos) {
    this._isDrawing = true;
    this._currentPoints = [{ x: pos.x, y: pos.y }];
    this._lastX = pos.x;
    this._lastY = pos.y;

    this._ctx.beginPath();
    this._ctx.arc(pos.x, pos.y, this.strokeWidth / 2, 0, Math.PI * 2);
    this._ctx.fillStyle = this.penColor;
    this._ctx.fill();
  }

  _extendStroke(pos) {
    if (!this._isDrawing) return;

    this._ctx.beginPath();
    this._ctx.moveTo(this._lastX, this._lastY);
    this._ctx.lineTo(pos.x, pos.y);
    this._ctx.strokeStyle = this.penColor;
    this._ctx.lineWidth = this.strokeWidth;
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';
    this._ctx.stroke();

    this._currentPoints.push({ x: pos.x, y: pos.y });
    this._lastX = pos.x;
    this._lastY = pos.y;
  }

  _finishStroke() {
    if (!this._isDrawing) return;
    this._isDrawing = false;

    this._strokes.push({
      points: this._currentPoints,
      color: this.penColor,
      width: this.strokeWidth
    });
    this._currentPoints = [];
    this.isEmpty = false;
    this._dispatchSignatureChange();
  }

  _redrawAll() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    for (const stroke of this._strokes) {
      this._drawStroke(stroke);
    }
  }

  _drawStroke(stroke) {
    const { points, color, width } = stroke;
    if (!points.length) return;

    this._ctx.fillStyle = color;
    this._ctx.strokeStyle = color;
    this._ctx.lineWidth = width;
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';

    if (points.length === 1) {
      this._ctx.beginPath();
      this._ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
      this._ctx.fill();
    } else {
      this._ctx.beginPath();
      this._ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this._ctx.lineTo(points[i].x, points[i].y);
      }
      this._ctx.stroke();
    }
  }

  _dispatchSignatureChange() {
    const dataUrl = this.isEmpty ? '' : this._canvas.toDataURL('image/png');
    this.dispatchEvent(
      new CustomEvent('signaturechange', {
        detail: { dataUrl, isEmpty: this.isEmpty }
      })
    );
  }

  handleMouseDown(event) {
    event.preventDefault();
    this._beginStroke(this._getEventPos(event));
  }

  handleMouseMove(event) {
    if (!this._isDrawing) return;
    event.preventDefault();
    this._extendStroke(this._getEventPos(event));
  }

  handleMouseUp() {
    this._finishStroke();
  }

  handleMouseLeave() {
    this._finishStroke();
  }

  handleTouchStart(event) {
    event.preventDefault();
    this._beginStroke(this._getEventPos(event));
  }

  handleTouchMove(event) {
    event.preventDefault();
    this._extendStroke(this._getEventPos(event));
  }

  handleTouchEnd() {
    this._finishStroke();
  }

  handleColorChange(event) {
    this.penColor = event.target.value;
  }

  handleStrokeWidthChange(event) {
    this.strokeWidth = Number.parseInt(event.target.value, 10);
  }

  handleUndo() {
    this._strokes.pop();
    this.isEmpty = this._strokes.length === 0;
    this._redrawAll();
    this._dispatchSignatureChange();
  }

  handleClear() {
    this._strokes = [];
    this.isEmpty = true;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._dispatchSignatureChange();
  }

  handleDownload() {
    const dataUrl = this._canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'signature.png';
    link.click();
  }

  get isUndoDisabled() {
    return this._strokes.length === 0;
  }

  get strokeWidthLabel() {
    return `Stroke Width (${this.strokeWidth}px)`;
  }
}
