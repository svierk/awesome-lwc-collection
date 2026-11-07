import CLEAR from '@salesforce/label/c.SignaturePad_Clear';
import DOWNLOAD from '@salesforce/label/c.SignaturePad_Download';
import ERROR_SAVING from '@salesforce/label/c.SignaturePad_ErrorSaving';
import FILE_TITLE from '@salesforce/label/c.SignaturePad_FileTitle';
import PEN_COLOR from '@salesforce/label/c.SignaturePad_PenColor';
import PLACEHOLDER from '@salesforce/label/c.SignaturePad_Placeholder';
import PROVIDE_SIGNATURE from '@salesforce/label/c.SignaturePad_ProvideSignature';
import SAVE from '@salesforce/label/c.SignaturePad_Save';
import SAVED from '@salesforce/label/c.SignaturePad_Saved';
import SAVE_SIGNATURE from '@salesforce/label/c.SignaturePad_SaveSignature';
import SAVING from '@salesforce/label/c.SignaturePad_Saving';
import STROKE_WIDTH from '@salesforce/label/c.SignaturePad_StrokeWidth';
import SUCCESS from '@salesforce/label/c.SignaturePad_Success';
import TITLE from '@salesforce/label/c.SignaturePad_Title';
import UNDO from '@salesforce/label/c.SignaturePad_Undo';
import { formatLabel } from 'c/labelUtils';
import CONTENT_DOCUMENT_ID from '@salesforce/schema/ContentVersion.ContentDocumentId';
import { showErrorToast } from 'c/errorUtils';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, wire } from 'lwc';

/**
 * A canvas-based signature capture component with mouse and touch support.
 * @alias SignaturePad
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires SignaturePad#signaturechange
 * @fires SignaturePad#signaturesave
 *
 * @example
 * <c-signature-pad record-id={recordId} save-to-record onsignaturesave={handleSignatureSave}></c-signature-pad>
 */
export default class SignaturePad extends LightningElement {
  labels = {
    title: TITLE,
    saving: SAVING,
    placeholder: PLACEHOLDER,
    penColor: PEN_COLOR,
    undo: UNDO,
    clear: CLEAR,
    download: DOWNLOAD,
    save: SAVE
  };

  /**
   * The height of the signature area, for example '400px'. By default it depends on the screen size.
   * @type {string}
   * @default ''
   */
  @api height = '';

  /**
   * The record to save the signature to. Set automatically on record pages.
   * @type {string}
   */
  @api recordId;

  /**
   * If present, a signature is required by the validate method.
   * @type {boolean}
   * @default false
   */
  @api required = false;

  /**
   * If present, a button saves the signature as a file on the record given by record-id.
   * @type {boolean}
   * @default false
   */
  @api saveToRecord = false;

  /**
   * The initial pen color.
   * @type {string}
   * @default '#000000'
   */
  @api
  get penColor() {
    return this._penColor;
  }

  set penColor(value) {
    this._penColor = value;
  }

  /**
   * The initial stroke width in pixels.
   * @type {number}
   * @default 2
   */
  @api
  get strokeWidth() {
    return this._strokeWidth;
  }

  set strokeWidth(value) {
    this._strokeWidth = value;
  }

  /**
   * Read-only. The signature as a PNG data URL, empty while the pad is empty. Also available as a Flow output.
   * @type {string}
   */
  @api
  get signatureDataUrl() {
    return this._signatureDataUrl;
  }

  /**
   * Read-only. The id of the saved file. Empties when the signature changes. Also available as a Flow output.
   * @type {string}
   */
  @api
  get contentDocumentId() {
    return this._contentDocumentId;
  }

  /**
   * Checks the required attribute for Flow screens.
   * @returns {{isValid: boolean, errorMessage: (string|undefined)}} The result of the check
   */
  @api
  validate() {
    if (!this.required) return { isValid: true };
    if (this.isEmpty) return { isValid: false, errorMessage: PROVIDE_SIGNATURE };
    if (this.showSave && !this.contentDocumentId) {
      return { isValid: false, errorMessage: SAVE_SIGNATURE };
    }
    return { isValid: true };
  }

  isEmpty = true;
  isSaving = false;

  _penColor = '#000000';
  _strokeWidth = 2;
  _signatureDataUrl = '';
  _contentDocumentId;
  _contentVersionId;
  _renderedHeight;
  _canvas;
  _ctx;
  _isDrawing = false;
  _strokes = [];
  _currentPoints = [];
  _lastX = 0;
  _lastY = 0;
  _initialized = false;

  @wire(getRecord, { recordId: '$_contentVersionId', fields: [CONTENT_DOCUMENT_ID] })
  wiredContentVersion({ data, error }) {
    if (data) {
      this._finishSave(data.fields.ContentDocumentId.value);
    } else if (error) {
      this._failSave(error);
    }
  }

  renderedCallback() {
    if (this._initialized && this._renderedHeight === this.height) return;
    this._initialized = true;
    this._renderedHeight = this.height;
    this._canvas = this.template.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    const { width, height } = this._canvas.getBoundingClientRect();
    this._canvas.width = width || this._canvas.offsetWidth || 600;
    this._canvas.height = height || this._canvas.offsetHeight || 240;
    this._redrawAll();
  }

  get wrapperStyle() {
    return this.height ? `height: ${this.height}` : '';
  }

  get showSave() {
    return this.saveToRecord && Boolean(this.recordId);
  }

  get isSaveDisabled() {
    return this.isEmpty || this.isSaving || Boolean(this.contentDocumentId);
  }

  get downloadVariant() {
    return this.showSave ? 'neutral' : 'brand';
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
    this._signatureDataUrl = dataUrl;
    this.dispatchEvent(
      new CustomEvent('signaturechange', {
        detail: { dataUrl, isEmpty: this.isEmpty }
      })
    );
    this.dispatchEvent(new FlowAttributeChangeEvent('signatureDataUrl', dataUrl));
    if (this._contentDocumentId) {
      this._contentDocumentId = undefined;
      this._contentVersionId = undefined;
      this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentId', undefined));
    }
  }

  _finishSave(contentDocumentId) {
    this.isSaving = false;
    this._contentDocumentId = contentDocumentId;
    this.dispatchEvent(new CustomEvent('signaturesave', { detail: { contentDocumentId } }));
    this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentId', contentDocumentId));
    this.dispatchEvent(new ShowToastEvent({ title: SUCCESS, message: SAVED, variant: 'success' }));
  }

  _failSave(error) {
    this.isSaving = false;
    showErrorToast(this, ERROR_SAVING, error);
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
    this._penColor = event.target.value;
  }

  handleStrokeWidthChange(event) {
    this._strokeWidth = Number.parseInt(event.target.value, 10);
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

  async handleSave() {
    this.isSaving = true;
    try {
      const { id } = await createRecord({
        apiName: 'ContentVersion',
        fields: {
          Title: FILE_TITLE,
          PathOnClient: 'signature.png',
          VersionData: this._signatureDataUrl.split(',')[1],
          FirstPublishLocationId: this.recordId
        }
      });
      this._contentVersionId = id;
    } catch (error) {
      this._failSave(error);
    }
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
    return formatLabel(STROKE_WIDTH, this.strokeWidth);
  }
}
