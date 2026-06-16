class LineChart {
  constructor(containerId, options) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.options = options;
    this.svgNS = "http://www.w3.org/2000/svg";
    this.render();
    window.addEventListener('resize', () => this.render());
  }

  render() {
    this.container.innerHTML = '';
    const width = this.container.clientWidth;
    const height = this.options.height || 350;
    const padding = { top: 30, right: 40, bottom: 65, left: 120 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = document.createElementNS(this.svgNS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.overflow = 'visible';

    // Find min/max for scaling
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.options.datasets.forEach(dataset => {
      dataset.data.forEach(point => {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      });
    });

    if (this.options.yMin !== undefined) minY = this.options.yMin;
    if (this.options.yMax !== undefined) maxY = this.options.yMax;
    
    // Add padding to maxY so highest point isn't touching the top
    maxY = maxY + (maxY - minY) * 0.1;
    if (maxY === minY) maxY = minY + 1;

    const scaleX = (x) => padding.left + ((x - minX) / (maxX - minX)) * chartWidth;
    const scaleY = (y) => height - padding.bottom - ((y - minY) / (maxY - minY)) * chartHeight;

    // Draw Axes
    const axesGroup = document.createElementNS(this.svgNS, 'g');
    axesGroup.setAttribute('class', 'chart-axes');

    // Y Axis
    const yAxis = document.createElementNS(this.svgNS, 'line');
    yAxis.setAttribute('x1', padding.left);
    yAxis.setAttribute('y1', padding.top);
    yAxis.setAttribute('x2', padding.left);
    yAxis.setAttribute('y2', height - padding.bottom);
    axesGroup.appendChild(yAxis);

    // X Axis
    const xAxis = document.createElementNS(this.svgNS, 'line');
    xAxis.setAttribute('x1', padding.left);
    xAxis.setAttribute('y1', height - padding.bottom);
    xAxis.setAttribute('x2', width - padding.right);
    xAxis.setAttribute('y2', height - padding.bottom);
    axesGroup.appendChild(xAxis);

    // Grid lines and labels (Y)
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const val = minY + (maxY - minY) * (i / ySteps);
      const y = scaleY(val);
      
      const gridLine = document.createElementNS(this.svgNS, 'line');
      gridLine.setAttribute('x1', padding.left);
      gridLine.setAttribute('y1', y);
      gridLine.setAttribute('x2', width - padding.right);
      gridLine.setAttribute('y2', y);
      gridLine.setAttribute('class', 'chart-grid');
      axesGroup.appendChild(gridLine);

      const label = document.createElementNS(this.svgNS, 'text');
      label.setAttribute('x', padding.left - 12);
      label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('class', 'chart-label');
      label.textContent = val.toFixed(this.options.yDecimals || 1) + (this.options.yUnit || '');
      axesGroup.appendChild(label);
    }

    // X labels
    const xSteps = this.options.xLabels ? this.options.xLabels.length - 1 : 5;
    for (let i = 0; i <= xSteps; i++) {
      const val = minX + (maxX - minX) * (i / xSteps);
      const x = scaleX(val);
      
      const label = document.createElementNS(this.svgNS, 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', height - padding.bottom + 22);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'chart-label');
      label.textContent = this.options.xLabels ? this.options.xLabels[i] : Math.round(val);
      axesGroup.appendChild(label);
    }
    
    // X Axis title
    if (this.options.xAxisTitle) {
      const xTitle = document.createElementNS(this.svgNS, 'text');
      xTitle.setAttribute('x', padding.left + chartWidth / 2);
      xTitle.setAttribute('y', height - 12);
      xTitle.setAttribute('text-anchor', 'middle');
      xTitle.setAttribute('class', 'chart-axis-title');
      xTitle.textContent = this.options.xAxisTitle;
      axesGroup.appendChild(xTitle);
    }
    
    // Y Axis title
    if (this.options.yAxisTitle) {
      const yTitle = document.createElementNS(this.svgNS, 'text');
      yTitle.setAttribute('transform', `translate(25, ${padding.top + chartHeight/2}) rotate(-90)`);
      yTitle.setAttribute('text-anchor', 'middle');
      yTitle.setAttribute('class', 'chart-axis-title');
      yTitle.textContent = this.options.yAxisTitle;
      axesGroup.appendChild(yTitle);
    }

    svg.appendChild(axesGroup);

    // Draw lines
    const tooltipTarget = document.createElement('div');
    tooltipTarget.className = 'chart-tooltip';
    this.container.appendChild(tooltipTarget);

    this.options.datasets.forEach((dataset, index) => {
      // Curved path generation
      const path = document.createElementNS(this.svgNS, 'path');
      let d = '';
      
      if (dataset.data.length > 0) {
        d = `M ${scaleX(dataset.data[0].x)} ${scaleY(dataset.data[0].y)}`;
        // Simple smoothing using cubic bezier
        for (let i = 1; i < dataset.data.length; i++) {
          const p0 = dataset.data[i - 1];
          const p1 = dataset.data[i];
          const x0 = scaleX(p0.x);
          const y0 = scaleY(p0.y);
          const x1 = scaleX(p1.x);
          const y1 = scaleY(p1.y);
          
          const cpX1 = x0 + (x1 - x0) / 3;
          const cpY1 = y0;
          const cpX2 = x1 - (x1 - x0) / 3;
          const cpY2 = y1;
          
          d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x1} ${y1}`;
        }
      }

      path.setAttribute('d', d);
      path.setAttribute('class', 'chart-line chart-line-anim');
      path.setAttribute('stroke', dataset.color || `hsl(${index * 137.5 % 360}, 70%, 50%)`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '3');
      
      // Animation hack
      path.setAttribute('stroke-dasharray', '2000');
      path.setAttribute('stroke-dashoffset', '2000');
      svg.appendChild(path);

      // Points for hover
      const pointsGroup = document.createElementNS(this.svgNS, 'g');
      dataset.data.forEach((point) => {
        const circle = document.createElementNS(this.svgNS, 'circle');
        const cx = scaleX(point.x);
        const cy = scaleY(point.y);
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', 'var(--bg-color)');
        circle.setAttribute('stroke', dataset.color);
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'chart-point');
        
        // Tooltip logic
        const hitArea = document.createElementNS(this.svgNS, 'circle');
        hitArea.setAttribute('cx', cx);
        hitArea.setAttribute('cy', cy);
        hitArea.setAttribute('r', '15');
        hitArea.setAttribute('fill', 'transparent');
        hitArea.style.cursor = 'pointer';
        
        hitArea.addEventListener('mouseenter', (e) => {
          circle.setAttribute('r', '8');
          circle.setAttribute('fill', dataset.color);
          tooltipTarget.style.opacity = '1';
          tooltipTarget.innerHTML = `<strong>${dataset.label}</strong><br/>${this.options.xAxisTitle}: ${point.x}<br/>${this.options.yAxisTitle}: ${point.y}${this.options.yUnit||''}`;
          const rect = this.container.getBoundingClientRect();
          tooltipTarget.style.left = (e.clientX - rect.left + 15) + 'px';
          tooltipTarget.style.top = (e.clientY - rect.top - 45) + 'px';
        });
        hitArea.addEventListener('mouseleave', () => {
          circle.setAttribute('r', '6');
          circle.setAttribute('fill', 'var(--bg-color)');
          tooltipTarget.style.opacity = '0';
        });
        
        pointsGroup.appendChild(circle);
        pointsGroup.appendChild(hitArea);
      });
      svg.appendChild(pointsGroup);
      
      // Trigger animation frame hack
      requestAnimationFrame(() => {
        const len = path.getTotalLength();
        path.setAttribute('stroke-dasharray', len);
        path.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
        path.setAttribute('stroke-dashoffset', '0');
      });
    });

    this.container.appendChild(svg);
    
    // Draw Header (Title & Legend)
    const header = document.createElement('div');
    header.className = 'chart-header';
    
    if (this.options.title) {
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = this.options.title;
        header.appendChild(title);
    }
    
    if (this.options.showLegend !== false) {
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      this.options.datasets.forEach(dataset => {
        const item = document.createElement('div');
        item.className = 'chart-legend-item';
        item.innerHTML = `<span class="chart-legend-color" style="background:${dataset.color}"></span> ${dataset.label}`;
        legend.appendChild(item);
      });
      header.appendChild(legend);
    }
    
    this.container.insertBefore(header, this.container.firstChild);
  }
}
window.LineChart = LineChart;
