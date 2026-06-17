export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0; // Мировая координата X центра экрана
        this.y = 0; // Мировая координата Y центра экрана
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.camStartX = 0;
        this.camStartY = 0;

        this.keys = {};
        this.moveSpeed = 500; // Пикселей в секунду

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Средняя кнопка или Shift+ЛКМ
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.camStartX = this.x;
                this.camStartY = this.y;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'crosshair';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = (e.clientX - this.dragStartX) / this.zoom;
                const dy = (e.clientY - this.dragStartY) / this.zoom;
                this.x = this.camStartX - dx;
                this.y = this.camStartY - dy;
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = 0.1;
            if (e.deltaY < 0) this.targetZoom *= (1 + zoomFactor);
            else this.targetZoom /= (1 + zoomFactor);
            
            this.targetZoom = Math.max(0.2, Math.min(3.0, this.targetZoom));
        }, { passive: false });
    }

    update(dt) {
        // Плавный зум
        this.zoom += (this.targetZoom - this.zoom) * 0.2;

        // Движение на WASD
        const speed = (this.moveSpeed / this.zoom) * dt;
        if (this.keys['w'] || this.keys['ц']) this.y -= speed;
        if (this.keys['s'] || this.keys['ы']) this.y += speed;
        if (this.keys['a'] || this.keys['ф']) this.x -= speed;
        if (this.keys['d'] || this.keys['в']) this.x += speed;
    }

    // Конвертация экранных координат (мыши) в мировые
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.canvas.width / 2) / this.zoom + this.x;
        const worldY = (screenY - this.canvas.height / 2) / this.zoom + this.y;
        return { x: worldX, y: worldY };
    }

    // Применяем трансформацию канваса для рендера мира
    applyTransform(ctx) {
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}