(function () {
	function RandomID(randomLength){
		return Number(Math.random().toString().substr(3,randomLength) + Date.now()).toString(36)
	}

	const deps = [];
	function addDep(id) {
		if (deps.includes(id)) return;
		deps.push(id);
	}
	function clearDep() {
		deps.length = 0;
	}

	const data = {};
	const relation = {};
	const effectList = [];

	const isFun = (val) => typeof val === 'function';
	const isSymbol = (val) => typeof val === 'symbol';
	const getExpVal = (val) => isFun(val) ? val(data) : val

	function addRelation(deps, el, attr, value) {
		deps.forEach((k) => {
			if (!relation[k]) relation[k] = [];
			//
			const elObj = relation[k].find((item) => item.el === el);
			if (elObj) elObj.props.push({ attr, value });
			relation[k].push({
				el,
				type: attr === 'nodeValue' ? 'text' : 'element',
				props: [{ attr, value }]
			})
		})
		clearDep();
	}

	function domReact(id) {
		if (!relation[id]) return;
		relation[id].forEach(({ el, type, props }) => {
			if (type === 'text') {
				if (isSymbol(props[0].value)) {
					el.nodeValue = data[props[0].value];
				} else {
					el.nodeValue = props[0].value(data);
				}
			} else {
				props.forEach(({ attr, value }) => {
					if (isSymbol(value)) {
						el.setAttribute(attr, data[value]);
					} else if (isSymbol(value(data))) {
						el.setAttribute(attr, data[value(data)]);	
					} else {
						el.setAttribute(attr, value(data));
					}
				})
			}
		})
	}

	function effectReact(id) {
		// if (!effectList[id]) return;
		// effectList[id].forEach(callBack => callBack());
	}

	const mR = {
		useEl(tagName) {
			return (attr={}, ...children) => {
				const ele = document.createElement(tagName);
				Object.entries(attr).forEach(([key, value]) => {
					if (key.startsWith('on')) {
						ele.addEventListener(key.substr(2), value);
						return;
					}
					let VALUE;
					if (isFun(value)) {
						// ele[key] = value;
						VALUE = value(data);
						addRelation(deps, ele, key, value);
						// console.log(relation);
					} else {
						VALUE = value;
					}
					if (isSymbol(VALUE)) {
						addRelation([VALUE], ele, key, VALUE);
						VALUE = data[VALUE];
					}
					ele.setAttribute(key, VALUE);
				})
				children.forEach((el) => {
					if (el instanceof HTMLElement) {
						ele.appendChild(el);
					} else {
						let val = getExpVal(el);
						if (isSymbol(val)) {
							addDep(val);
							val = data[val]
						}
						const textNode = document.createTextNode(val);
						// console.log(deps);
						addRelation(deps, textNode, 'nodeValue', el);
						// clearDep();
						ele.appendChild(textNode);
					}
				})
				return ele;
			}
		},
		useState(val) {
			const id = Symbol(RandomID(2));
			data[id] = val;
			const getVal = () => data[id];
			function setVal(val) {
				data[id] = val;
				domReact(id);
				effectReact(id);
			}
			return [id, setVal, getVal];
		},
		useEffect(fun, deps) {
			effectList.push({
				deps,
				callBack: () => fun()
			})
		},
		setAttr() {},
		op(a, b, operator) {
			return function(obj) {
				let A, B;
				A = getExpVal(a);
				B = getExpVal(b);
				if (obj[A] !== undefined) {
					addDep(A);
					A = obj[A];
				}
				if (obj[B] !== undefined) {
					addDep(B);
					B = obj[B];
				}
				switch (operator){
					case '+':
						return A + B;
					case '-':
						return A - B;
					case '*':
						return A * B;
					case '/':
						return A / B;
					case '%':
						return A % B;
					case '<':
						return A < B;
					case '>':
						return A > B;
					case '>=':
						return A >= B;
					case '<=':
						return A <= B;
					case '==':
						return A == B;
					case '===':
						return A === B;
					case '!==':
						return A !== B;
					// && ||
				}
			}
		},
		tri(expr, texp, fexp) {
			return function() {
				return expr(data) ? getExpVal(texp) : getExpVal(fexp)
			}
		},
		fn(obj, fname) {
		}
	};
	window.mR = mR;
})()