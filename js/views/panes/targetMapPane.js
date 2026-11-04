/**
 * @file targetMapPane.js
 * @description Leaflet + OpenStreetMap 기반 실시간 무료 GIS 관제 지도 및 안부대상자 마커 모듈 (ESM)
 *              - 완전 무료 오픈소스 타일 (API 키 / 과금 일체 없음)
 *              - D1 DB 및 PWA 현장조사 실데이터 기반 위험군 대상자 인터랙티브 마커 핀
 *              - 위기등급별 컬러 핀(초고위험, 고위험, 중위험, 저위험) 및 인포 팝업 연동
 *              - 마커 클릭 시 대상자 상세 원장 팝업(openReviewWorkspace) 연동
 */

const DONG_COORDS = {
  '부평동': [37.4912, 126.6853],
  '산곡동': [37.5054, 126.6741],
  '갈산동': [37.5251, 126.6772],
  '청천동': [37.5342, 126.6548],
  '검암동': [37.5650, 126.6750],
  '연희동': [37.5450, 126.6760],
  '신현동': [37.5180, 126.6730],
  '원창동': [37.5100, 126.6450],
  '마전동': [37.5950, 126.6650],
  '당하동': [37.5900, 126.6750],
  '경서동': [37.5580, 126.6600],
  'default': [37.5450, 126.6760] // 인천 부평구청 중심
};

const GRADE_CONFIG = {
  critical: { label: '초고위험', color: '#dc2626', bg: '#fef2f2', border: '#b91c1c' },
  high: { label: '고위험', color: '#d97706', bg: '#fffbeb', border: '#b45309' },
  mid: { label: '중위험', color: '#16a34a', bg: '#f0fdf4', border: '#15803d' },
  clean: { label: '저위험', color: '#64748b', bg: '#f8fafc', border: '#475569' }
};

export class TargetMapPane {
  constructor(options = {}) {
    this.container = null;
    this.map = null;
    this.markerLayer = null;
    this.cases = options.cases || [];
    this.onTargetClick = options.onTargetClick || null;
  }

  /**
   * 페인 마운트 및 초기화
   * @param {HTMLElement|string} containerEl 
   * @param {Object} [options] 
   */
  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (options.cases) this.cases = options.cases;
    if (options.onTargetClick) this.onTargetClick = options.onTargetClick;

    this.bindEvents();
  }

  /**
   * 데이터 갱신 시 마커 실시간 재배치
   * @param {Array} cases 
   */
  setCases(cases) {
    this.cases = cases || [];
    if (this.map) {
      this.renderMarkers();
    }
  }

  /**
   * Leaflet 지도 엔진 초기화 (최초 1회 실행)
   */
  initMapIfNeeded() {
    if (this.map) return;

    const mapArea = document.getElementById('leafletMapArea');
    if (!mapArea || typeof L === 'undefined') {
      console.warn('[TargetMapPane] Leaflet 라이브러리 또는 컨테이너를 찾을 수 없습니다.');
      return;
    }

    // 인천 부평구 중심 좌표 및 줌 레벨 설정
    this.map = L.map('leafletMapArea', {
      center: [37.5250, 126.6750],
      zoom: 12,
      zoomControl: true
    });

    // OpenStreetMap 표준 무료 타일 레이어 (API 키 불필요)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  /**
   * 주소 문자열로부터 위도/경도 산출 (동별 중심 + 고유 UID 해시 오프셋)
   * @param {Object} c 대상자 객체
   * @returns {[number, number]} [lat, lng]
   */
  getCoordsForCase(c) {
    const fullAddr = `${c.rawAddress || ''} ${c.address || ''}`;
    let baseCoord = DONG_COORDS['default'];

    for (const [dong, coord] of Object.entries(DONG_COORDS)) {
      if (fullAddr.includes(dong)) {
        baseCoord = coord;
        break;
      }
    }

    // 동일 동 내 대상자 마커 중첩 방지를 위한 고유 UID 해시 미세 오프셋 (약 ±150m)
    let hash = 0;
    const str = c.uid || c.name || '001';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const offsetLat = ((Math.abs(hash) % 200) - 100) * 0.00008;
    const offsetLng = (((Math.abs(hash) >> 3) % 200) - 100) * 0.00008;

    return [baseCoord[0] + offsetLat, baseCoord[1] + offsetLng];
  }

  /**
   * 대상자 실데이터 기반 마커 렌더링
   */
  renderMarkers() {
    if (!this.map || !this.markerLayer) return;
    this.markerLayer.clearLayers();

    if (!Array.isArray(this.cases) || this.cases.length === 0) return;

    this.cases.forEach(c => {
      const coords = this.getCoordsForCase(c);
      const grade = GRADE_CONFIG[c.grade] || GRADE_CONFIG.clean;
      const score = c.score !== undefined ? c.score : 0;

      // 커스텀 원형 마커 핀 (CSS divIcon)
      const markerHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: ${grade.color};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          cursor: pointer;
          font-family: Pretendard, sans-serif;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          transition: transform 0.15s ease;
        ">
          ${score}점
          ${c.grade === 'critical' ? `<span style="
            position: absolute;
            top: -3px;
            left: -3px;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 2px solid ${grade.color};
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            pointer-events: none;
          "></span>` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-target-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(coords, { icon: customIcon });

      // 인포윈도우 팝업 내용
      const popupContent = `
        <div style="font-family: Pretendard, -apple-system, sans-serif; min-width: 220px; padding: 4px 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
              ${c.name} <span style="font-size: 11.5px; font-weight: 600; color: #64748b;">(${c.gender || '*'}/${c.age || 70}세)</span>
            </div>
            <span style="font-size: 11px; font-weight: 700; color: ${grade.color}; background: ${grade.bg}; border: 1px solid ${grade.border}40; padding: 2px 6px; border-radius: 3px;">
              ${grade.label} (${score}점)
            </span>
          </div>

          <div style="font-size: 11.5px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
            <div><strong>관리번호:</strong> <span style="font-family: monospace;">${c.uid}</span></div>
            <div><strong>소재지:</strong> ${c.address}</div>
            <div><strong>주거형태:</strong> ${c.living || '다가구·다세대'}</div>
            <div><strong>연계사업단:</strong> <span style="color: #2563eb; font-weight: 700;">${(c.buList || []).join(', ') || '배차대기'}</span></div>
          </div>

          <button type="button" class="btn-popup-view-detail" data-popup-uid="${c.uid}" style="
            width: 100%;
            background: #0f172a;
            color: #ffffff;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          ">
            수혜자 상세 원장 보기
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.querySelector(`.btn-popup-view-detail[data-popup-uid="${c.uid}"]`);
        if (btn) {
          btn.onclick = () => {
            if (this.onTargetClick) {
              this.onTargetClick(c);
            }
          };
        }
      });

      this.markerLayer.addLayer(marker);
    });
  }

  /**
   * 뷰 모드 전환 (목록 vs 지도)
   * @param {'list'|'map'} mode 
   */
  switchMode(mode) {
    const btnModeList = document.getElementById('btnViewModeList');
    const btnModeMap = document.getElementById('btnViewModeMap');
    const tableEl = document.getElementById('targetTableView');
    const mapEl = document.getElementById('targetMapView');

    if (!btnModeList || !btnModeMap || !tableEl || !mapEl) return;

    if (mode === 'map') {
      btnModeMap.classList.add('active');
      btnModeList.classList.remove('active');
      tableEl.style.display = 'none';
      mapEl.style.display = 'block';

      this.initMapIfNeeded();
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 150);
    } else {
      btnModeList.classList.add('active');
      btnModeMap.classList.remove('active');
      tableEl.style.display = 'block';
      mapEl.style.display = 'none';
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const btnModeList = document.getElementById('btnViewModeList');
    const btnModeMap = document.getElementById('btnViewModeMap');

    if (btnModeList) {
      btnModeList.onclick = () => this.switchMode('list');
    }

    if (btnModeMap) {
      btnModeMap.onclick = () => this.switchMode('map');
    }

    // 마커 인포 팝업 내 [수혜자 상세 원장 보기] 버튼 클릭 이벤트 위임 (지연 렌더링 무관 100% 동작)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-popup-view-detail');
      if (btn) {
        const uid = btn.getAttribute('data-popup-uid');
        const item = this.cases.find(c => c.uid === uid);
        if (item && this.onTargetClick) {
          this.onTargetClick(item);
        } else if (item && window.admin && window.admin.targetListPane) {
          window.admin.targetListPane.openDetailModal(item);
        }
      }
    });
  }
}
