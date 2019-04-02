import {
    initSquares,
} from "./model-builder.mjs";

export class GameLogic {
    constructor(gl) {
        this.player = new Player(gl, 0, 0);

        const bridge = [];

        for (let i = 0; i < 50; ++i) {
            const x = 10 + i * 2;
            const theta = i / 50 * Math.PI;
            const y = Math.sin(theta) * 10 - 5;
            bridge.push(
                [
                    [x + 2, y, 0, 159, 65],
                    [x + 2, y + 10, 0, 0, 65],
                    [x, y + 10, 0, 0, 95],
                    [x, y, 0, 159, 95],
                ],
                [
                    [x + 2, y, -10, 62, 97],
                    [x + 2, y, 0, 62, 97],
                    [x, y, 0, 33, 97],
                    [x, y, -10, 33, 97],
                ],
                [
                    [x + 2, y + 10, -10, 159, 67],
                    [x + 2, y + 10, 0, 159, 67],
                    [x + 2, y, 0, 0, 67],
                    [x + 2, y, -10, 0, 67],
                ],
                [
                    [x, y, -10, 0, 67],
                    [x, y, 0, 0, 67],
                    [x, y + 10, 0, 159, 67],
                    [x, y + 10, -10, 159, 67],
                ],
            )
        }

        this.worldGeometry = [{
            model: initSquares(gl, 10,
                [
                    [10, -10, 0, 127, 255],
                    [10, 10, 0, 127, 129],
                    [-10, 10, 0, 0, 129],
                    [-10, -10, 0, 0, 255],
                ],
                ...bridge,
                [
                    [130, -10, 0, 255, 255],
                    [130, 10, 0, 255, 129],
                    [110, 10, 0, 129, 129],
                    [110, -10, 0, 129, 255],
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
    constructor(gl, x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.targetX = x;
        this.targetY = y;

        this.width = 1;
        this.height = 2;

        this.angle = 0;

        this.model = initSquares(gl, 1,
            [
                [1, 0, 0, 31, 63],
                [1, 0, 2, 31, 0],
                [-1, 0, 2, 0, 0],
                [-1, 0, 0, 0, 63],
            ],
            [
                [1, 0, 0, 63, 63],
                [1, 0, 2, 63, 0],
                [-1, 0, 2, 33, 0],
                [-1, 0, 0, 33, 63],
            ],
            [
                [1, 0, 0, 95, 63],
                [1, 0, 2, 95, 0],
                [-1, 0, 2, 65, 0],
                [-1, 0, 0, 65, 63],
            ],
            [
                [1, 0, 0, 127, 63],
                [1, 0, 2, 127, 0],
                [-1, 0, 2, 97, 0],
                [-1, 0, 0, 97, 63],
            ],
            [
                [1, 0, 0, 159, 63],
                [1, 0, 2, 159, 0],
                [-1, 0, 2, 129, 0],
                [-1, 0, 0, 129, 63],
            ],
            [
                [1, 0, 0, 97, 63],
                [1, 0, 2, 97, 0],
                [-1, 0, 2, 127, 0],
                [-1, 0, 0, 127, 63],
            ],
            [
                [1, 0, 0, 65, 63],
                [1, 0, 2, 65, 0],
                [-1, 0, 2, 95, 0],
                [-1, 0, 0, 95, 63],
            ],
            [
                [1, 0, 0, 33, 63],
                [1, 0, 2, 33, 0],
                [-1, 0, 2, 63, 0],
                [-1, 0, 0, 63, 63],
            ],
        );
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

            this.angle = Math.atan2(diff[1], diff[0]);
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

    getModelView() {
        let angle = this.angle + 5 * Math.PI / 8;

        if (angle < 0) {
            angle += Math.PI * 2;
        }

        let spriteChoice = Math.floor(angle * 4 / Math.PI);

        return [
            [0.5, 0.5],
            spriteChoice * this.model.vertexCount / 8,
            this.model.vertexCount / 8
        ];
    }
}