/**
 * @file tooltip.js
 * @description 데스크톱 호버(mouseover/mouseout) 및 모바일 터치/클릭 말풍선 툴팁 제어 유틸리티 (ESM)
 */

let activeTooltipEl = null;
let activeBtnEl = null;
let autoCloseTimer = null;

export function showStepTooltip(targetBtn, stayDurationMs = 3500) {
  if (!targetBtn) return;

  // 이미 같은 버튼의 툴팁이 열려있다면 타이머만 연장
  if (activeTooltipEl && activeBtnEl === targetBtn) {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    if (stayDurationMs > 0) {
      autoCloseTimer = setTimeout(() => {
        removeStepTooltip();
      }, stayDurationMs);
    }
    return;
  }

  removeStepTooltip();

  const tipText = targetBtn.getAttribute('data-tip');
  if (!tipText) return;

  const btnType = targetBtn.getAttribute('data-type');
  const typeTitle = btnType === 'clean' ? '✔ [양호] 판정 기준' : '💬 [주의] 판정 기준';

  const tooltip = document.createElement('div');
  tooltip.className = 'step-tooltip-popup';
  tooltip.innerHTML = `
    <span class="step-tooltip-title">${typeTitle}</span>
    <span class="step-tooltip-body">${tipText}</span>
  `;

  targetBtn.appendChild(tooltip);
  activeTooltipEl = tooltip;
  activeBtnEl = targetBtn;

  if (navigator.vibrate) {
    try { navigator.vibrate(25); } catch (e) {}
  }

  // 지정 시간 후 부드럽게 자동 닫기 (기본 3.5초)
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  if (stayDurationMs > 0) {
    autoCloseTimer = setTimeout(() => {
      removeStepTooltip();
    }, stayDurationMs);
  }
}

export function removeStepTooltip() {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
  if (activeTooltipEl) {
    if (activeTooltipEl.parentNode) {
      activeTooltipEl.parentNode.removeChild(activeTooltipEl);
    }
    activeTooltipEl = null;
    activeBtnEl = null;
  }
}

export function initTooltipListeners(containerSelector = '#questionsList') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // 1. Desktop Hover: mouseover & mouseout
  container.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.step-r-btn');
    if (btn) {
      showStepTooltip(btn, 0); // 호버 중에는 계속 유지
    }
  });

  container.addEventListener('mouseout', (e) => {
    const btn = e.target.closest('.step-r-btn');
    if (btn) {
      const related = e.relatedTarget;
      if (!related || !btn.contains(related)) {
        removeStepTooltip();
      }
    }
  });

  // 2. Mobile Touch & Click: 터치나 클릭 시 3.5초간 유지
  container.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('.step-r-btn');
    if (!btn) return;
    showStepTooltip(btn, 3500);
  }, { passive: true });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-r-btn');
    if (btn) {
      showStepTooltip(btn, 3500);
    }
  });

  // 3. Global Click Outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.step-r-btn')) {
      removeStepTooltip();
    }
  });
}
