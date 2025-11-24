// Mobile Touch Controls
export class TouchControls {
    constructor(canvas) {
        this.canvas = canvas;
        this.active = false;
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            dx: 0,
            dy: 0,
        };
        
        this.isMobile = this.detectMobile();
        
        if (this.isMobile) {
            this.setupTouchControls();
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }
    
    setupTouchControls() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Left side for movement joystick
        if (x < this.canvas.width / 2) {
            this.joystick.active = true;
            this.joystick.startX = x;
            this.joystick.startY = y;
            this.joystick.currentX = x;
            this.joystick.currentY = y;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (!this.joystick.active) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.joystick.currentX = touch.clientX - rect.left;
        this.joystick.currentY = touch.clientY - rect.top;
        
        // Calculate direction
        const dx = this.joystick.currentX - this.joystick.startX;
        const dy = this.joystick.currentY - this.joystick.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const maxDistance = 50;
            const clampedDistance = Math.min(distance, maxDistance);
            this.joystick.dx = (dx / distance) * (clampedDistance / maxDistance);
            this.joystick.dy = (dy / distance) * (clampedDistance / maxDistance);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
    }
    
    getMovement() {
        if (!this.joystick.active) {
            return { dx: 0, dy: 0 };
        }
        
        return {
            dx: this.joystick.dx,
            dy: this.joystick.dy,
        };
    }
    
    draw(ctx) {
        if (!this.isMobile || !this.joystick.active) return;
        
        ctx.save();
        
        // Draw joystick base
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(this.joystick.startX, this.joystick.startY, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw joystick stick
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(this.joystick.currentX, this.joystick.currentY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
