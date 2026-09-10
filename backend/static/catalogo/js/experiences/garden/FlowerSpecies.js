/**
 * @file FlowerSpecies.js
 * @description Renderizador de geometría procedural de alta velocidad a 60 FPS para las 7 especies botánicas del Jardín Vivo:
 * Sakura, Magnolia, Loto, Peonía, Margarita, Diente de León y Flor Fantasía.
 * Optimizado sin shadowBlur para cero latencia de GPU/CPU.
 */

export class FlowerSpecies {
    static draw(ctx, x, y, config, progress, holdScale = 1.0, opacity = 1.0) {
        if (progress <= 0 || opacity <= 0.001) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(config.rotation);
        
        const totalScale = config.scale * holdScale;
        ctx.scale(totalScale, totalScale);

        switch (config.type) {
            case 'sakura':
                this._drawSakura(ctx, config, progress, opacity);
                break;
            case 'magnolia':
                this._drawMagnolia(ctx, config, progress, opacity);
                break;
            case 'loto':
                this._drawLoto(ctx, config, progress, opacity);
                break;
            case 'peonia':
                this._drawPeonia(ctx, config, progress, opacity);
                break;
            case 'margarita':
                this._drawMargarita(ctx, config, progress, opacity);
                break;
            case 'dandelion':
                this._drawDandelion(ctx, config, progress, opacity);
                break;
            case 'fantasia':
            default:
                this._drawFantasia(ctx, config, progress, opacity);
                break;
        }

        ctx.restore();
    }

    static _drawSakura(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 32 * progress;

        for (let l = 0; l < config.layers; l++) {
            const layerScale = 1.0 - l * 0.3;
            const angleOffset = (l * Math.PI) / count;

            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + angleOffset;
                ctx.save();
                ctx.rotate(angle);

                ctx.fillStyle = l === 0 ? config.colorPrimary : config.colorSecondary;
                ctx.globalAlpha = opacity * (0.9 - l * 0.15);

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(-12 * layerScale, -15 * radius * 0.04, -14 * layerScale, -radius * layerScale, 0, -radius * layerScale);
                ctx.bezierCurveTo(14 * layerScale, -radius * layerScale, 12 * layerScale, -15 * radius * 0.04, 0, 0);
                ctx.fill();

                ctx.restore();
            }
        }

        if (config.hasCenter && progress > 0.4) {
            ctx.fillStyle = config.centerColor;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5 * progress, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _drawMagnolia(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 45 * progress;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            ctx.save();
            ctx.rotate(angle);

            ctx.fillStyle = i % 2 === 0 ? config.colorPrimary : config.colorSecondary;
            ctx.globalAlpha = opacity * 0.92;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-18, -radius * 0.4, -22, -radius * 0.9, 0, -radius);
            ctx.bezierCurveTo(22, -radius * 0.9, 18, -radius * 0.4, 0, 0);
            ctx.fill();

            ctx.restore();
        }

        if (progress > 0.5) {
            ctx.fillStyle = config.centerColor;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(0, 0, 6.0 * progress, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _drawLoto(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 50 * progress;

        for (let l = 0; l < config.layers; l++) {
            const layerScale = 1.0 - l * 0.25;
            const angleOffset = (l * Math.PI) / count;

            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + angleOffset;
                ctx.save();
                ctx.rotate(angle);

                ctx.fillStyle = l === 0 ? config.colorPrimary : config.colorSecondary;
                ctx.globalAlpha = opacity * (0.95 - l * 0.12);

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-15 * layerScale, -radius * 0.5 * layerScale, 0, -radius * layerScale);
                ctx.quadraticCurveTo(15 * layerScale, -radius * 0.5 * layerScale, 0, 0);
                ctx.fill();

                ctx.restore();
            }
        }
    }

    static _drawPeonia(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 42 * progress;

        for (let l = 0; l < 4; l++) {
            const layerScale = 1.0 - l * 0.22;
            const layerCount = Math.max(5, Math.floor(count / (l + 1)));

            for (let i = 0; i < layerCount; i++) {
                const angle = (Math.PI * 2 * i) / layerCount + (l * 0.4);
                ctx.save();
                ctx.rotate(angle);

                ctx.fillStyle = l % 2 === 0 ? config.colorPrimary : config.colorSecondary;
                ctx.globalAlpha = opacity * 0.85;

                ctx.beginPath();
                ctx.arc(0, -radius * 0.5 * layerScale, 14 * layerScale, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }
    }

    static _drawMargarita(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 38 * progress;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            ctx.save();
            ctx.rotate(angle);

            ctx.fillStyle = config.colorPrimary;
            ctx.globalAlpha = opacity * 0.95;

            ctx.beginPath();
            ctx.ellipse(0, -radius * 0.5, 4.5, radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        if (progress > 0.3) {
            ctx.fillStyle = config.centerColor;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(0, 0, 8.5 * progress, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _drawDandelion(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 44 * progress;

        ctx.strokeStyle = `rgba(255, 255, 255, ${(opacity * 0.6).toFixed(3)})`;
        ctx.lineWidth = 1.0;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const tipX = Math.cos(angle) * radius;
            const tipY = Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            ctx.fillStyle = config.colorPrimary;
            ctx.globalAlpha = opacity * 0.9;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = config.centerColor;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(0, 0, 5.0 * progress, 0, Math.PI * 2);
        ctx.fill();
    }

    static _drawFantasia(ctx, config, progress, opacity) {
        const count = config.petalCount;
        const radius = 48 * progress;

        for (let l = 0; l < config.layers; l++) {
            const layerScale = 1.0 - l * 0.25;

            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + progress * 2.0;
                ctx.save();
                ctx.rotate(angle);

                ctx.strokeStyle = l % 2 === 0 ? config.colorPrimary : config.colorSecondary;
                ctx.lineWidth = 1.8;
                ctx.globalAlpha = opacity * 0.85;

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(20 * layerScale, -radius * 0.4, -20 * layerScale, -radius * 0.8, 0, -radius * layerScale);
                ctx.stroke();

                ctx.fillStyle = config.colorPrimary;
                ctx.beginPath();
                ctx.arc(0, -radius * layerScale, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }
    }
}
