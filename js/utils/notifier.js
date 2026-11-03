/**
 * @file notifier.js
 * @description 브라우저 네이티브 alert/confirm을 대체하는 슬레이트 톤앤매너 인앱 토스트 및 모달 알림 모듈 (ESM)
 */

class Notifier {
  constructor() {
    this.toastContainer = null;
    this.modalOverlay = null;
    this.initContainers();
  }

  initContainers() {
    if (typeof document === 'undefined') return;

    // 1. Toast Container
    let toastBox = document.getElementById('bupyeongToastContainer');
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.id = 'bupyeongToastContainer';
      toastBox.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        max-width: 90vw;
        width: 380px;
      `;
      document.body.appendChild(toastBox);
    }
    this.toastContainer = toastBox;

    // 2. Modal Container
    let modalBox = document.getElementById('wrkModalContainer');
    if (!modalBox) {
      modalBox = document.createElement('div');
      modalBox.id = 'wrkModalContainer';
      modalBox.className = 'wrk-modal-container';
      document.body.appendChild(modalBox);
    }
    this.modalOverlay = modalBox;
  }

  /**
   * 토스트 메시지 표출
   * @param {string} message 
   * @param {'info'|'success'|'warning'|'error'} type 
   * @param {number} duration 
   */
  toast(message, type = 'info', duration = 2500) {
    if (!this.toastContainer) this.initContainers();

    const bgMap = {
      info: '#0f172a',      // Slate 900
      success: '#1e293b',   // Dark Navy
      warning: '#b45309',   // Amber 700
      error: '#b91c1c'      // Red 700
    };

    const toastEl = document.createElement('div');
    toastEl.style.cssText = `
      background: ${bgMap[type] || bgMap.info};
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.45;
      letter-spacing: -0.01em;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
    `;
    toastEl.textContent = message;
    this.toastContainer.appendChild(toastEl);

    // Fade In
    requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateY(0)';
    });

    // Fade Out
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 250);
    }, duration);
  }

  /**
   * 커스텀 인앱 모달 알림 (alert)
   * @param {string|Object} titleOrOptions
   */
  alert(titleOrOptions = '알림', maybeMessage = '', details = [], confirmText = '확인', onConfirm = null) {
    let title = '알림';
    let message = '';
    let confirmBtnText = '확인';
    let callback = null;
    let detailsArr = [];

    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
      title = titleOrOptions.title || '알림';
      message = titleOrOptions.message || '';
      detailsArr = titleOrOptions.details || [];
      confirmBtnText = titleOrOptions.confirmText || '확인';
      callback = titleOrOptions.onConfirm || null;
    } else {
      title = String(titleOrOptions || '알림');
      message = String(maybeMessage || '');
      detailsArr = Array.isArray(details) ? details : [];
      confirmBtnText = confirmText || '확인';
      callback = onConfirm;
    }

    return new Promise((resolve) => {
      if (!this.modalOverlay) this.initContainers();

      const detailsHtml = detailsArr.length > 0 ? `
        <div class="wrk-modal-details">
          ${detailsArr.map(d => `
            <div class="wrk-modal-detail-row">
              <span class="wrk-modal-detail-label">${this.escapeHtml(d.label)}</span>
              <strong class="wrk-modal-detail-val">${this.escapeHtml(String(d.value))}</strong>
            </div>
          `).join('')}
        </div>
      ` : '';

      this.modalOverlay.innerHTML = `
        <div class="wrk-modal-backdrop"></div>
        <div class="wrk-modal-card">
          <div class="wrk-modal-header">
            <h3 class="wrk-modal-title">${this.escapeHtml(title)}</h3>
          </div>
          <div class="wrk-modal-body">
            <p class="wrk-modal-desc">${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
            ${detailsHtml}
          </div>
          <div class="wrk-modal-footer">
            <button class="btn-primary-action wrk-modal-btn" id="wrkModalConfirmBtn">${this.escapeHtml(confirmBtnText)}</button>
          </div>
        </div>
      `;

      this.modalOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        this.modalOverlay.classList.add('active');
      });

      const confirmBtn = document.getElementById('wrkModalConfirmBtn');
      const backdrop = this.modalOverlay.querySelector('.wrk-modal-backdrop');
      const close = () => {
        this.modalOverlay.classList.remove('active');
        setTimeout(() => {
          this.modalOverlay.style.display = 'none';
          this.modalOverlay.innerHTML = '';
        }, 200);
        if (typeof callback === 'function') callback();
        resolve(true);
      };

      if (confirmBtn) confirmBtn.addEventListener('click', close);
      if (backdrop) backdrop.addEventListener('click', close);
    });
  }

  /**
   * 커스텀 인앱 모달 확인/취소창 (confirm)
   * @param {string|Object} titleOrOptions
   */
  confirm(titleOrOptions = '확인', maybeMessage = '', confirmText = '확인', cancelText = '취소', onConfirm = null, onCancel = null) {
    let title = '확인';
    let message = '';
    let cText = '확인';
    let canText = '취소';
    let cbConfirm = null;
    let cbCancel = null;

    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
      title = titleOrOptions.title || '확인';
      message = titleOrOptions.message || '';
      cText = titleOrOptions.confirmText || '확인';
      canText = titleOrOptions.cancelText || '취소';
      cbConfirm = titleOrOptions.onConfirm || null;
      cbCancel = titleOrOptions.onCancel || null;
    } else {
      title = String(titleOrOptions || '확인');
      message = String(maybeMessage || '');
      cText = confirmText || '확인';
      canText = cancelText || '취소';
      cbConfirm = onConfirm;
      cbCancel = onCancel;
    }

    return new Promise((resolve) => {
      if (!this.modalOverlay) this.initContainers();

      this.modalOverlay.innerHTML = `
        <div class="wrk-modal-backdrop"></div>
        <div class="wrk-modal-card">
          <div class="wrk-modal-header">
            <h3 class="wrk-modal-title">${this.escapeHtml(title)}</h3>
          </div>
          <div class="wrk-modal-body">
            <p class="wrk-modal-desc">${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
          </div>
          <div class="wrk-modal-footer" style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn-secondary-action" id="wrkModalCancelBtn" style="min-width:76px; padding:8px 12px; font-size:12px;">${this.escapeHtml(canText)}</button>
            <button class="btn-primary-action" id="wrkModalConfirmBtn" style="min-width:76px; padding:8px 12px; font-size:12px; background:#0f172a; color:#fff;">${this.escapeHtml(cText)}</button>
          </div>
        </div>
      `;

      this.modalOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        this.modalOverlay.classList.add('active');
      });

      const confirmBtn = document.getElementById('wrkModalConfirmBtn');
      const cancelBtn = document.getElementById('wrkModalCancelBtn');
      const backdrop = this.modalOverlay.querySelector('.wrk-modal-backdrop');

      const closeModal = (callback, result) => {
        this.modalOverlay.classList.remove('active');
        setTimeout(() => {
          this.modalOverlay.style.display = 'none';
          this.modalOverlay.innerHTML = '';
        }, 200);
        if (typeof callback === 'function') callback();
        resolve(result);
      };

      if (confirmBtn) confirmBtn.addEventListener('click', () => closeModal(cbConfirm, true));
      if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(cbCancel, false));
      if (backdrop) backdrop.addEventListener('click', () => closeModal(cbCancel, false));
    });
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const notifier = new Notifier();
