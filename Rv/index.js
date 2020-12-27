(function () {
	function RandomID(randomLength){
		return Number(Math.random().toString().substr(3,randomLength) + Date.now()).toString(36)
	}

	let isCreateEl = false;
	const deps = [];
	function addDep(id) {
		if (deps.includes(id)) return;
		deps.push(id);
	}
	function clearDep() {
		deps.length = 0;
	}

	const data = new Proxy({}, {
		get(target, key) {
			if (isCreateEl) {
				addDep(key);
			}
			return target[key]
		}
	});
	const relation = {};
	const effectList = {};

	const isFun = (val) => typeof val === 'function';
	const isSymbol = (val) => typeof val === 'symbol';
	const getExpVal = (val) => {
		let result = isFun(val) ? val(data) : val
		if (isSymbol(result)) {
			result = data[result];
		}
		return result;
	}

	function addRelation(deps, el, attr, value) {
		if (deps.length === 0) return;
		deps.forEach((k) => {
			if (!relation[k]) relation[k] = [];
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
		if (!effectList[id]) return;
		effectList[id].forEach(callBack => callBack());
	}

	const mR = {
		useEl(tagName) {
			return (attr={}, ...children) => {
				isCreateEl = true;
				const ele = document.createElement(tagName);
				Object.entries(attr).forEach(([key, value]) => {
					if (key.startsWith('on')) {
						ele.addEventListener(key.substr(2), value);
						return;
					}
					ele.setAttribute(key, getExpVal(value));
					addRelation(deps, ele, key, value);
				})
				children.forEach((el) => {
					if (el instanceof HTMLElement) {
						ele.appendChild(el);
					} else {
						const textNode = document.createTextNode(getExpVal(el));
						addRelation(deps, textNode, 'nodeValue', el);
						ele.appendChild(textNode);
					}
				})
				isCreateEl = false;
				return ele;
			}
		},
		// babel 自定义语法
		useStateNew(val) {
			const id = Symbol(RandomID(2));
			data[id] = val;
			const getVal = () => data[id];
			function setVal(val) {
				data[id] = val;
				domReact(id);
				effectReact(id);
			}
			const varO = Object.create(null); // *var
			varO.address = id; // var
			varO.getVal = getVal; // *var
			varO.setVal = setVal; // *var = 
			return varO; // *var
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
			const varO = Object.create(null);
			varO.address = id;
			varO.getVal = getVal;
			varO.setVal = setVal;
			return [id, setVal, getVal, varO];
		},
		useEffect(fun, deps) {
			// TODO deps为空的情况 组件加载完成的回调
			deps.forEach((id) => {
				if (effectList[id]) {
					effectList[id].push(fun);
				} else {
					effectList[id] = [fun];
				}
			})
			// 另一种
			// effectList.push({
			// 	deps,
			// 	callBack: fun
			// })
		},
		setAttr() {},
		op(...arg) {
			const expr = arg.shift();
			const formalParams = [];
			const varParams = [];
			arg.forEach((item, index) => {
				if (index + 1 <= arg.length / 2) {
					formalParams.push(item);
				} else {
					varParams.push(item);
				}
			})
			const fun = new Function(...formalParams, `return ${expr}`);
			return (data) => fun(...varParams.map((item => isSymbol(item) ? data[item] : item)));
		},
		opp(expr) {
			// expr的变量替换为data[变量名]
			return function() {
				return expr
			}
		},
		withProp(T, attr, ...children) {
			return T({
				...attr,
				// attr 传入路由信息等等
				children
			})
		}
	};
	window.mR = mR;
})()
