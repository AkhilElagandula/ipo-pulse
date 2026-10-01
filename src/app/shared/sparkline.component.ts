import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Dependency-free SVG line chart. Green when the series ends higher than it starts. */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" preserveAspectRatio="none" [style.height.px]="height()" role="img" [attr.aria-label]="label()">
      @if (fill()) {
        <path [attr.d]="geometry().area" [attr.fill]="color()" fill-opacity="0.12" />
      }
      <path [attr.d]="geometry().line" fill="none" [attr.stroke]="color()" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </svg>
  `,
  styles: `:host { display: block; } svg { width: 100%; display: block; overflow: visible; }`,
})
export class SparklineComponent {
  readonly values = input.required<number[]>();
  readonly width = input(120);
  readonly height = input(36);
  readonly fill = input(false);

  readonly up = computed(() => {
    const v = this.values();
    return v.length < 2 || v[v.length - 1] >= v[0];
  });
  readonly color = computed(() => (this.up() ? 'var(--ion-color-success)' : 'var(--ion-color-danger)'));
  readonly label = computed(() => `Price trend ${this.up() ? 'up' : 'down'}`);

  readonly geometry = computed(() => {
    const v = this.values();
    const w = this.width();
    const h = this.height();
    if (v.length < 2) return { line: '', area: '' };
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * w, h - 2 - ((y - min) / span) * (h - 4)]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
    return { line, area: `${line}L${w},${h}L0,${h}Z` };
  });
}
