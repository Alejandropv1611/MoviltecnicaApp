import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-circular-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ring-container" style="text-align: center; display: inline-block;">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <!-- Background circle -->
        <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(0,0,0,0.09)" stroke-width="8"/>
        <!-- Animated foreground circle -->
        <circle cx="52" cy="52" r="46" fill="none" 
                [attr.stroke]="getColor()" 
                stroke-width="8" 
                [attr.stroke-dasharray]="dashArray" 
                [attr.stroke-dashoffset]="dashOffset" 
                stroke-linecap="round"
                style="transition: stroke-dashoffset 0.5s ease-out; transform: rotate(-90deg); transform-origin: 52px 52px;"/>
        
        <text x="52" y="49" text-anchor="middle" dominant-baseline="central" 
              font-size="16" font-weight="700" [attr.fill]="getColor()">{{ val }}%</text>
        <text x="52" y="65" text-anchor="middle" font-size="9" fill="#6B7280">meta {{ meta }}%</text>
      </svg>
      <div style="font-size: 11px; color: #6B7280; margin-top: -4px; font-weight: 500;">{{ label }}</div>
      <span class="m-pill" [style.background]="getBgColor()" [style.color]="getColor()">
        {{ val >= meta ? '✓ Cumple' : 'Bajo meta' }}
      </span>
    </div>
  `
})
export class CircularRingComponent implements OnChanges {
  @Input() val: number = 0;
  @Input() label: string = '';
  @Input() meta: number = 95;

  dashArray: string = '289.02';
  dashOffset: string = '289.02';

  ngOnChanges() {
    const r = 46;
    const circumference = 2 * Math.PI * r;
    this.dashArray = `${circumference}`;
    const fillPercent = Math.min(Math.max(this.val, 0), 100);
    this.dashOffset = `${circumference - (fillPercent / 100) * circumference}`;
  }

  getColor(): string {
    if (this.val >= this.meta) return '#8BC34A'; // Green
    if (this.val >= this.meta * 0.9) return '#F57C00'; // Amber/Orange
    return '#C0392B'; // Red
  }

  getBgColor(): string {
    if (this.val >= this.meta) return '#DCEDC8';
    if (this.val >= this.meta * 0.9) return '#FFE0B2';
    return '#FDEBEA';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIE / DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-svg-pie',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pie-chart-wrapper" style="position: relative; text-align: center; width: 100%;">
      <svg width="100%" height="150" viewBox="0 0 200 200" style="max-height: 150px; overflow: visible;">
        <g transform="translate(100, 100) rotate(-90)">
          <ng-container *ngIf="slices.length > 0; else emptyPie">
            <!-- Draw segments -->
            <circle *ngFor="let slice of slices; let idx = index"
                    cx="0"
                    cy="0"
                    r="60"
                    fill="none"
                    [attr.stroke]="slice.color"
                    stroke-width="30"
                    [attr.stroke-dasharray]="slice.dashArray"
                    [attr.stroke-dashoffset]="slice.dashOffset"
                    (mouseover)="hoverSlice($event, idx)"
                    (mouseleave)="leaveSlice()"
                    style="transition: stroke-width 0.2s, stroke-dashoffset 0.3s; cursor: pointer;"
                    [style.stroke-width]="hoveredIdx === idx ? '35' : '30'"/>
          </ng-container>
          <ng-template #emptyPie>
            <circle cx="0" cy="0" r="60" fill="none" stroke="#F4F4F2" stroke-width="30"/>
          </ng-template>
        </g>
      </svg>
      
      <!-- Tooltip inside/relative to container -->
      <div *ngIf="hoveredIdx !== null && tooltipVisible"
           class="chart-tooltip"
           [style.left.px]="tooltipX"
           [style.top.px]="tooltipY"
           style="position: absolute; background: #2C2C2C; color: #FFF; padding: 6px 10px; border-radius: 6px; font-size: 11px; pointer-events: none; white-space: nowrap; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translate(-50%, -100%); transition: left 0.1s, top 0.1s;">
        <strong>{{ slices[hoveredIdx].name }}</strong>: {{ slices[hoveredIdx].value }} OV
      </div>
    </div>
  `
})
export class SvgPieComponent implements OnChanges {
  @Input() data: { name: string, value: number, color?: string }[] = [];

  slices: { name: string, value: number, color: string, dashArray: string, dashOffset: string }[] = [];
  hoveredIdx: number | null = null;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;

  private defaultColors = ['#8BC34A', '#F57C00', '#C0392B', '#1A5FA8', '#6B4CBA', '#2C2C2C'];

  ngOnChanges() {
    this.calculateSlices();
  }

  calculateSlices() {
    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    const r = 60;
    const circumference = 2 * Math.PI * r; // ~376.99
    
    let accumulated = 0;
    this.slices = this.data.map((item, idx) => {
      const color = item.color || this.defaultColors[idx % this.defaultColors.length];
      const percentage = total > 0 ? (item.value / total) : 0;
      
      const dashArray = `${percentage * circumference} ${circumference}`;
      const dashOffset = `${-accumulated * circumference}`;
      
      accumulated += percentage;

      return {
        name: item.name,
        value: item.value,
        color,
        dashArray,
        dashOffset
      };
    });
  }

  hoverSlice(event: MouseEvent, index: number) {
    this.hoveredIdx = index;
    this.tooltipVisible = true;
    this.updateTooltipPos(event);
  }

  leaveSlice() {
    this.hoveredIdx = null;
    this.tooltipVisible = false;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.tooltipVisible) {
      this.updateTooltipPos(event);
    }
  }

  private updateTooltipPos(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = (event.currentTarget as HTMLElement).closest('.pie-chart-wrapper')?.getBoundingClientRect();
    if (parentRect) {
      this.tooltipX = event.clientX - parentRect.left;
      this.tooltipY = event.clientY - parentRect.top - 10;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPED BAR CHART (Programada vs Ejecutada)
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-svg-bar-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart-wrapper" style="position: relative; width: 100%;">
      <svg width="100%" height="190" viewBox="0 0 500 200" style="overflow: visible;">
        <!-- Grid lines -->
        <g stroke="#E8E8E8" stroke-width="0.5">
          <line *ngFor="let grid of gridLines" x1="40" [attr.y1]="grid.y" x2="480" [attr.y2]="grid.y" />
        </g>

        <!-- Y Axis Labels -->
        <g font-size="9" fill="#6B7280" text-anchor="end">
          <text *ngFor="let label of yLabels" x="32" [attr.y]="label.y + 3">{{ label.val }}h</text>
        </g>

        <!-- X Axis Line -->
        <line x1="40" y1="165" x2="480" y2="165" stroke="rgba(0,0,0,0.09)" stroke-width="1" />

        <!-- X Axis Labels -->
        <g font-size="9" fill="#6B7280" text-anchor="middle">
          <text *ngFor="let bar of barGroups; let idx = index" [attr.x]="bar.cx" y="180">{{ bar.name }}</text>
        </g>

        <!-- Bars -->
        <g *ngFor="let bar of barGroups; let idx = index">
          <!-- Programada Bar -->
          <rect [attr.x]="bar.xProg" 
                [attr.y]="bar.yProg" 
                width="14" 
                [attr.height]="bar.hProg" 
                fill="#DCEDC8" 
                rx="3" 
                style="transition: all 0.3s; cursor: pointer;"
                (mouseover)="hoverBar($event, idx, 'prog')"
                (mouseleave)="leaveBar()"/>
          <!-- Ejecutada Bar -->
          <rect [attr.x]="bar.xEjec" 
                [attr.y]="bar.yEjec" 
                width="14" 
                [attr.height]="bar.hEjec" 
                fill="#8BC34A" 
                rx="3" 
                style="transition: all 0.3s; cursor: pointer;"
                (mouseover)="hoverBar($event, idx, 'ejec')"
                (mouseleave)="leaveBar()"/>
        </g>
      </svg>

      <!-- Tooltip -->
      <div *ngIf="hoveredInfo && tooltipVisible"
           class="chart-tooltip"
           [style.left.px]="tooltipX"
           [style.top.px]="tooltipY"
           style="position: absolute; background: #2C2C2C; color: #FFF; padding: 6px 10px; border-radius: 6px; font-size: 11px; pointer-events: none; white-space: nowrap; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translate(-50%, -100%);">
        <strong>OV-{{ hoveredInfo.name }}</strong><br/>
        {{ hoveredInfo.type === 'prog' ? 'Programada' : 'Ejecutada' }}: {{ hoveredInfo.value }}h
      </div>
    </div>
  `
})
export class SvgBarGroupComponent implements OnChanges {
  @Input() data: { name: string, prog: number, ejec: number }[] = [];

  barGroups: any[] = [];
  gridLines: any[] = [];
  yLabels: any[] = [];
  hoveredInfo: any = null;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;

  ngOnChanges() {
    this.calculateChart();
  }

  calculateChart() {
    if (!this.data || this.data.length === 0) return;
    
    // Max value calculation
    const maxVal = Math.max(...this.data.map(d => Math.max(d.prog, d.ejec, 10)), 50);
    // Round maxVal to a neat multiple of 50 or 20
    const roundedMax = Math.ceil(maxVal / 50) * 50;

    const chartHeight = 145; // 165 - 20
    const chartWidth = 440;  // 480 - 40
    const topMargin = 20;
    const leftMargin = 40;
    const n = this.data.length;

    // Grid lines and labels
    this.gridLines = [];
    this.yLabels = [];
    const divisions = 4;
    for (let i = 0; i <= divisions; i++) {
      const ratio = i / divisions;
      const y = topMargin + chartHeight * (1 - ratio);
      const val = Math.round(roundedMax * ratio);
      this.gridLines.push({ y });
      this.yLabels.push({ y, val });
    }

    // Bar coordinate calculations
    const step = chartWidth / n;
    this.barGroups = this.data.map((item, idx) => {
      const cx = leftMargin + step * (idx + 0.5);
      
      const hProg = (item.prog / roundedMax) * chartHeight;
      const yProg = topMargin + chartHeight - hProg;
      const xProg = cx - 15; // Shift left for side-by-side bars

      const hEjec = (item.ejec / roundedMax) * chartHeight;
      const yEjec = topMargin + chartHeight - hEjec;
      const xEjec = cx + 1; // Shift right

      return {
        name: item.name,
        hProg: Math.max(hProg, 2),
        yProg,
        xProg,
        hEjec: Math.max(hEjec, 2),
        yEjec,
        xEjec,
        cx,
        progVal: item.prog,
        ejecVal: item.ejec
      };
    });
  }

  hoverBar(event: MouseEvent, idx: number, type: 'prog' | 'ejec') {
    const group = this.barGroups[idx];
    this.hoveredInfo = {
      name: group.name,
      type,
      value: type === 'prog' ? group.progVal : group.ejecVal
    };
    this.tooltipVisible = true;
    this.updateTooltipPos(event);
  }

  leaveBar() {
    this.hoveredInfo = null;
    this.tooltipVisible = false;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.tooltipVisible) {
      this.updateTooltipPos(event);
    }
  }

  private updateTooltipPos(event: MouseEvent) {
    const parentElement = (event.currentTarget as HTMLElement).closest('.bar-chart-wrapper');
    const parentRect = parentElement?.getBoundingClientRect();
    if (parentRect) {
      this.tooltipX = event.clientX - parentRect.left;
      this.tooltipY = event.clientY - parentRect.top - 8;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE BAR CHART (For Days or UB %)
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-svg-bar-single',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart-wrapper" style="position: relative; width: 100%;">
      <svg width="100%" height="170" viewBox="0 0 500 170" style="overflow: hidden;">
        <!-- Grid lines -->
        <g stroke="#E8E8E8" stroke-width="0.5">
          <line *ngFor="let grid of gridLines" x1="40" [attr.y1]="grid.y" x2="480" [attr.y2]="grid.y" />
        </g>

        <!-- Y Axis Labels -->
        <g font-size="9" fill="#6B7280" text-anchor="end">
          <text *ngFor="let label of yLabels" x="32" [attr.y]="label.y + 3">{{ label.val }}{{ unit }}</text>
        </g>

        <!-- X Axis Line -->
        <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(0,0,0,0.09)" stroke-width="1" />

        <!-- X Axis Labels -->
        <g font-size="9" fill="#6B7280" text-anchor="middle">
          <text *ngFor="let bar of bars; let idx = index" [attr.x]="bar.cx" y="154">{{ bar.name }}</text>
        </g>

        <!-- Bars -->
        <g *ngFor="let bar of bars; let idx = index">
          <rect [attr.x]="bar.x" 
                [attr.y]="bar.y" 
                [attr.width]="adaptiveBarWidth" 
                [attr.height]="bar.height" 
                [attr.fill]="bar.color" 
                rx="4" 
                style="transition: all 0.3s; cursor: pointer;"
                (mouseover)="hoverBar($event, idx)"
                (mouseleave)="leaveBar()"/>
        </g>
      </svg>

      <!-- Tooltip -->
      <div *ngIf="hoveredInfo && tooltipVisible"
           class="chart-tooltip"
           [style.left.px]="tooltipX"
           [style.top.px]="tooltipY"
           style="position: absolute; background: #2C2C2C; color: #FFF; padding: 6px 10px; border-radius: 6px; font-size: 11px; pointer-events: none; white-space: nowrap; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translate(-50%, -100%);">
        <strong>OV-{{ hoveredInfo.name }}</strong>: {{ hoveredInfo.value }}{{ unit }}
      </div>
    </div>
  `
})
export class SvgBarSingleComponent implements OnChanges {
  @Input() data: { name: string, value: number, ok?: boolean, color?: string }[] = [];
  @Input() unit: string = '';
  @Input() domain: [number, number] | null = null;
  @Input() customColorScale = false;
  @Input() barWidth = 18;

  bars: any[] = [];
  gridLines: any[] = [];
  yLabels: any[] = [];
  hoveredInfo: any = null;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  adaptiveBarWidth = 18;

  ngOnChanges() {
    this.calculateChart();
  }

  calculateChart() {
    if (!this.data || this.data.length === 0) return;

    // Y Axis scaling
    let minVal = 0;
    let maxVal = 100;

    if (this.domain) {
      minVal = this.domain[0];
      maxVal = this.domain[1];
    } else {
      maxVal = Math.max(...this.data.map(d => d.value), 30);
      maxVal = Math.ceil(maxVal / 10) * 10;
    }

    const chartHeight = 120; // 140 - 20
    const chartWidth = 440;  // 480 - 40
    const topMargin = 20;
    const leftMargin = 40;
    const n = this.data.length;

    // Dynamically adjust bar width based on number of data points
    this.adaptiveBarWidth = this.barWidth;
    if (n > 10) {
      this.adaptiveBarWidth = Math.max(8, Math.floor(chartWidth / (n * 1.5)));
    } else if (n > 6) {
      this.adaptiveBarWidth = Math.max(10, Math.floor(chartWidth / (n * 1.3)));
    }

    // Grid lines and labels
    this.gridLines = [];
    this.yLabels = [];
    const divisions = 4;
    for (let i = 0; i <= divisions; i++) {
      const ratio = i / divisions;
      const y = topMargin + chartHeight * (1 - ratio);
      const val = Math.round(minVal + (maxVal - minVal) * ratio);
      this.gridLines.push({ y });
      this.yLabels.push({ y, val });
    }

    // Bars
    const step = chartWidth / n;
    this.bars = this.data.map((item, idx) => {
      const cx = leftMargin + step * (idx + 0.5);
      const x = cx - this.adaptiveBarWidth / 2;
      
      // Percentage scaling within domain
      const scalePercent = (item.value - minVal) / (maxVal - minVal);
      const height = Math.max(scalePercent * chartHeight, 4);
      const y = topMargin + chartHeight - height;

      // Color determining
      let color = item.color || '#8BC34A';
      if (this.customColorScale) {
        // Red / green threshold indicator
        color = item.ok ? '#8BC34A' : '#C0392B';
      }

      return {
        name: item.name,
        value: item.value,
        height,
        y,
        x,
        cx,
        color
      };
    });
  }

  hoverBar(event: MouseEvent, idx: number) {
    const bar = this.bars[idx];
    this.hoveredInfo = {
      name: bar.name,
      value: bar.value
    };
    this.tooltipVisible = true;
    this.updateTooltipPos(event);
  }

  leaveBar() {
    this.hoveredInfo = null;
    this.tooltipVisible = false;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.tooltipVisible) {
      this.updateTooltipPos(event);
    }
  }

  private updateTooltipPos(event: MouseEvent) {
    const parentElement = (event.currentTarget as HTMLElement).closest('.bar-chart-wrapper');
    const parentRect = parentElement?.getBoundingClientRect();
    if (parentRect) {
      this.tooltipX = event.clientX - parentRect.left;
      this.tooltipY = event.clientY - parentRect.top - 8;
    }
  }
}
