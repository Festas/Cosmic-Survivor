// Visual Effects System - Screen Shake, Hit Stop, Particles, etc.
export class VisualEffectsSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        this.hitStop = { active: false, duration: 0 };
        this.slowMotion = { active: false, duration: 0, scale: 1 };
        this.vignette = { intensity: 0, color: '#ff0000', pulsing: false };
        this.chromaticAberration = { intensity: 0 };
        this.flash = { active: false, color: '#ffffff', alpha: 0 };
        this.damageNumbers = [];
        this.combo = { count: 0, timer: 0, timeout: 120 }; // 2 seconds
        this.killStreak = { count: 0, timer: 0, timeout: 180 }; // 3 seconds
        this.notifications = [];
        this.celebrationParticles = [];
    }

    // Update all effects
    update(deltaFrames = 1) {
        // Update screen shake
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaFrames;
            const shake = this.screenShake.intensity;
            this.screenShake.x = (Math.random() - 0.5) * shake;
            this.screenShake.y = (Math.random() - 0.5) * shake;
            
            // Decay intensity
            this.screenShake.intensity *= 0.95;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
            this.screenShake.intensity = 0;
        }

        // Update hit stop
        if (this.hitStop.active) {
            this.hitStop.duration -= deltaFrames;
            if (this.hitStop.duration <= 0) {
                this.hitStop.active = false;
            }
        }

        // Update slow motion
        if (this.slowMotion.active) {
            this.slowMotion.duration -= deltaFrames;
            if (this.slowMotion.duration <= 0) {
                this.slowMotion.active = false;
                this.slowMotion.scale = 1;
            }
        }

        // Update flash
        if (this.flash.active) {
            this.flash.alpha -= 0.05;
            if (this.flash.alpha <= 0) {
                this.flash.active = false;
            }
        }

        // Update combo timer
        if (this.combo.count > 0) {
            this.combo.timer += deltaFrames;
            if (this.combo.timer >= this.combo.timeout) {
                this.combo.count = 0;
                this.combo.timer = 0;
            }
        }

        // Update kill streak timer
        if (this.killStreak.count > 0) {
            this.killStreak.timer += deltaFrames;
            if (this.killStreak.timer >= this.killStreak.timeout) {
                this.killStreak.count = 0;
                this.killStreak.timer = 0;
            }
        }

        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(dmg => {
            dmg.y -= 2;
            dmg.alpha -= 0.02;
            dmg.lifetime--;
            return dmg.lifetime > 0 && dmg.alpha > 0;
        });

        // Update notifications
        this.notifications = this.notifications.filter(notif => {
            notif.lifetime--;
            if (notif.lifetime < 30) {
                notif.alpha -= 0.033;
            }
            return notif.lifetime > 0;
        });

        // Update celebration particles
        this.celebrationParticles = this.celebrationParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.alpha -= 0.01;
            p.lifetime--;
            return p.lifetime > 0 && p.alpha > 0;
        });
    }

    // Trigger screen shake
    addScreenShake(intensity, duration = 10) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    // Trigger hit stop (freeze frame)
    addHitStop(duration = 3) {
        this.hitStop.active = true;
        this.hitStop.duration = duration;
    }

    // Trigger slow motion
    addSlowMotion(duration = 30, scale = 0.5) {
        this.slowMotion.active = true;
        this.slowMotion.duration = duration;
        this.slowMotion.scale = scale;
    }

    // Add screen flash
    addFlash(color = '#ffffff', alpha = 0.5) {
        this.flash.active = true;
        this.flash.color = color;
        this.flash.alpha = alpha;
    }

    // Add damage number
    addDamageNumber(x, y, damage, isCrit = false, isHeal = false) {
        const size = isCrit ? 24 : (damage > 50 ? 20 : 16);
        const color = isHeal ? '#00ff88' : (isCrit ? '#ffff00' : '#ffffff');
        
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 20,
            damage: Math.floor(damage),
            color,
            size,
            alpha: 1,
            lifetime: 60,
            isCrit,
            isHeal
        });
    }

    // Add combo kill
    addComboKill() {
        this.combo.count++;
        this.combo.timer = 0;
        
        // Award bonus credits for high combos
        if (this.combo.count >= 5 && this.combo.count % 5 === 0) {
            return Math.floor(this.combo.count / 5) * 5; // Bonus credits
        }
        return 0;
    }

    // Get combo count
    getComboCount() {
        return this.combo.count;
    }

    // Add kill to streak
    addKill() {
        this.killStreak.count++;
        this.killStreak.timer = 0;
        
        // Return announcement text based on streak
        if (this.killStreak.count === 2) return 'Double Kill!';
        if (this.killStreak.count === 3) return 'Triple Kill!';
        if (this.killStreak.count === 5) return 'Rampage!';
        if (this.killStreak.count === 10) return 'Unstoppable!';
        if (this.killStreak.count === 20) return 'LEGENDARY!';
        return null;
    }

    // Show notification
    showNotification(text, color = '#00ff88', duration = 120) {
        this.notifications.push({
            text,
            color,
            alpha: 1,
            lifetime: duration
        });
    }

    // Update vignette based on health
    updateVignette(healthPercent) {
        if (healthPercent <= 0.3) {
            this.vignette.intensity = (0.3 - healthPercent) / 0.3; // 0-1
            this.vignette.pulsing = true;
        } else {
            this.vignette.intensity = 0;
            this.vignette.pulsing = false;
        }
    }

    // Update chromatic aberration based on health
    updateChromaticAberration(healthPercent) {
        if (healthPercent <= 0.2) {
            this.chromaticAberration.intensity = (0.2 - healthPercent) / 0.2 * 3;
        } else {
            this.chromaticAberration.intensity = 0;
        }
    }

    // Celebration particles for level up or synergy activation
    addCelebration(x, y, color = '#ffff00') {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.celebrationParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color,
                size: 3 + Math.random() * 3,
                alpha: 1,
                lifetime: 60 + Math.random() * 30
            });
        }
    }

    // Wave clear celebration
    addWaveClearCelebration(canvasWidth, canvasHeight) {
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvasWidth;
            const y = Math.random() * canvasHeight;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const colors = ['#00ff88', '#ffff00', '#ff00ff', '#00ffff'];
            
            this.celebrationParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 4,
                alpha: 1,
                lifetime: 90 + Math.random() * 60
            });
        }
    }

    // Render all effects
    render(ctx) {
        // Render chromatic aberration (would need to be done differently in real implementation)
        // For now, we'll skip actual chromatic aberration as it requires complex canvas manipulation

        // Render damage numbers
        this.damageNumbers.forEach(dmg => {
            ctx.save();
            ctx.globalAlpha = dmg.alpha;
            ctx.font = `bold ${dmg.size}px Arial`;
            ctx.fillStyle = dmg.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(dmg.damage, dmg.x, dmg.y);
            ctx.fillText(dmg.damage, dmg.x, dmg.y);
            ctx.restore();
        });

        // Render celebration particles
        this.celebrationParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.restore();
        });

        // Render vignette
        if (this.vignette.intensity > 0) {
            const pulseIntensity = this.vignette.pulsing ? 
                this.vignette.intensity * (0.7 + Math.sin(Date.now() / 200) * 0.3) : 
                this.vignette.intensity;
            
            const gradient = ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height / 3,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height / 1.2
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(255,0,0,${pulseIntensity * 0.5})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Render flash
        if (this.flash.active) {
            ctx.save();
            ctx.globalAlpha = this.flash.alpha;
            ctx.fillStyle = this.flash.color;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }

        // Render notifications
        this.notifications.forEach((notif, index) => {
            ctx.save();
            ctx.globalAlpha = notif.alpha;
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = notif.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            const x = this.canvas.width / 2;
            const y = 100 + index * 40;
            ctx.textAlign = 'center';
            ctx.strokeText(notif.text, x, y);
            ctx.fillText(notif.text, x, y);
            ctx.restore();
        });
    }

    // Get current time scale (for slow motion)
    getTimeScale() {
        return this.slowMotion.active ? this.slowMotion.scale : 1;
    }

    // Check if hit stop is active
    isHitStopActive() {
        return this.hitStop.active;
    }

    // Get screen shake offset
    getScreenShake() {
        return { x: this.screenShake.x, y: this.screenShake.y };
    }
}
