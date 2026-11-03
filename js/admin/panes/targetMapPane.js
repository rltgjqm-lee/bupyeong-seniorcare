/**
 * @file targetMapPane.js
 * @description 참여기관 관리자 포털: 부평구 22개 행정동 GIS 지도 관제 페인 (Leaflet 1.9.4) (ESM)
 */

import { BUPYEONG_CENTER_COORDS, BUPYEONG_DONG_COORDS } from '../../data/bupyeongCoords.js';

export class TargetMapPane {
  constructor(options = {}) {
    this.cases = options.cases || [];
    this.map = null;
    this.markersGroup = null;
  }

  setCases(newCases) {
    this.cases = newCases;
    if (this.map) {
      this.updateMarkers();
    }
  }

  invalidateMapSize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  initMap() {
    if (this.map) return;
    const mapContainer = document.getElementById('bupyeongAdminMap');
    if (!mapContainer || typeof L === 'undefined') return;

    // 부평구청 중심 초기화
    this.map = L.map('bupyeongAdminMap').setView(BUPYEONG_CENTER_COORDS, 13);

    // OpenStreetMap 무료 타일맵 연동 (비용 0원)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors | 부평구 통합돌봄'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.updateMarkers();
  }

  updateMarkers() {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    // 1. 부평구 22개 행정동 기본 마커
    Object.keys(BUPYEONG_DONG_COORDS).forEach(dong => {
      if (dong === 'default') return;
      const coords = BUPYEONG_DONG_COORDS[dong];
      const count = this.cases.filter(c => c.dong === dong).length;

      const circle = L.circleMarker(coords, {
        radius: count > 0 ? 12 : 6,
        fillColor: count > 0 ? '#2563eb' : '#94a3b8',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      });

      circle.bindPopup(`
        <div style="font-family: Pretendard, sans-serif; font-size: 13px; line-height: 1.5;">
          <strong style="color: #0f172a; font-size: 14px;">${dong}</strong><br>
          돌봄 안부 가구: <strong style="color: #2563eb;">${count}</strong> 가구
        </div>
      `);

      this.markersGroup.addLayer(circle);
    });

    // 2. 심층연계의뢰 대상자 집중 마커 (펄스 링)
    this.cases.filter(c => c.needsDeepLink).forEach(c => {
      const dongCoords = BUPYEONG_DONG_COORDS[c.dong] || BUPYEONG_CENTER_COORDS;
      // 마커 겹침 방지 미세 오프셋
      const offsetLat = dongCoords[0] + (Math.random() - 0.5) * 0.003;
      const offsetLng = dongCoords[1] + (Math.random() - 0.5) * 0.003;

      const alertMarker = L.circleMarker([offsetLat, offsetLng], {
        radius: 14,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      alertMarker.bindPopup(`
        <div style="font-family: Pretendard, sans-serif; font-size: 12.5px; line-height: 1.5;">
          <div style="font-weight: 800; color: #dc2626; margin-bottom: 2px;">★ 심층상담 연계의뢰 대상</div>
          <div>관리번호: <strong class="font-mono">${c.uid}</strong></div>
          <div>성명: <strong>${c.name}</strong> (${c.dong})</div>
          <div>최근판정: <span style="color:#b91c1c;">${c.lastConsultResult}</span></div>
        </div>
      `);

      this.markersGroup.addLayer(alertMarker);
    });
  }

  render() {
    const el = document.getElementById('paneTargetMap');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>부평구 22개 행정동 GIS 지도 관제</h2>
        <p>인천광역시 부평구 전역의 돌봄 가구 공간 분포 및 심층상담 연계 필요군 실시간 모니터링</p>
      </div>

      <div class="admin-card" style="padding: 0; overflow: hidden; position: relative;">
        <!-- 상단 지도 범례 바 -->
        <div style="display: flex; gap: 16px; padding: 10px 16px; background: #0f172a; color: #ffffff; font-size: 12px; align-items: center;">
          <span style="font-weight: 700;">지도 범례:</span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #2563eb;"></span>
            일반 안부 가구
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #dc2626;"></span>
            ★ 동 복지센터 심층연계의뢰 가구
          </span>
          <span style="margin-left: auto; color: #94a3b8; font-family: monospace;">부평구 중심 [37.5070, 126.7218]</span>
        </div>

        <div id="bupyeongAdminMap" style="width: 100%; height: 580px; background: #e2e8f0;"></div>
      </div>
    `;

    setTimeout(() => {
      this.initMap();
    }, 50);
  }
}
