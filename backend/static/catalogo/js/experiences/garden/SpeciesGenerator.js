/**
 * @file SpeciesGenerator.js
 * @description Generador de especies botánicas procedurales para el Jardín Vivo.
 * Selecciona e instancia especies únicas (*Sakura, Magnolia, Loto, Peonía, Margarita, Diente de León, Flor Fantasía*)
 * basándose en la probabilidad por altura Y e inyectando variaciones numéricas únicas en cada flor.
 */

export class SpeciesGenerator {
    constructor() {
        this.speciesList = [
            'sakura', 'magnolia', 'loto', 'peonia', 'margarita', 'dandelion', 'fantasia'
        ];
    }

    generateSpecies(normY) {
        const y = Math.max(0, Math.min(1, normY));
        let selectedType = 'sakura';

        const rand = Math.random();

        if (y < 0.35) {
            // Zona Superior (Flores Frías)
            if (rand < 0.40) selectedType = 'sakura';
            else if (rand < 0.70) selectedType = 'loto';
            else if (rand < 0.90) selectedType = 'magnolia';
            else selectedType = 'margarita';
        } else if (y < 0.65) {
            // Zona Central (Flores Equilibradas)
            if (rand < 0.35) selectedType = 'margarita';
            else if (rand < 0.65) selectedType = 'peonia';
            else if (rand < 0.85) selectedType = 'sakura';
            else selectedType = 'dandelion';
        } else {
            // Zona Inferior (Flores Cálidas / Fantasía)
            if (rand < 0.40) selectedType = 'fantasia';
            else if (rand < 0.70) selectedType = 'dandelion';
            else if (rand < 0.90) selectedType = 'peonia';
            else selectedType = 'loto';
        }

        return this._buildSpeciesConfig(selectedType, y);
    }

    _buildSpeciesConfig(type, normY) {
        const rotOffset = Math.random() * Math.PI * 2;
        const scale = 0.85 + Math.random() * 0.45;

        let config = {
            type: type,
            scale: scale,
            rotation: rotOffset,
            petalCount: 5,
            layers: 1,
            growthDuration: 1400,
            colorPrimary: '#ffffff',
            colorSecondary: '#ffffff',
            detachBehavior: 'fall',
            hasCenter: false,
            centerColor: '#fde047'
        };

        switch (type) {
            case 'sakura':
                config.petalCount = 5 + Math.floor(Math.random() * 4);
                config.layers = 2;
                config.growthDuration = 900 + Math.random() * 400;
                config.colorPrimary = '#fbcfe8';
                config.colorSecondary = '#f472b6';
                config.detachBehavior = 'fall';
                config.hasCenter = true;
                config.centerColor = '#f43f5e';
                break;

            case 'magnolia':
                config.petalCount = 6 + Math.floor(Math.random() * 3);
                config.layers = 2;
                config.growthDuration = 1800 + Math.random() * 500;
                config.colorPrimary = '#fffbeb';
                config.colorSecondary = '#fef08a';
                config.detachBehavior = 'fall';
                config.hasCenter = true;
                config.centerColor = '#fbbf24';
                break;

            case 'loto':
                config.petalCount = 12 + Math.floor(Math.random() * 6);
                config.layers = 3;
                config.growthDuration = 1500 + Math.random() * 400;
                config.colorPrimary = '#ffffff';
                config.colorSecondary = '#c084fc';
                config.detachBehavior = 'light_dissolve';
                config.hasCenter = true;
                config.centerColor = '#e879f9';
                break;

            case 'peonia':
                config.petalCount = 18 + Math.floor(Math.random() * 10);
                config.layers = 3;
                config.growthDuration = 2000 + Math.random() * 600;
                config.colorPrimary = '#fda4af';
                config.colorSecondary = '#fb7185';
                config.detachBehavior = 'fall';
                config.hasCenter = false;
                break;

            case 'margarita':
                config.petalCount = 14 + Math.floor(Math.random() * 8);
                config.layers = 1;
                config.growthDuration = 1100 + Math.random() * 300;
                config.colorPrimary = '#ffffff';
                config.colorSecondary = '#f1f5f9';
                config.detachBehavior = 'fall';
                config.hasCenter = true;
                config.centerColor = '#fde047';
                break;

            case 'dandelion':
                config.petalCount = 28 + Math.floor(Math.random() * 14);
                config.layers = 2;
                config.growthDuration = 1200 + Math.random() * 400;
                config.colorPrimary = '#ffffff';
                config.colorSecondary = '#e2e8f0';
                config.detachBehavior = 'float_wind';
                config.hasCenter = true;
                config.centerColor = '#fef08a';
                break;

            case 'fantasia':
            default:
                config.petalCount = 8 + Math.floor(Math.random() * 8);
                config.layers = 3;
                config.growthDuration = 1300 + Math.random() * 500;
                config.colorPrimary = '#38bdf8';
                config.colorSecondary = '#a855f7';
                config.detachBehavior = 'light_dissolve';
                config.hasCenter = true;
                config.centerColor = '#00f5d4';
                break;
        }

        return config;
    }
}
