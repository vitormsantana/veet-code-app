import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

interface Node3D {
  x: number;
  y: number;
  z: number;
}

interface EdgeConnection {
  from: number;
  to: number;
}

@Component({
  selector: 'app-futuristic-landing',
  standalone: false,
  templateUrl: './futuristic-landing.component.html',
  styleUrls: ['./futuristic-landing.component.css']
})
export class FuturisticLandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('networkCanvas', { static: false })
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  private ctx?: CanvasRenderingContext2D;
  private nodes: Node3D[] = [];
  private edges: EdgeConnection[] = [];
  private animationId?: number;
  private lastTimestamp = 0;
  private rotation = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private devicePixelRatio = window.devicePixelRatio || 1;

  private readonly rotationSpeed = 0.55;
  private readonly xAxisInfluence = 0.38;
  private readonly resizeHandler = () => this.handleResize();

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    this.ctx = context;
    this.generateSphereTopology();
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  private generateSphereTopology(): void {
    this.nodes = [];
    this.edges = [];

    const rings: number[][] = [];
    const latSteps = 12;
    const baseLongitudinalDensity = 32;

    const northIndex = this.nodes.push({ x: 0, y: 1, z: 0 }) - 1;

    for (let lat = 1; lat < latSteps; lat += 1) {
      const theta = (lat / latSteps) * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const ringCount = Math.max(8, Math.round(sinTheta * baseLongitudinalDensity));

      const ring: number[] = [];
      for (let step = 0; step < ringCount; step += 1) {
        const phi = (step / ringCount) * Math.PI * 2;
        const x = sinTheta * Math.cos(phi);
        const y = cosTheta;
        const z = sinTheta * Math.sin(phi);

        const index = this.nodes.push({ x, y, z }) - 1;
        ring.push(index);
      }

      rings.push(ring);
    }

    const southIndex = this.nodes.push({ x: 0, y: -1, z: 0 }) - 1;

    // Connect poles to adjacent rings
    if (rings.length > 0) {
      for (const nodeIndex of rings[0]) {
        this.edges.push({ from: northIndex, to: nodeIndex });
      }

      for (const nodeIndex of rings[rings.length - 1]) {
        this.edges.push({ from: nodeIndex, to: southIndex });
      }
    }

    // Connect nodes within each ring and to neighbouring rings
    for (let i = 0; i < rings.length; i += 1) {
      const currentRing = rings[i];

      // Ring connections (create the horizontal mesh)
      for (let j = 0; j < currentRing.length; j += 1) {
        const current = currentRing[j];
        const next = currentRing[(j + 1) % currentRing.length];
        this.edges.push({ from: current, to: next });
      }

      const nextRing = rings[i + 1];
      if (!nextRing) {
        continue;
      }

      const currentLength = currentRing.length;
      const nextLength = nextRing.length;

      for (let j = 0; j < currentLength; j += 1) {
        const current = currentRing[j];
        const mappedPosition = (j / currentLength) * nextLength;
        const neighbourA = nextRing[Math.floor(mappedPosition) % nextLength];
        const neighbourB = nextRing[Math.round(mappedPosition) % nextLength];

        this.edges.push({ from: current, to: neighbourA });
        if (neighbourA !== neighbourB) {
          this.edges.push({ from: current, to: neighbourB });
        }
      }
    }
  }

  private handleResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    const context = this.ctx;
    if (!canvas || !context) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    this.viewportWidth = parent.clientWidth;
    this.viewportHeight = parent.clientHeight;
    this.devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = this.viewportWidth * this.devicePixelRatio;
    canvas.height = this.viewportHeight * this.devicePixelRatio;
    canvas.style.width = `${this.viewportWidth}px`;
    canvas.style.height = `${this.viewportHeight}px`;

    context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  private startAnimation(): void {
    const animate = (timestamp: number) => {
      if (!this.ctx) {
        return;
      }

      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      const delta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      this.rotation += delta * this.rotationSpeed;
      this.drawFrame();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private drawFrame(): void {
    const context = this.ctx;
    if (!context || !this.viewportWidth || !this.viewportHeight) {
      return;
    }

    context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const cameraDistance = 3;
    const fov = Math.min(this.viewportWidth, this.viewportHeight) * 0.8;
    const cosY = Math.cos(this.rotation);
    const sinY = Math.sin(this.rotation);
    const cosX = Math.cos(this.rotation * this.xAxisInfluence);
    const sinX = Math.sin(this.rotation * this.xAxisInfluence);

    const projected = this.nodes.map((node) => {
      const xY = node.x * cosY - node.z * sinY;
      const zY = node.x * sinY + node.z * cosY;

      const yX = node.y * cosX - zY * sinX;
      const zX = node.y * sinX + zY * cosX;

      const depth = cameraDistance - zX;
      const scale = fov / (depth * cameraDistance);

      return {
        x: this.viewportWidth / 2 + xY * scale,
        y: this.viewportHeight / 2 + yX * scale,
        depth
      };
    });

    // Draw edges first for layering
    for (const edge of this.edges) {
      const from = projected[edge.from];
      const to = projected[edge.to];
      if (!from || !to) {
        continue;
      }

      const averageDepth = (from.depth + to.depth) / 2;
      const depthFactor = Math.max(0, Math.min(1, (cameraDistance - averageDepth + 1) / 2));
      const alpha = 0.05 + depthFactor * 0.24;

      context.beginPath();
      context.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      context.lineWidth = 0.45 + depthFactor * 0.6;
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }

    // Draw nodes on top
    for (const point of projected) {
      const depthFactor = Math.max(0, Math.min(1, (cameraDistance - point.depth + 1) / 2));
      const radius = 0.7 + depthFactor * 1.7;
      const alpha = 0.35 + depthFactor * 0.55;

      context.beginPath();
      context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
}
