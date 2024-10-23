let font;
let path;
let outerPaths = [];
let innerPaths = [];
let paths = [];
let char = '点';
let isSetup = false;
let parts = [];


// フォントをPromiseでロード
// こうしないと日本語フォントは重くて読み込みが間に合わない場合がある
function loadFontAsync(url) {
    return new Promise((resolve, reject) => {
        opentype.load(url, (err, f) => {
            if (err) {
                reject(err);
            } else {
                resolve(f);
            }
        });
    });
}

function preload() {
    loadFontAsync('assets/yumin.ttf')
        .then((f) => {
            font = f;
			setup();
			isSetup = true;
        })
        .catch((err) => {
            console.error('Font could not be loaded:', err);
        });
}

function setup() {
	createCanvas(400, 400);
	background(123);
	frameRate(2);
	if(!isSetup){
		// フォントからパスを取得
		if (font) {
			path = font.getPath(char, 50, 300, 200); // 文字のパスデータを取得
			console.log(path);
			let currentPath={};
	
			for(let i=0;i<path.commands.length; i++){
				let currentCmd = path.commands[i];
				let nextCmd = path.commands[i+1];
				if(currentCmd.type == 'M'){
					currentPath={};
					currentPath.char = char;
					currentPath.cmd = [];
					currentPath.isCounter = false;
					currentPath.ID = paths.length;
					currentPath.parent = -1;
				}
	
				currentPath.cmd.push(currentCmd);
	
				if(currentCmd.type == 'Z'){
					paths.push(currentPath);
				}
			}
		}
		//内包判定
		for(let i=0; i<paths.length; i++){
			let vertex = {};
			vertex.x = paths[i].cmd[0].x;//i番目のパスから一つ頂点を取ってくる
			vertex.y = paths[i].cmd[0].y;

			let numOutsidePoly = 0;

			for(let j=0; j<paths.length; j++){
				if (j != i){
					if(checkVertexInPolygon(vertex,paths[j].cmd)){
						numOutsidePoly++;
					}
				}
			}

			let dist;
			let minDistance = Infinity;		
			//多重に囲まれたパスの場合、そのパスを囲んでいるパスが偶数個なら外側、奇数個なら内側のパスと判定する
			//内側のパスについては最も近く外側にあるパスを親とする
			if (numOutsidePoly%2 == 0){
				paths[i].isCounter = false;
			}else{
				paths[i].isCounter = true;
				for(let j=0; j<paths.length; j++){
					if (j != i){
						if(checkVertexInPolygon(vertex,paths[j].cmd)){
							dist = calcMinDistanceToPolygon(vertex,paths[j].cmd);
							if (dist < minDistance) {
								minDistance = dist;
								paths[i].parent = j;
							}
						}
					}
				}
			}
		}
		
		//文字のパーツ分け
		//まずは親の格納
		for (let i=0; i<paths.length; i++){
			let part = [];
			if(paths[i].parent == -1){
				part.push(paths[i]);
				parts.push(part);
			}
		}
		//子の格納
		for(let i=0; i<paths.length; i++){
			if(paths[i].parent != -1){
				for(let j=0; j<parts.length; j++){
					if(paths[i].parent == parts[j][0].ID){
						parts[j].push(paths[i]);
					}
				}
			}
		}

		console.log(paths);
		console.log(parts);
	}
}

function draw() {
	if(isSetup){
		drawPaths(parts[frameCount%parts.length]);
	}
}


//Crossing Number Algorithm

function checkVertexInPolygon(vertex,polygon){
	let isInside = false;
	let cn = 0; //交差した数
	for(i = 0; i < polygon.length - 2; i++){

		if(((polygon[i].y <= vertex.y) && (polygon[i+1].y > vertex.y )) || ((polygon[i].y > vertex.y) && (polygon[i+1].y <= vertex.y))){
			// 上向きの辺。点Pがy軸方向について、始点と終点の間にある。ただし、終点は含まない
			// 下向きの辺。点Pがy軸方向について、始点と終点の間にある。ただし、始点は含まない

			if (vertex.x < (polygon[i].x + ((vertex.y - polygon[i].y) / (polygon[i+1].y - polygon[i].y) * (polygon[i+1].x - polygon[i].x)))){
				//辺は点Pよりも右側にある。ただし重ならない
				//辺が点Pと同じ高さになる位置を特定し、その時のxの値と点Pのxの値を比較する
				cn++;
			}
		}
	}
	
	if (cn%2 == 1){
		isInside = true;//交差回数が奇数回なら点は多角形に内包される
	}

	return isInside;
}


// 点と線分の最小距離を計算
function vertexToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 頂点と他の辺の最小距離を計算
function calcMinDistanceToPolygon(vertex, polygon) {
    let minDistance = Infinity;

    for (let i = 0; i < polygon.length - 2; i++) {
        let dist = vertexToLineDistance(
            vertex.x, vertex.y,
            polygon[i].x, polygon[i].y,
            polygon[i + 1].x, polygon[i + 1].y
        );
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    return minDistance;
}

function drawPaths(paths){
	beginShape();
	// console.log(paths);
	for(let i = 0; i < paths.length; i++){
		let cmds = paths[i].cmd;
		for (let j = 0; j < cmds.length; j++){
			let cmd = cmds[j];
			if (cmd.type === 'M') {
				// Move to
				if(paths[i].isCounter){
					beginContour();
				}else{
					beginShape();
				}
				vertex(cmd.x, cmd.y);
				
			} else if (cmd.type === 'L') {
				// Line to
				vertex(cmd.x, cmd.y);
			} else if (cmd.type === 'Q') {
				// Quadratic curve
				quadraticVertex(cmd.x1, cmd.y1, cmd.x, cmd.y);
			} else if (cmd.type === 'C') {
				// Bezier curve
				bezierVertex(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
			} else if (cmd.type === 'Z') {
				// end
				if(paths[i].isCounter){
					endContour();
				}
				if(paths[i+1] && !paths[i+1].isCounter){
					endShape(CLOSE);
				}
				
			}
		}
	}
	endShape(CLOSE);
}

