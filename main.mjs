import {
    Mat4,
} from "./matrix-math.mjs";

import {
    GameLogic,
    setTickRateScale
} from "./game-logic.mjs";

import {
    initCircle
} from "./model-builder.mjs";

const debugText = document.getElementById("debugText");

const vsSource =
    `uniform mat4 uMVPMatrix;
attribute vec4 aPosition;
attribute lowp vec2 aTexCoord;
varying lowp vec2 vTexCoord;
void main(void) {
    gl_Position = uMVPMatrix * aPosition;
    vTexCoord = aTexCoord;
}`;

const fsSource =
    `varying lowp vec2 vTexCoord;
uniform sampler2D uSampler;
void main(void) {
    gl_FragColor = texture2D(uSampler, vTexCoord);
    // gl_FragColor = texture2D(uSampler, vTexCoord) * 0.01 + vec4(vTexCoord, 0.0, 1.0);
}`;

const modelViewMatrix = new Mat4();
const viewMatrix = new Mat4();
const perspectiveMatrix = new Mat4();
const viewPerspectiveMatrix = new Mat4();
const tempMatrix = new Mat4();

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl", {
    alpha: false,
    depth: true, //needed for depth culling
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
});

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        position: gl.getAttribLocation(shaderProgram, 'aPosition'),
        texCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
    },
    uniformLocations: {
        mvpMatrix: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
        sampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
    },
};

loadTexture(gl, "atlas.png");
const targetMarker = initCircle(gl, 3, [0.125, 0.125], [0.25, 0.25]);

const gameLogic = new GameLogic(gl);

const camTarget = [0, 0, 1];
const camPos = [gameLogic.player.x, gameLogic.player.y - 4, 4];
const cameraUp = [0, 1, 0];
let zoomFactor = 0;

let prevPointerMovement = performance.now();
let previousFrameTime = performance.now();


gl.clearColor(0.53, 0.81, 0.92, 1);
gl.enable(gl.DEPTH_TEST);


document.body.onresize = function () {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    Mat4.perspectiveMatrix(perspectiveMatrix, 45, aspectRatio, 0.125, 1024);
};
document.body.onresize();


function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}


function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const image = new Image();
    image.src = url;

    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        requestAnimationFrame(drawScene);
    };

    image.onerror = function () {
        const pixel = new Uint8Array([0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixel);

        requestAnimationFrame(drawScene);
    }

    return texture;
}


function drawScene(timestamp) {
    gameLogic.performTicks(timestamp);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const playerX = gameLogic.getX(gameLogic.player, timestamp);
    const playerY = gameLogic.getY(gameLogic.player, timestamp);
    const playerZ = gameLogic.getZ(gameLogic.player, timestamp);

    let debug = "position: (" + playerX.toFixed(2) + ", " + playerY.toFixed(2) + ")";
    if (zoomFactor !== 0) {
        debug = "zoom: " + zoomFactor + "\n" + debug;
    }
    debugText.textContent = debug;

    const cameraHeight = getCameraHeight(zoomFactor);
    const progress = (timestamp - previousFrameTime) / 1000;
    camTarget[0] += (playerX - camTarget[0]) * progress;
    camTarget[1] += (playerY - camTarget[1]) * progress;
    camTarget[2] += (playerZ - camTarget[2]) * progress;

    camPos[0] = camTarget[0];
    camPos[1] = camTarget[1] - cameraHeight;
    camPos[2] = camTarget[2] + cameraHeight;

    previousFrameTime = timestamp;

    Mat4.lookAt(viewMatrix, camPos, camTarget, cameraUp);
    Mat4.multiply(viewPerspectiveMatrix, perspectiveMatrix, viewMatrix);

    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.texCoord);

    for (const geometry of gameLogic.worldGeometry) {
        drawModel(geometry.model, geometry.position, geometry.scale);
    }

    drawModel(gameLogic.player.model, [playerX, playerY, 0.125], gameLogic.player.scale);

    if (gameLogic.player.hasTargetPosition()) {
        const target = [...gameLogic.player.getTargetPosition(), 0.125];
        drawModel(targetMarker, target, [2 ** -15, 2 ** -15]);
    }

    gl.disableVertexAttribArray(programInfo.attribLocations.position);
    gl.disableVertexAttribArray(programInfo.attribLocations.texCoord);

    requestAnimationFrame(drawScene);
}

function drawModel(model, position, scale) {
    modelViewMatrix.data.set(Mat4.IDENTITY.data);

    Mat4.translate(modelViewMatrix, modelViewMatrix, [...position]);
    Mat4.scale(modelViewMatrix, modelViewMatrix, [...scale, 1]);

    Mat4.multiply(tempMatrix, viewPerspectiveMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.mvpMatrix, false, tempMatrix.data);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.SHORT, false, 8, 0);
    gl.vertexAttribPointer(programInfo.attribLocations.texCoord, 2, gl.UNSIGNED_BYTE, true, 8, 6);
    gl.drawArrays(model.mode, 0, model.vertexCount);
}



{
    let touchId = -1;
    let down = false;
    let prevWorldX = 0;
    let prevWorldY = 0;

    canvas.addEventListener("mousedown", function (event) {
        onpointerdown(event.x, event.y);
        down = true;
    });

    canvas.addEventListener("mousemove", function (event) {
        if (down == true) {
            onpointermove(event.x, event.y);
        }
    });

    canvas.addEventListener("mouseup", function (event) {
        onpointerup();
        down = false;
    });

    canvas.addEventListener("mouseleave", function (event) {
        var e = event.toElement || event.relatedTarget;
        if (e == debugText || e == this) {
            return;
        }
        if (down) {
            onpointerup();
        }
        down = false;
    });

    canvas.addEventListener("touchstart", function (event) {
        if (touchId === -1) {
            const touch = event.changedTouches[0];
            touchId = touch.identifier;
            onpointerdown(touch.pageX, touch.pageY);
        }
    });

    function existingTouchHandler(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            if (touch.identifier === touchId) {
                switch (event.type) {
                    case "touchmove":
                        onpointermove(touch.pageX, touch.pageY);
                        break;

                    case "touchend":
                    case "touchcancel":
                        onpointerup();
                        touchId = -1;
                        break;
                }
            }
        }
    }

    canvas.addEventListener("touchmove", existingTouchHandler);
    canvas.addEventListener("touchend", existingTouchHandler);
    canvas.addEventListener("touchcancel", existingTouchHandler);

    function onpointerdown(x, y) {
        gameLogic.player.held = false;

        const clipspaceX = -1 + x / canvas.clientWidth * 2;
        const clipspaceY = 1 - y / canvas.clientHeight * 2;

        const worldSpace = getWorldSpaceFromClipspace(clipspaceX, clipspaceY);
        console.log(...worldSpace);

        gameLogic.player.setTargetPosition(...worldSpace);

        // onpointermove(x, y);
    }

    function onpointermove(x, y) {
        const ray = getWorldSpaceFromClipspace(x, y);


    }

    function onpointerup() {
        gameLogic.player.held = false;
    }
}

document.addEventListener("keydown", function (event) {
    if (event.key >= '0' && event.key <= '9') {
        const tickRateScale = Math.pow(1 / 2, parseInt(event.key));
        setTickRateScale(tickRateScale, gameLogic);
    }

    if (event.key === ".") {
        gameLogic.togglePhysics();
    }
});

document.addEventListener("wheel", function (event) {
    zoomFactor += Math.sign(event.deltaY);
})

/**
 * Uses the current camera configuration to get a ray that it then scans through the world
 * looking for intersection points
 * @param clipspaceX 
 * @param clipspaceY 
 * @return worldXYZ
 */
function getWorldSpaceFromClipspace(clipspaceX, clipspaceY) {
    const direction = [camTarget[0] - camPos[0], camTarget[1] - camPos[1], camTarget[2] - camPos[2]];
    Mat4.lookAt(viewMatrix, [0, 0, 0], direction, cameraUp);
    Mat4.multiply(viewPerspectiveMatrix, perspectiveMatrix, viewMatrix);

    const ray = Mat4.getRayFromClipspace(viewPerspectiveMatrix, [clipspaceX, clipspaceY]);

    //this assumes all intersections occur on the plane z = 0
    const dist = camPos[2] / -ray[2];
    const worldX = ray[0] * dist + camPos[0];
    const worldY = ray[1] * dist + camPos[1];

    return [worldX, worldY, 0];
}

function getCameraHeight(factor) {
    return Math.pow(2 ** 0.25, factor) * 15;
}