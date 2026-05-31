import { Component, inject, OnDestroy, AfterViewInit, ElementRef, viewChild, effect } from '@angular/core';
import * as L from 'leaflet';
import { AppStore } from '../../state/app.store';
import { Country } from '../../core/models/country.model';

type GeoLayer = L.GeoJSON & { feature?: GeoJSON.Feature };

@Component({
  selector: 'app-world-map',
  standalone: true,
  template: `
    <div class="w-full h-full relative">
      <div #mapEl class="w-full h-full"></div>
      @if (loading) {
        <div class="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div class="text-zinc-500 text-sm">Loading map…</div>
        </div>
      }
    </div>
  `,
})
export class WorldMapComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(AppStore);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private tooltip!: L.Tooltip;
  loading = true;

  ngAfterViewInit(): void {
    this.initMap();
    this.loadGeoJSON();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapEl().nativeElement, {
      center: [25, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    ).addTo(this.map);

    this.tooltip = L.tooltip({ permanent: false, className: 'map-tooltip', offset: [0, -5] });
  }

  private async loadGeoJSON(): Promise<void> {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
      );
      if (!res.ok) throw new Error('Failed to load GeoJSON');
      const data: GeoJSON.FeatureCollection = await res.json();
      this.renderGeoJSON(data);
    } catch {
      // Fallback: show placeholder message
      console.warn('World map GeoJSON unavailable');
    } finally {
      this.loading = false;
    }
  }

  private renderGeoJSON(data: GeoJSON.FeatureCollection): void {
    const store = this.store;

    this.geoLayer = L.geoJSON(data, {
      style: (feature) => {
        const country = this.findCountry(feature);
        return {
          fillColor: country ? this.rateToColor(this.bestRate(country)) : '#18181b',
          fillOpacity: country ? 0.8 : 0.3,
          color: '#27272a',
          weight: 0.5,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const country = this.findCountry(feature);

        layer.on('mouseover', (e: L.LeafletMouseEvent) => {
          const f = e.target as GeoLayer;
          f.setStyle({ weight: 1.5, color: '#a3e635', fillOpacity: 0.9 });
          const name = feature.properties?.['ADMIN'] ?? feature.properties?.['NAME'] ?? 'Unknown';
          const rate = country ? this.bestRate(country) : null;
          const content = country
            ? `<div class="font-medium">${country.flag ?? ''} ${name}</div>
               <div class="text-zinc-400 text-xs">Best SE: ${rate !== null ? (rate * 100).toFixed(1) + '%' : 'N/A'}</div>
               <div class="text-zinc-500 text-xs">Click for details</div>`
            : `<div class="text-zinc-400">${name}</div><div class="text-zinc-600 text-xs">Not in dataset</div>`;
          this.tooltip.setContent(`<div style="background:#18181b;border:1px solid #27272a;border-radius:6px;padding:8px 10px;color:#fafafa;font-size:12px;min-width:130px">${content}</div>`);
          this.tooltip.setLatLng(e.latlng).addTo(this.map);
        });

        layer.on('mouseout', (e: L.LeafletMouseEvent) => {
          this.geoLayer.resetStyle(e.target as GeoLayer);
          this.tooltip.remove();
        });

        layer.on('click', () => {
          if (country) store.selectCountry(country);
        });
      },
    }).addTo(this.map);

    this.addLegend();
  }

  private findCountry(feature: GeoJSON.Feature | undefined): Country | undefined {
    if (!feature?.properties) return undefined;
    const iso2: string = feature.properties['ISO_A2'] ?? '';
    const iso3: string = feature.properties['ISO_A3'] ?? '';
    return this.store.countries().find(
      c => c.code === iso2 || c.code === iso3 ||
           c.code.toLowerCase() === iso2.toLowerCase()
    );
  }

  private bestRate(c: Country): number | null {
    return c.effectiveRates.bestSelfEmployment['60k'] ?? c.effectiveRates.employment['60k'];
  }

  private rateToColor(rate: number | null): string {
    if (rate === null) return '#18181b';
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
        <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:10px 12px;color:#fafafa;font-size:11px">
          <p style="margin:0 0 6px;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Effective SE rate</p>
          <div style="display:flex;gap:2px;margin-bottom:4px">
            <div style="width:32px;height:8px;background:#a3e635;border-radius:2px 0 0 2px"></div>
            <div style="width:32px;height:8px;background:#84cc16"></div>
            <div style="width:32px;height:8px;background:#facc15"></div>
            <div style="width:32px;height:8px;background:#fb923c"></div>
            <div style="width:32px;height:8px;background:#f87171;border-radius:0 2px 2px 0"></div>
          </div>
          <div style="display:flex;justify-content:space-between;color:#71717a">
            <span>0%</span><span>15%</span><span>25%</span><span>35%</span><span>50%+</span>
          </div>
        </div>`;
      return div;
    };
    legend.addTo(this.map);
  }
}
