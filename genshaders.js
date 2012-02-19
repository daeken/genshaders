var ctxs = null, vertex_shader;

function s(str) { return str.split(' ') }
var float_functions = s('sin asin cos acos tan atan exp log exp2 log2 sqrt inversesqrt abs ceil floor fract sign');
var float_binary_functions = s('pow mod');
var arith = s('+ - * /');
var any2_functions = s('distance dot');
function pick(a) { return a[~~(Math.random() * a.length)] }

var values;

var time, renderTimeout = null;

function random(i) { return ~~(Math.random() * i) }

function genValue(i, isConst) {
	i = i === undefined ? 0 : i+1;
	isConst = isConst === undefined ? [false] : isConst;
	while(true) {
		switch(random(i < 5 ? 3 : 2)) {
			case 0:
				if(i < 3 && random(5) != 0)
					continue;
				var v = pick(values);
				//if(isConst[0] == v)
				//i	continue;
				isConst[0] = v;
				if(random(3) != 0) {
					if(random(2) == 0)
						var rnd = Math.random();
					else
						var rnd = Math.random() / (Math.random() + 0.0000001);
					if(random(4) != 0)
						v = '(' + v + pick(arith) + rnd + ')';
					else
						v = ' -' + '(' + v + ')';
				}
				return v;
			case 1:
				if(isConst[0] !== true || i < 3 && random(5) != 0)
					continue;
				isConst[0] = true;
				var inv = random(2) == 0 ? ' -' : '';
				if(random(2) == 0)
					return inv + Math.random();
				else
					return inv + (Math.random() / (Math.random() + 0.0000001));
			case 2:
				switch(random(4)) {
					case 0:
						return pick(float_functions) + '(' + genValue(i) + ')';
					case 1:
						isConst = [false];
						return '(' + genValue(i, isConst) + pick(arith) + genValue(i, isConst) + ')';
					case 2:
						var type = random(3);
						return pick(any2_functions) + '(' + genNumVec(type, i) + ', ' + genNumVec(type, i) + ')';
					case 3:
						isConst = [false];
						return pick(float_binary_functions) + '(' + genValue(i, isConst) + ', ' + genValue(i, isConst) + ')';
				}
		}
	}
}

function genNumVec(n, i) {
	var vec;
	switch(n) {
		case 0:
			vec = genVec2(i);
		case 1:
			vec = genVec3(i);
		case 2:
			vec = genVec4(i);
	}
	if(i > 3 || random(3) != 0)
		return vec;
	
	var val2;
	if(random(2) == 0)
		val2 = genValue(i+1);
	else
		val2 = genNumVec(n, i+1);
	vec = '(' + vec + pick(arith) + val2 + ')';
	if(random(3) == 0)
		return vec;
	
	return pick(float_functions) + '(' + vec + ')';
}

function genVec2(i) {
	var v;
	switch(random(2)) {
		case 0: v = 'coord'; break;
		case 1: v = 'vec2(' + genValue(i) + ', ' + genValue(i) + ')'; break;
	}
	if(random(2) == 0)
		v = 'rotate2d(' + v + ', ' + genValue(i) + ')';
	return v;
}

function genVec3(i) {
	if(i < 3 && random(2) == 0)
		return 'cross(' + genVec3(i+1) + ', ' + genVec3(i+1) + ')';
	return 'vec3(' + genValue(i) + ', ' + genValue(i) + ', ' + genValue(i) + ')';
}

function genVec4(i) {
	return 'vec4(' + genValue(i) + ', ' + genValue(i) + ', ' + genValue(i) + ', ' + genValue(i) + ')';
}

function transformCoord() {
	if(random(50) != 0)
		return '';
	switch(random(2)) {
		case 0: return 'coord = rotate2d(coord, ' + genValue() + ');';
		case 1: return 'coord ' + (pick('+++-')) + '= ' + (random(2) == 0 ? genValue() : genVec2(5)) + ';';
	}
}

function buildShader() {
	var shader = 'precision highp float;';

	values = ['coord.x', 'coord.y', 'time'];
	shader += 'uniform float time;';
	shader += 'vec2 rotate2d(vec2 i, float a) { float ca = cos(a), sa = sin(a); return vec2(i.x * ca - i.y * sa, i.y * ca + i.x * sa); }';
	shader += 'void main(void) {';
	shader += 'vec2 coord = gl_FragCoord.xy / vec2(400.0, 225.0);'
	shader += transformCoord();
	var numVars = random(3);
	var numValuesPer = [];
	var total = 0;
	for(var i = 0; i < numVars; ++i) {
		total += (numValuesPer[i] = random(5));
		shader += 'float val' + i + ' = ' + genValue() + ';';
		values.push('val' + i);
	}

	while(total > 0) {
		var p = random(numVars);
		if(numValuesPer[p] == 0)
			continue;
		shader += transformCoord();
		shader += 'val' + p + ' ' + pick(arith) + '= ' + genValue(0, [random(2) == 0]) + ';';
		total--;
		numValuesPer[p]--;
	}

	shader += transformCoord();
	/*shader += 'vec3 hsv = abs(vec3(' + genValue(0, [random(2) == 0]) + ', ' + genValue(0, [random(2) == 0]) + ', ' + genValue(0, [random(2) == 0]) + '));';
	shader += 'float chroma = hsv.y * hsv.z;';
	shader += 'float hdash = hsv.x * 6.0;';
	shader += 'float x = chroma * (1.0 - abs(mod(hdash, 2.0) - 1.0));'
	shader += 'float min = hsv.z - chroma;'
	shader += 'vec4 o = vec4(min, min, min, 1);';
	shader += 'if(hdash < 1.0) { o.x += chroma; o.y += x; }';
	shader += 'else if(hdash < 2.0) { o.x += x; o.y += chroma; }';
	shader += 'else if(hdash < 3.0) { o.y += chroma; o.z += x; }';
	shader += 'else if(hdash < 4.0) { o.y += x; o.z += chroma; }';
	shader += 'else if(hdash < 5.0) { o.x += chroma; o.z += x; }';
	shader += 'gl_FragColor = o;';*/
	shader += 'gl_FragColor = abs(vec4(' + genValue(0, [random(2) == 0]) + ', ' + genValue(0, [random(2) == 0]) + ', ' + genValue(0, [random(2) == 0]) + ', 1.0));';
	shader += '}';
	//console.log(shader);
	return shader;
}

function genIteration(last) {
	$('#spinner').show();
	setTimeout(function() {
		var elems = $('.canvas-container');
		function per(i) {
			if(i == 12) {
				$('#spinner').hide();
				if(renderTimeout != null)
					clearTimeout(renderTimeout);
				renderTimeout = setTimeout(function() { genIteration() }, 30000);
			} else {
				while(!change(ctxs[i], buildShader(last, i)));
				setTimeout(function() { per(i+1) }, 1)
			}
		}
		per(0)
	}, 1)
}

function init(elem, shader) {
	var gl = elem.getContext('experimental-webgl') || elem.getContext('webgl');
	var verts = new Float32Array([0,0,2,0,0,2,2,0,2,2,0,2]);
	var vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
	gl.viewport(0, 0, 400, 225);
	gl.first = true;
	gl.elem = elem;

	return gl;
}

function change(gl, shader) {
	var prog = gl.createProgram();
	var vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(vs, vertex_shader);
	gl.compileShader(vs);
	gl.attachShader(prog, vs);
	gl.shaderSource(fs, shader);
	gl.compileShader(fs);
	if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.log('Fragment shader failed: ' + gl.getShaderInfoLog(fs));
		//alert('fail');
		return false;
	}
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.log('Link failed: ' + gl.getProgramInfoLog(prog));
		//alert('fail');
		return false;
	}
	gl.useProgram(prog);
	gl.prog = prog;
	var pos = gl.getAttribLocation(prog, 'pos');
	gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(pos);
	gl.time = gl.getUniformLocation(prog, 'time');
	gl.ltime = new Date;
	render(gl);
	return true;
}

function render(gl) {
	gl.uniform1f(gl.time, (((new Date()) - gl.ltime) % 30000) / 1e3);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	if(window.mozRequestAnimationFrame) window.mozRequestAnimationFrame(function() { render(gl) }, gl.elem);
	if(window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame(function() { render(gl) }, gl.elem);
}

$(document).ready(function() {
	vertex_shader = document.getElementById('vertex_shader').innerHTML;
	var elems = $('.canvas-container');
	ctxs = [];
	elems.each(function(i, a) {
		var elem = $('<canvas id="canvas_' + i + '" width="400" height="225">').click(
			function() {
				genIteration(i)
			}
		);
		$(a).append(elem);
		ctxs[i] = init(elem[0]);
	})
	var elem = document.body;
	if(elem.mozRequestFullScreen || elem.webkitRequestFullScreen)
		$('#fullscreen').show().click(function() {
			if(document.mozFullScreen || document.webkitIsFullScreen) {
				if(elem.mozRequestFullScreen) document.mozCancelFullScreen();
				if(elem.webkitRequestFullScreen) document.webkitCancelFullScreen();
			} else {
				if(elem.mozRequestFullScreen) elem.mozRequestFullScreen();
				if(elem.webkitRequestFullScreen) elem.webkitRequestFullScreen();
			}
		});
	$('#refresh').click(function() { genIteration() });
	$(document).keypress(function(evt) {
		if(evt.which == 32)
			genIteration();
	});
	genIteration()
})
