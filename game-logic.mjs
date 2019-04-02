import {
    initSquares,
} from "./model-builder.mjs";

export class GameLogic {
    constructor(gl) {
        const playerModel = initSquares(gl, 1, [
            [-1, 0, 0],
            [1, 0, 2],
            [0, 0.25],
            [0.125, 0]
        ]);
        this.player = new Player(0, 0, playerModel, [0.5, 0.5], 1, 2);

        const bridge = [];

        for (let i = 0; i < 50; ++i) {
            bridge.push(
                [
                    [-5, 10 + i * 2, 0],
                    [5, 12 + i * 2, 0],
                    [0, 1 / 4 + 1 / 16],
                    [0.125, 1 / 4]
                ]
            )
        }

        this.worldGeometry = [{
            model: initSquares(gl, 10,
                [
                    [-10, -10, 0],
                    [10, 10, 0],
                    [0, 1],
                    [0.5, 0.5]
                ],
                ...bridge,
                [
                    [-10, 110, 0],
                    [10, 130, 0],
                    [0.5, 1],
                    [1, 0.5]
                ],
            ),
            scale: [1 / 10, 1 / 10],
            position: [0, 0, 0],
        }];

        this.rigidBodies = [];

        this.lastTick = -1;
    }

    tick() {
        this.player.tick(this);
    }

    performTicks(timestamp) {
        //only perform up to 5 ticks per frame.  Any ticks beyond that point are forgotten
        this.lastTick = Math.max(this.lastTick, timestamp - msPerTick * 5);

        while (this.lastTick + msPerTick < timestamp) {
            this.tick();
            this.lastTick += msPerTick;
        }
    }

    getX(physicsObj, timestamp) {
        return physicsObj.prevX + (physicsObj.x - physicsObj.prevX) * Math.max(0, timestamp - this.lastTick) / msPerTick;
    }

    getY(physicsObj, timestamp) {
        return physicsObj.prevY + (physicsObj.y - physicsObj.prevY) * Math.max(0, timestamp - this.lastTick) / msPerTick;
    }

    getZ(physicsObj, timestamp) {
        return physicsObj.height / 2;
    }

    togglePhysics() {
        if (this.lastTick === Infinity) {
            this.lastTick = performance.now();
        } else {
            this.lastTick = Infinity;
        }
    }
}

//tick rate is global because it is a debug feature
let ticksPerSecond = 0;
let msPerTick = 0;

export function setTickRateScale(scale, gameLogic) {
    ticksPerSecond = 50 * scale;
    msPerTick = 1000 / ticksPerSecond;

    if (gameLogic) {
        gameLogic.lastTick = performance.now();
    }
}

setTickRateScale(1);

export class Player {
    constructor(x = 0, y = 0, model, scale, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.prevX = x;
        this.prevY = y;
        this.model = model;
        this.scale = scale;
        this.targetX = x;
        this.targetY = y;
    }

    tick(gameLogic) {
        this.prevX = this.x;
        this.prevY = this.y;

        if (this.hasTargetPosition()) {
            const diff = [this.targetX - this.x, this.targetY - this.y];
            const mag = Math.hypot(...diff);
            diff[0] /= mag;
            diff[1] /= mag;

            const distance = Math.min(mag, 1 / 5);

            this.x += diff[0] * distance;
            this.y += diff[1] * distance;
        }
    }

    setTargetPosition(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    getTargetPosition() {
        return [this.targetX, this.targetY];
    }

    hasTargetPosition() {
        return this.x !== this.targetX || this.y !== this.targetY;
    }

    teleport(x, y) {
        this.x = x;
        this.y = y;
    }
}