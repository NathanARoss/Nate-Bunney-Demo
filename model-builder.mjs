export function initCircle(gl, iterations, [u1, v1], [u2, v2]) {
    let count = 3; //first iteration requires 3 vertexes

    //each successive iteration requires twice as many vertexes as the previous iteration
    let vertexesNeededThisIteration = 9;
    for (let i = 1; i < iterations; ++i) {
        count += vertexesNeededThisIteration;
        vertexesNeededThisIteration *= 2;
    }

    const model = new Int16Array(count * 4);
    let i = 0;
    const radius = 2 ** 15 - 1;

    //first iteration
    for (let vertex = 0; vertex < 3; ++vertex) {
        const theta = Math.PI * 2 / 3 * vertex;
        model[i++] = Math.cos(theta) * radius;
        model[i++] = Math.sin(theta) * radius;
        model[i++] = 0;
        const u = u1 + ((u2 - u1) * 0.5 * (1 + Math.cos(theta)));
        const v = v1 + ((v2 - v1) * 0.5 * (1 - Math.sin(theta)));
        model[i++] = ((u * 255) | 0) + ((v * 255) | 0) * 256;
    }

    //further iterations subdivide the exposed sides into more polygons
    let polygons = 3;
    for (let iteration = 2; iteration <= iterations; ++iteration) {
        for (let p = 0; p < polygons; ++p) {
            for (let vertex = 0; vertex < 3; ++vertex) {
                const theta = Math.PI * (p * 2 + vertex) / polygons;
                model[i++] = Math.cos(theta) * radius;
                model[i++] = Math.sin(theta) * radius;
                model[i++] = 0;
                const u = u1 + ((u2 - u1) * 0.5 * (1 + Math.cos(theta)));
                const v = v1 + ((v2 - v1) * 0.5 * (1 - Math.sin(theta)));
                model[i++] = ((u * 255) | 0) + ((v * 255) | 0) * 256;
            }
        }

        polygons *= 2;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLES
    };
}

export function initSquares(gl, scale, ...squareList) {
    const model = new Int16Array(squareList.length * 6 * 4);
    let i = 0;

    for (const points of squareList) {
        for (const point of [points[0], points[1], points[2], points[2], points[3], points[0]]) {
            model[i++] = point[0] * scale;
            model[i++] = point[1] * scale;
            model[i++] = point[2] * scale;
            model[i++] = point[3] + point[4] * 256;
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLES
    };
}