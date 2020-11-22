
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/ContactCard.svelte generated by Svelte v3.29.7 */

    const file = "src/ContactCard.svelte";

    function create_fragment(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let hr;
    	let div0_class_value;
    	let t1;
    	let div1;
    	let h1;
    	let t2;
    	let h1_class_value;
    	let t3;
    	let h2;
    	let t4;
    	let h2_class_value;
    	let t5;
    	let div2;
    	let p;
    	let t6;
    	let div2_class_value;
    	let header_class_value;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			hr = element("hr");
    			t1 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t2 = text(/*userName*/ ctx[0]);
    			t3 = space();
    			h2 = element("h2");
    			t4 = text(/*jobTitle*/ ctx[2]);
    			t5 = space();
    			div2 = element("div");
    			p = element("p");
    			t6 = text(/*description*/ ctx[3]);
    			if (img.src !== (img_src_value = /*image*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = "" + (/*userName*/ ctx[0] + "'s Image'"));
    			attr_dev(img, "height", "200");
    			add_location(img, file, 46, 3, 719);
    			add_location(hr, file, 47, 3, 782);
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(/*image*/ ctx[1] ? "thumb" : "no-thumb") + " svelte-b5lect"));
    			add_location(div0, file, 45, 2, 671);
    			attr_dev(h1, "class", h1_class_value = "" + (null_to_empty(/*userName*/ ctx[0] ? "userName" : "hidden") + " svelte-b5lect"));
    			add_location(h1, file, 50, 3, 807);
    			attr_dev(h2, "class", h2_class_value = "" + (null_to_empty(/*jobTitle*/ ctx[2] ? "jobTitle" : "hidden") + " svelte-b5lect"));
    			add_location(h2, file, 51, 3, 873);
    			add_location(div1, file, 49, 2, 798);
    			attr_dev(p, "class", "svelte-b5lect");
    			add_location(p, file, 54, 3, 1005);
    			attr_dev(div2, "class", div2_class_value = /*description*/ ctx[3] ? "description" : "hidden");
    			add_location(div2, file, 53, 2, 947);
    			attr_dev(header, "class", header_class_value = "" + (null_to_empty(/*userName*/ ctx[0] ? "contact-card" : "hidden") + " svelte-b5lect"));
    			add_location(header, file, 44, 1, 613);
    			attr_dev(div3, "class", "contact-card-wrapper svelte-b5lect");
    			add_location(div3, file, 43, 0, 577);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, hr);
    			append_dev(header, t1);
    			append_dev(header, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, h2);
    			append_dev(h2, t4);
    			append_dev(header, t5);
    			append_dev(header, div2);
    			append_dev(div2, p);
    			append_dev(p, t6);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*image*/ 2 && img.src !== (img_src_value = /*image*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*userName*/ 1 && img_alt_value !== (img_alt_value = "" + (/*userName*/ ctx[0] + "'s Image'"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*image*/ 2 && div0_class_value !== (div0_class_value = "" + (null_to_empty(/*image*/ ctx[1] ? "thumb" : "no-thumb") + " svelte-b5lect"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*userName*/ 1) set_data_dev(t2, /*userName*/ ctx[0]);

    			if (dirty & /*userName*/ 1 && h1_class_value !== (h1_class_value = "" + (null_to_empty(/*userName*/ ctx[0] ? "userName" : "hidden") + " svelte-b5lect"))) {
    				attr_dev(h1, "class", h1_class_value);
    			}

    			if (dirty & /*jobTitle*/ 4) set_data_dev(t4, /*jobTitle*/ ctx[2]);

    			if (dirty & /*jobTitle*/ 4 && h2_class_value !== (h2_class_value = "" + (null_to_empty(/*jobTitle*/ ctx[2] ? "jobTitle" : "hidden") + " svelte-b5lect"))) {
    				attr_dev(h2, "class", h2_class_value);
    			}

    			if (dirty & /*description*/ 8) set_data_dev(t6, /*description*/ ctx[3]);

    			if (dirty & /*description*/ 8 && div2_class_value !== (div2_class_value = /*description*/ ctx[3] ? "description" : "hidden")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (dirty & /*userName*/ 1 && header_class_value !== (header_class_value = "" + (null_to_empty(/*userName*/ ctx[0] ? "contact-card" : "hidden") + " svelte-b5lect"))) {
    				attr_dev(header, "class", header_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ContactCard", slots, []);
    	let { userName } = $$props;
    	let { image } = $$props;
    	let { jobTitle } = $$props;
    	let { description } = $$props;
    	const writable_props = ["userName", "image", "jobTitle", "description"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("userName" in $$props) $$invalidate(0, userName = $$props.userName);
    		if ("image" in $$props) $$invalidate(1, image = $$props.image);
    		if ("jobTitle" in $$props) $$invalidate(2, jobTitle = $$props.jobTitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    	};

    	$$self.$capture_state = () => ({ userName, image, jobTitle, description });

    	$$self.$inject_state = $$props => {
    		if ("userName" in $$props) $$invalidate(0, userName = $$props.userName);
    		if ("image" in $$props) $$invalidate(1, image = $$props.image);
    		if ("jobTitle" in $$props) $$invalidate(2, jobTitle = $$props.jobTitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [userName, image, jobTitle, description];
    }

    class ContactCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			userName: 0,
    			image: 1,
    			jobTitle: 2,
    			description: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactCard",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*userName*/ ctx[0] === undefined && !("userName" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'userName'");
    		}

    		if (/*image*/ ctx[1] === undefined && !("image" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'image'");
    		}

    		if (/*jobTitle*/ ctx[2] === undefined && !("jobTitle" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'jobTitle'");
    		}

    		if (/*description*/ ctx[3] === undefined && !("description" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'description'");
    		}
    	}

    	get userName() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userName(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get image() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set image(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get jobTitle() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set jobTitle(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.7 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let t0;
    	let div;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let input0;
    	let t5;
    	let br0;
    	let t6;
    	let input1;
    	let t7;
    	let br1;
    	let t8;
    	let input2;
    	let t9;
    	let br2;
    	let t10;
    	let textarea;
    	let t11;
    	let br3;
    	let t12;
    	let hr;
    	let t13;
    	let contactcard;
    	let current;
    	let mounted;
    	let dispose;

    	contactcard = new ContactCard({
    			props: {
    				userName: /*name*/ ctx[0],
    				image: /*url*/ ctx[1],
    				jobTitle: /*jobTitle*/ ctx[2],
    				description: /*description*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			t1 = text("Hello ");
    			t2 = text(/*name*/ ctx[0]);
    			t3 = text("!");
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			br0 = element("br");
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			br1 = element("br");
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			textarea = element("textarea");
    			t11 = space();
    			br3 = element("br");
    			t12 = space();
    			hr = element("hr");
    			t13 = space();
    			create_component(contactcard.$$.fragment);
    			document.title = "Chris' Contact Card App";
    			attr_dev(h1, "class", "svelte-1ug2rj7");
    			add_location(h1, file$1, 47, 1, 765);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Enter Your Name");
    			attr_dev(input0, "class", "svelte-1ug2rj7");
    			add_location(input0, file$1, 48, 1, 789);
    			add_location(br0, file$1, 49, 1, 861);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Enter Image URL");
    			attr_dev(input1, "class", "svelte-1ug2rj7");
    			add_location(input1, file$1, 50, 1, 868);
    			add_location(br1, file$1, 51, 1, 939);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Enter A Job Title");
    			attr_dev(input2, "class", "svelte-1ug2rj7");
    			add_location(input2, file$1, 52, 1, 946);
    			add_location(br2, file$1, 53, 1, 1024);
    			attr_dev(textarea, "id", "description");
    			attr_dev(textarea, "name", "description");
    			attr_dev(textarea, "rows", "5");
    			attr_dev(textarea, "placeholder", "Enter A Job Description");
    			attr_dev(textarea, "class", "svelte-1ug2rj7");
    			add_location(textarea, file$1, 54, 1, 1031);
    			attr_dev(div, "class", "container svelte-1ug2rj7");
    			add_location(div, file$1, 46, 0, 740);
    			add_location(br3, file$1, 56, 0, 1160);
    			attr_dev(hr, "class", "imma-hr svelte-1ug2rj7");
    			add_location(hr, file$1, 57, 0, 1165);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(h1, t3);
    			append_dev(div, t4);
    			append_dev(div, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(div, t5);
    			append_dev(div, br0);
    			append_dev(div, t6);
    			append_dev(div, input1);
    			set_input_value(input1, /*url*/ ctx[1]);
    			append_dev(div, t7);
    			append_dev(div, br1);
    			append_dev(div, t8);
    			append_dev(div, input2);
    			set_input_value(input2, /*jobTitle*/ ctx[2]);
    			append_dev(div, t9);
    			append_dev(div, br2);
    			append_dev(div, t10);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*description*/ ctx[3]);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t13, anchor);
    			mount_component(contactcard, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[6]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);

    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*url*/ 2 && input1.value !== /*url*/ ctx[1]) {
    				set_input_value(input1, /*url*/ ctx[1]);
    			}

    			if (dirty & /*jobTitle*/ 4 && input2.value !== /*jobTitle*/ ctx[2]) {
    				set_input_value(input2, /*jobTitle*/ ctx[2]);
    			}

    			if (dirty & /*description*/ 8) {
    				set_input_value(textarea, /*description*/ ctx[3]);
    			}

    			const contactcard_changes = {};
    			if (dirty & /*name*/ 1) contactcard_changes.userName = /*name*/ ctx[0];
    			if (dirty & /*url*/ 2) contactcard_changes.image = /*url*/ ctx[1];
    			if (dirty & /*jobTitle*/ 4) contactcard_changes.jobTitle = /*jobTitle*/ ctx[2];
    			if (dirty & /*description*/ 8) contactcard_changes.description = /*description*/ ctx[3];
    			contactcard.$set(contactcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(contactcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(contactcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t13);
    			destroy_component(contactcard, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let name = "";
    	let url = "";
    	let jobTitle = "";
    	let description = "";

    	function nameInput(event) {
    		const enteredValue = event.target.value;
    		$$invalidate(0, name = enteredValue);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		url = this.value;
    		$$invalidate(1, url);
    	}

    	function input2_input_handler() {
    		jobTitle = this.value;
    		$$invalidate(2, jobTitle);
    	}

    	function textarea_input_handler() {
    		description = this.value;
    		$$invalidate(3, description);
    	}

    	$$self.$capture_state = () => ({
    		ContactCard,
    		name,
    		url,
    		jobTitle,
    		description,
    		nameInput
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("jobTitle" in $$props) $$invalidate(2, jobTitle = $$props.jobTitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		url,
    		jobTitle,
    		description,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
