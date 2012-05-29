(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dcl = factory();
	}
})(function(){
	"use strict";

	var counter = 0, cname = "constructor", pname = "prototype", F = new Function, empty = {},
		mixIn, delegate, mixInChains, extractChain, stubSuper, stubChain, stub, post;

	function dcl(superClass, props){
		var bases, proto, base, ctor, m, o, r, b, i, j = 0, n;

		if(superClass){
			if(superClass instanceof Array){
				// mixins: C3 MRO approximation
				m = {}; o = {}; r = []; b = [];
				for(i = superClass.length - 1; i >= 0; --i){
					base = superClass[i];
					// pre-process a base
					// 1) add a unique id
					base._u = base._u || counter++;
					// 2) build a connection map and the base list
					if((proto = base._m)){   // intentional assignment
						for(bases = proto.b, j = bases.length - 2; j >= 0; --j){
							n = bases[j]._u;
							(m[n] = m[n] || []).push(bases[j + 1]);
						}
						b = b.concat(bases);
					}else{
						b.push(base);
					}
				}
				// build output
				while(b.length){
					base = b.pop();
					n = base._u;
					if(!o[n]){
						if(m[n]){
							b = b.concat(base, m[n]);
							m[n] = 0;
						}else{
							o[n] = 1;
							r.push(base);
						}
					}
				}
				r.push(0); // reserve space for this class
				// calculate a base class
				base = superClass[0];
				j = r.length - ((m = base._m) && base === r[(j = m.b.length) - 1] ? j : 1); // intentional assignments
				bases = r.reverse();
				superClass = bases[j--];
			}else{
				// single inheritance
				bases = [0].concat((m = superClass._m) ? m.b: superClass);   // intentional assignment
			}
			// create a base class
			proto = delegate(superClass[pname]);
		}else{
			// no super class
			bases = [0];
			proto = {};
		}
		// the next line assumes that constructor is actually named "constructor", should be changed if desired
		r = superClass && (m = superClass._m) ? delegate(m.w) : {constructor: 2};   // intentional assignment

		// create prototype: mix in mixins and props
		for(; j > 0; --j){
			base = bases[j];
			m = base._m;
			if(m){
				mixIn(proto, m.h);
				mixInChains(r, m.w);
			}else{
				mixIn(proto, base[pname]);
			}
		}
		for(n in props){
			if(isSuper(m = props[n])){  // intentional assignment
				r[n] = +r[n] || 3;
			}else{
				proto[n] = m;
			}
		}

		// create stubs
		o = {b: bases, h: props, w: r, c: {}};
		bases[0] = {_m: o};
		buildStubs(o, proto);
		ctor = proto[cname];

		// put in place all decorations and return a constructor
		ctor._m  = o;
		ctor[pname] = proto;
		//proto.constructor = ctor; // uncomment if constructor is not named "constructor"
		bases[0] = ctor;

		return post && post(ctor) || ctor;
	}

	// decorators

	function Super(f){ this.f = f; }
	function isSuper(f){ return f instanceof Super; }

	// utilities

	(mixInChains = mixIn = function(a, b){
		for(var n in b){
			a[n] = b[n];
		}
	})(dcl, {
		// piblic API
		mix: mixIn,
		delegate: delegate = function(o){
			F[pname] = o;
			var t = new F;
			F[pname] = null;
			return t;
		},
		Super: Super,
		superCall: function(f){ return new Super(f); },
		// protected API (don't use it!)
		_set: function(m, bs){
			mixInChains = m;
			buildStubs = bs;
		},
		_post: function(p){
			post = p;
		},
		_ec: extractChain = function(bases, name, advice){
			var i = bases.length - 1, r = [], b, f, around = advice == "f";
			for(; i >= 0; --i){
				b = bases[i];
				if((f = b._m) ? (f = f.h).hasOwnProperty(name) && (isSuper(f = f[name]) ? (around ? f.f : (f = f[advice])) : around) : around && (f = b[pname][name]) && f !== empty[name]){
					r.push(f);
				}
			}
			return r;
		},
		_sc: stubChain = function(chain){ // this is "after" chain
			return chain.length ? function(){
				for(var i = 0, l = chain.length; i < l; ++i){
					chain[i].apply(this, arguments);
				}
			} : 0;
		},
		_ss: stubSuper = function(chain, name){
			var i = 0, f, p = empty[name];
			for(; f = chain[i]; ++i){
				if(isSuper(f)){  // intentional assignment
					p = chain[i] = f.f(p);
					p.ctr = f.ctr;
				}else{
					p = f;
				}
			}
			return p;
		},
		_st: stub = function(chain, stub){
			var i = 0, f, t, pi = 0;
			for(; f = chain[i]; ++i){
				if(isSuper(f)){
					t = i - pi;
					t = chain[i] = f.f(t == 0 ? 0 : t == 1 ? chain[pi] : stub(chain.slice(pi, i)));
					t.ctr = f.ctr;
					pi = i;
				}
			}
			t = i - pi;
			return t == 0 ? 0 : t == 1 ? chain[pi] : stub(pi ? chain.slice(pi, i) : chain);
		}
	});

	function buildStubs(meta, proto){
		var weaver = meta.w, bases = meta.b, chains = meta.c, name, ch;
		for(name in weaver){
			chains[name] = ch = extractChain(bases, name, "f");
			proto[name] = (weaver[name] === 3 ? stubSuper(ch, name) : stub(ch, stubChain)) || new Function;
		}
	}

	return dcl;
});
