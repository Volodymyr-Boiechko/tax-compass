import { Component, inject, OnDestroy, AfterViewInit, ElementRef, viewChild, effect } from '@angular/core';
import * as L from 'leaflet';
import { AppStore } from '../../state/app.store';
import { ThemeService } from '../../core/services/theme.service';
import { Country } from '../../core/models/country.model';
import { matchGeoFeature } from './iso-matcher';

type GeoLayer = L.GeoJSON & { feature?: GeoJSON.Feature };

const DARK_TILES  = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTR   = '© OpenStreetMap contributors © CARTO';

@Component({
  selector: 'app-world-map',
  standalone: true,
  template: `
    <div class="w-full h-full relative">
      <div #mapEl class="w-full h-full"></div>
      @if (loading) {
        <div class="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]">
          <div class="text-[var(--color-text-tertiary)] text-sm">Loading map…</div>
        </div>
      }
    </div>
  `,
})
export class WorldMapComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(AppStore);
  private readonly themeService = inject(ThemeService);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  private map!: L.Map;
  private tileLayer!: L.TileLayer;
  private geoLayer!: L.GeoJSON;
  private tooltip!: L.Tooltip;
  private mapReady = false;

  loading = true;

  constructor() {
    // Swap tiles + re-color choropleth on theme change
    effect(() => {
      const theme = this.themeService.theme();
      if (!this.mapReady) return;
      this.swapTiles(theme);
      this.recolorChoropleth(theme);
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.mapReady = true;
    this.loadGeoJSON();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const theme = this.themeService.theme();

    this.map = L.map(this.mapEl().nativeElement, {
      center: [25, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
    });

    this.tileLayer = L.tileLayer(theme === 'dark' ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.map);

    this.tooltip = L.tooltip({ permanent: false, className: 'tc-map-tooltip', offset: [0, -5] });
  }

  private swapTiles(theme: 'dark' | 'light'): void {
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(theme === 'dark' ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.map);
  }

  private recolorChoropleth(theme: 'dark' | 'light'): void {
    if (!this.geoLayer) return;
    this.geoLayer.eachLayer((layer) => {
      const feature = (layer as GeoLayer).feature;
      const country = this.findCountry(feature);
      (layer as L.Path).setStyle({
        fillColor: country ? this.rateToColor(this.bestRate(country), theme) : (theme === 'dark' ? '#18181b' : '#e4e4e7'),
        fillOpacity: country ? 0.8 : 0.3,
        color: theme === 'dark' ? '#27272a' : '#d4d4d8',
        weight: 0.5,
      });
    });
  }

  private async loadGeoJSON(): Promise<void> {
    try {
      const res = await fetch('assets/data/world.geojson');
      if (!res.ok) throw new Error('GeoJSON load failed');
      const data: GeoJSON.FeatureCollection = await res.json();
      this.renderGeoJSON(data);
    } catch {
      console.warn('World map GeoJSON unavailable — using empty map.');
    } finally {
      this.loading = false;
    }
  }

  private renderGeoJSON(data: GeoJSON.FeatureCollection): void {
    const store = this.store;
    const theme = this.themeService.theme();

    this.geoLayer = L.geoJSON(data, {
      style: (feature) => {
        const country = this.findCountry(feature);
        const t = this.themeService.theme();
        return {
          fillColor: country ? this.rateToColor(this.bestRate(country), t) : (t === 'dark' ? '#18181b' : '#e4e4e7'),
          fillOpacity: country ? 0.8 : 0.3,
          color: t === 'dark' ? '#27272a' : '#d4d4d8',
          weight: 0.5,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const country = this.findCountry(feature);

        layer.on('mouseover', (e: L.LeafletMouseEvent) => {
          (e.target as GeoLayer).setStyle({ weight: 1.5, color: '#a3e635', fillOpacity: 0.9 });
          const name: string = feature.properties?.['name'] ?? feature.properties?.['ADMIN'] ?? feature.properties?.['NAME'] ?? 'Unknown';
          const rate = country ? this.bestRate(country) : null;
          const content = country
            ? `<div class="map-popup">
                <div style="font-weight:600;margin-bottom:2px">${country.flag ?? ''} ${name}</div>
                <div class="map-popup-secondary">Best SE: ${rate !== null ? (rate * 100).toFixed(1) + '%' : 'N/A'}</div>
                <div class="map-popup-muted">Click for details</div>
               </div>`
            : `<div class="map-popup">
                <div class="map-popup-secondary">${name}</div>
                <div class="map-popup-muted">Not in dataset</div>
               </div>`;
          this.tooltip.setContent(content).setLatLng(e.latlng).addTo(this.map);
        });

        layer.on('mouseout', (e: L.LeafletMouseEvent) => {
          this.geoLayer.resetStyle(e.target as GeoLayer);
          this.tooltip.remove();
        });

        layer.on('click', () => { if (country) store.selectCountry(country); });
      },
    }).addTo(this.map);

    this.addLegend();
  }

  private findCountry(feature: GeoJSON.Feature | undefined): Country | undefined {
    if (!feature?.properties) return undefined;
    const code = matchGeoFeature(feature.properties as Record<string, unknown>);
    if (!code) return undefined;
    return this.store.countries().find(c => c.code === code);
  }

  private bestRate(c: Country): number | null {
    return c.effectiveRates.bestSelfEmployment['60k'] ?? c.effectiveRates.employment['60k'];
  }

  private rateToColor(rate: number | null, theme: 'dark' | 'light'): string {
    if (rate === null) return theme === 'dark' ? '#18181b' : '#e4e4e7';
    if (theme === 'light') {
      if (rate < 0.05) return '#4d7c0f';
      if (rate < 0.15) return '#65a30d';
      if (rate < 0.25) return '#b45309';
      if (rate < 0.35) return '#c2410c';
      return '#b91c1c';
    }
    if (rate < 0.05) return '#a3e635';
    if (rate < 0.15) return '#84cc16';
    if (rate < 0.25) return '#facc15';
    if (rate < 0.35) return '#fb923c';
    return '#f87171';
  }

  private addLegend(): void {
    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div class="map-legend">
          <p class="map-legend-label">Effective SE rate</p>
          <div style="display:flex;gap:2px;margin-bottom:4px">
            <div style="width:28px;height:8px;background:#a3e635;border-radius:2px 0 0 2px"></div>
            <div style="width:28px;height:8px;background:#84cc16"></div>
            <div style="width:28px;height:8px;background:#facc15"></div>
            <div style="width:28px;height:8px;background:#fb923c"></div>
            <div style="width:28px;height:8px;background:#f87171;border-radius:0 2px 2px 0"></div>
          </div>
          <div class="map-legend-scale">
            <span>0%</span><span>15%</span><span>25%</span><span>35%</span><span>50%+</span>
          </div>
        </div>`;
      return div;
    };
    legend.addTo(this.map);
  }
}
