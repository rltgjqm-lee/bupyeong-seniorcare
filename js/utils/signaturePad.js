/**
 * @file signaturePad.js
 * @description HTML5 Canvas 터치 및 마우스 전자서명 패드 모달 엔진 (ESM)
 * - 부평구 PWA 표준 전자서명 모달 지원
 */

import { notifier } from './notifier.js';

export class SignaturePadModal {
  constructor() {
    this.modalEl = null;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.hasDrawn = false;
    this.currentCallback = null;
    this.initModal();
  }

  initModal() {
    let container = document.getElementById('bupyeongSignatureModal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bupyeongSignatureModal';
      container.className = 'sig-modal-container';
      container.innerHTML = `
        <div class="sig-modal-backdrop"></div>
        <div class="sig-modal-card">
          <div class="sig-modal-header">
            <h3 class="sig-modal-title" id="sigModalTitle">전자 서명</h3>
            <button class="sig-btn-close" id="sigBtnClose">&times;</button>
          </div>
          <div class="sig-modal-body">
            <div class="sig-canvas-wrap">
              <canvas id="sigCanvas" width="360" height="180"></canvas>
              <div class="sig-guide-text" id="sigGuideText">이곳에 정자로 서명해 주십시오</div>
            </div>
          </div>
          <div class="sig-modal-footer">
            <button type="button" class="btn-secondary-action sig-btn-clear" id="sigBtnClear">다시 쓰기</button>
            <button type="button" class="btn-primary-action sig-btn-save" id="sigBtnSave">서명 완료</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }
    this.modalEl = container;
    this.canvas = container.querySelector('#sigCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.modalEl.querySelector('#sigBtnClose');
    const clearBtn = this.modalEl.querySelector('#sigBtnClear');
    const saveBtn = this.modalEl.querySelector('#sigBtnSave');
    const backdrop = this.modalEl.querySelector('.sig-modal-backdrop');

    closeBtn.addEventListener('click', () => this.close());
    backdrop.addEventListener('click', () => this.close());
    clearBtn.addEventListener('click', () => this.clear());
    saveBtn.addEventListener('click', () => this.save());

    // Canvas Touch & Mouse Drawing
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      if (e.touches && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.hasDrawn = true;
      const guide = this.modalEl.querySelector('#sigGuideText');
      if (guide) guide.style.display = 'none';

      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#0f172a';
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    };

    const endDraw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.isDrawing = false;
      this.ctx.closePath();
    };

    // 터치 이벤트
    this.canvas.addEventListener('touchstart', startDraw, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    this.canvas.addEventListener('touchend', endDraw, { passive: false });
    this.canvas.addEventListener('touchcancel', endDraw, { passive: false });

    // 마우스 이벤트
    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', endDraw);
    this.canvas.addEventListener('mouseleave', endDraw);
  }

  open(title, callback) {
    this.currentCallback = callback;
    const titleEl = this.modalEl.querySelector('#sigModalTitle');
    if (titleEl) titleEl.textContent = title || '전자 서명';
    this.clear();
    this.modalEl.classList.add('active');
  }

  close() {
    this.modalEl.classList.remove('active');
    this.currentCallback = null;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
    const guide = this.modalEl.querySelector('#sigGuideText');
    if (guide) guide.style.display = 'block';
  }

  save() {
    if (!this.hasDrawn) {
      notifier.toast('서명을 작성해 주십시오.', 'warning');
      return;
    }
    const dataUrl = this.canvas.toDataURL('image/png');
    if (typeof this.currentCallback === 'function') {
      this.currentCallback(dataUrl);
    }
    this.close();
  }
}

export const signaturePad = new SignaturePadModal();
