import { notifier } from './notifier.js';

class SignaturePadModal {
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
    let container = document.getElementById('wrkSignatureModal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wrkSignatureModal';
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
    };

    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', endDraw);

    this.canvas.addEventListener('touchstart', startDraw, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', endDraw);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
    const guide = this.modalEl.querySelector('#sigGuideText');
    if (guide) guide.style.display = 'block';
  }

  open({ title = '전자 서명', signerName = '', onSave = null }) {
    this.currentCallback = onSave;
    const titleEl = this.modalEl.querySelector('#sigModalTitle');
    if (titleEl) {
      titleEl.innerText = signerName ? `${signerName} 님 전자 서명` : title;
    }
    this.clear();
    this.modalEl.style.display = 'flex';
    requestAnimationFrame(() => {
      this.modalEl.classList.add('active');
    });
  }

  close() {
    this.modalEl.classList.remove('active');
    setTimeout(() => {
      this.modalEl.style.display = 'none';
      this.currentCallback = null;
    }, 200);
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
