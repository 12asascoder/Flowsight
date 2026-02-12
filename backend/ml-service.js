/**
 * Lightweight ML Service - Simulation-based approach
 * Provides same API as TensorFlow.js version but uses statistical models
 * Avoids TensorFlow.js-node compatibility issues
 */

const stats = require('simple-statistics');

class MLService {
    constructor() {
        this.models = {};
        this.isInitialized = false;
        this.dataBuffer = {
            sensorReadings: [],
            maxBufferSize: 1000
        };
    }

    /**
     * Initialize all ML models (simulation-based)
     */
    async initialize() {
        console.log('🧠 Initializing ML Service (Lightweight Mode)...');

        try {
            // Initialize simulation models
            this.models = {
                demandForecasting: { type: 'lstm', ready: true },
                leakDetection: { type: 'cnn', ready: true },
                pumpOptimization: { type: 'ann', ready: true },
                tankPrediction: { type: 'lstm', ready: true },
                patternClustering: { type: 'autoencoder', ready: true },
                sensorFaultDetection: { type: 'autoencoder', ready: true },
                roiEstimation: { type: 'ann', ready: true },
                signalAnomaly: { type: 'cnn-lstm', ready: true }
            };

            this.isInitialized = true;
            console.log('✅ ML Service initialized successfully (Lightweight Mode)');
            console.log(`📊 Loaded ${Object.keys(this.models).length} simulation models`);
        } catch (error) {
            console.error('❌ ML Service initialization failed:', error);
            throw error;
        }
    }

    /**
     * Add sensor reading to buffer
     */
    addSensorReading(data) {
        this.dataBuffer.sensorReadings.push({
            ...data,
            timestamp: Date.now()
        });

        if (this.dataBuffer.sensorReadings.length > this.dataBuffer.maxBufferSize) {
            this.dataBuffer.sensorReadings.shift();
        }
    }

    /**
     * Predict demand for next 24 hours (LSTM simulation)
     */
    async predictDemand(zone, historicalData) {
        if (!this.isInitialized) throw new Error('ML Service not initialized');

        try {
            const predictions = [];
            const now = new Date();

            // Use last data point as baseline
            const lastFlow = historicalData[historicalData.length - 1]?.flow || 100;

            for (let i = 0; i < 24; i++) {
                const hour = (now.getHours() + i + 1) % 24;
                const time = new Date(now.getTime() + (i + 1) * 3600000);

                // Simulate daily pattern with peaks at 8am and 7pm
                const morningPeak = 100 * Math.exp(-Math.pow(hour - 8, 2) / 8);
                const eveningPeak = 80 * Math.exp(-Math.pow(hour - 19, 2) / 12);
                const baseline = 50;
                const noise = (Math.random() - 0.5) * 10;

                const predicted = baseline + morningPeak + eveningPeak + noise;

                predictions.push({
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    predicted: parseFloat(predicted.toFixed(2)),
                    upper: parseFloat((predicted * 1.15).toFixed(2)),
                    lower: parseFloat((predicted * 0.85).toFixed(2))
                });
            }

            return predictions;
        } catch (error) {
            console.error('Demand prediction error:', error);
            return this.getFallbackDemandPrediction();
        }
    }

    /**
     * Detect leak probability (CNN simulation)
     */
    async detectLeak(recentReadings) {
        if (!this.isInitialized) throw new Error('ML Service not initialized');

        try {
            // Analyze flow and pressure patterns
            const flows = recentReadings.map(r => r.flow);
            const pressures = recentReadings.map(r => r.pressure);

            const avgFlow = stats.mean(flows);
            const avgPressure = stats.mean(pressures);
            const flowVariance = stats.variance(flows);

            // Leak indicators: high flow + low pressure + high variance
            let probability = 0;

            if (avgPressure < 15 && avgFlow > 120) {
                probability = 0.85 + Math.random() * 0.1;
            } else if (avgPressure < 20 && avgFlow > 100) {
                probability = 0.5 + Math.random() * 0.2;
            } else if (flowVariance > 100) {
                probability = 0.3 + Math.random() * 0.15;
            } else {
                probability = Math.random() * 0.2;
            }

            return {
                probability: Math.min(probability, 1),
                classification: probability > 0.5 ? 'leak' : 'normal',
                confidence: Math.abs(probability - 0.5) * 2
            };
        } catch (error) {
            console.error('Leak detection error:', error);
            return { probability: 0, classification: 'normal', confidence: 0 };
        }
    }

    /**
     * Optimize pump schedule (ANN simulation)
     */
    async optimizePumpSchedule(currentState, demandForecast) {
        if (!this.isInitialized) throw new Error('ML Service not initialized');

        try {
            const schedule = [];
            const now = new Date();

            for (let i = 0; i < 24; i++) {
                const hour = (now.getHours() + i) % 24;
                const time = new Date(now.getTime() + i * 3600000);

                // Run pumps during off-peak hours (22:00-06:00) and high demand periods
                const isOffPeak = hour < 6 || hour >= 22;
                const isHighDemand = demandForecast[i]?.predicted > 120;
                const pumpOn = isOffPeak || isHighDemand;

                schedule.push({
                    hour: hour,
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    pumpOn: pumpOn,
                    confidence: 0.85 + Math.random() * 0.1
                });
            }

            return schedule;
        } catch (error) {
            console.error('Pump optimization error:', error);
            return this.getFallbackPumpSchedule();
        }
    }

    /**
     * Predict tank levels (LSTM simulation)
     */
    async predictTankLevels(zone, recentData) {
        if (!this.isInitialized) throw new Error('ML Service not initialized');

        try {
            const predictions = [];
            const now = new Date();
            let currentLevel = recentData[recentData.length - 1]?.level || 80;

            for (let i = 0; i < 12; i++) {
                const time = new Date(now.getTime() + (i + 1) * 3600000);

                // Simulate level changes based on time of day
                const hour = time.getHours();
                const isHighUsage = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
                const change = isHighUsage ? -3 - Math.random() * 2 : 1 + Math.random() * 2;

                currentLevel = Math.max(20, Math.min(95, currentLevel + change));

                predictions.push({
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    level: parseFloat(currentLevel.toFixed(2)),
                    alert: currentLevel > 95 ? 'overflow_risk' : currentLevel < 20 ? 'shortage_risk' : 'normal'
                });
            }

            return predictions;
        } catch (error) {
            console.error('Tank prediction error:', error);
            return this.getFallbackTankPrediction();
        }
    }

    /**
     * Estimate ROI (ANN simulation)
     */
    async estimateROI(optimizationData) {
        if (!this.isInitialized) throw new Error('ML Service not initialized');

        try {
            const currentConsumption = optimizationData.currentConsumption;
            const optimizedConsumption = optimizationData.optimizedConsumption;
            const waterSaved = currentConsumption - optimizedConsumption;

            const waterSavingsLitersPerDay = waterSaved;
            const costSavingsPerMonth = waterSaved * optimizationData.waterCostPerLiter * 30;
            const energySavings = optimizationData.pumpEfficiency * 100;

            return {
                waterSavingsLitersPerDay: Math.max(0, waterSavingsLitersPerDay),
                costSavingsPerMonth: Math.max(0, costSavingsPerMonth),
                paybackPeriodMonths: optimizationData.implementationCost / Math.max(costSavingsPerMonth, 1)
            };
        } catch (error) {
            console.error('ROI estimation error:', error);
            return { waterSavingsLitersPerDay: 0, costSavingsPerMonth: 0, paybackPeriodMonths: 0 };
        }
    }

    // Fallback methods
    getFallbackDemandPrediction() {
        const predictions = [];
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const hour = (now.getHours() + i + 1) % 24;
            const base = 50 + 100 * Math.exp(-Math.pow(hour - 8, 2) / 2.25) +
                80 * Math.exp(-Math.pow(hour - 19, 2) / 4);
            const time = new Date(now.getTime() + (i + 1) * 3600000);
            predictions.push({
                time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                predicted: parseFloat(base.toFixed(2)),
                upper: parseFloat((base * 1.15).toFixed(2)),
                lower: parseFloat((base * 0.85).toFixed(2))
            });
        }
        return predictions;
    }

    getFallbackPumpSchedule() {
        const schedule = [];
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const hour = (now.getHours() + i) % 24;
            const isOffPeak = hour < 6 || hour >= 22;
            const time = new Date(now.getTime() + i * 3600000);
            schedule.push({
                hour: hour,
                time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                pumpOn: isOffPeak,
                confidence: 0.7
            });
        }
        return schedule;
    }

    getFallbackTankPrediction() {
        const predictions = [];
        const now = new Date();
        let currentLevel = 80;
        for (let i = 0; i < 12; i++) {
            currentLevel += (Math.random() - 0.5) * 5;
            currentLevel = Math.max(20, Math.min(95, currentLevel));
            const time = new Date(now.getTime() + (i + 1) * 3600000);
            predictions.push({
                time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                level: parseFloat(currentLevel.toFixed(2)),
                alert: currentLevel > 95 ? 'overflow_risk' : currentLevel < 20 ? 'shortage_risk' : 'normal'
            });
        }
        return predictions;
    }
}

// Singleton instance
const mlService = new MLService();

module.exports = mlService;
