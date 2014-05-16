var AbstractVisualization = Fiber.extend(function() {
    return {
        init: function(container, history) {
            this.container = container;
            this.history = history;

            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.controls = null;
            this.stats = null;

            this.gui = null;
            this.guiIteration = null;

            this.iteration = 0;
            this.lastIteration = this.iteration;

            this.timer = null;
            this.playing = false;

            this.speed = 500;
            this.maxSpeed = 1000;

            this.snapshot = null;

            this._initScene();
            this._initControls();
            this._initStats();
            this._initGUI();

            this.historyUpdated();
        },

        /* To Override */

        initCamera: function(width, height) {return null;},
        addGuiControls: function() {},

        // Events
        iterationChanged: function(currentSnapshot, lastSnapshot) {},

        /* Public */

        initRenderer: function() {
            return new THREE.WebGLRenderer();
        },

        /* Public */

        render: function() {
            if (this.stats) this.stats.begin();

            this._update();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);

            if (this.stats) this.stats.end();

            requestAnimationFrame(this.render.bind(this));
        },

        historyUpdated: function() {
            var num = this.history.length(),
                guiIteration = this.guiIteration;

            var min = Number(num > 0),
                max = num;

            guiIteration.__min = min;
            guiIteration.__max = max;

            if (guiIteration.getValue() === 0) {
                guiIteration.setValue(min);
            }
        },

        play: function() {
            if (!this.playing) {
                this._enableController('speed');
                this._enableController('pause');
                this._player();
                this.playing = true;
                this._changeControllerText("play", "pause");
            } else {
                this.pause();
            }
        },

        pause: function() {
            clearTimeout(this.timer);
            this.playing = false;
            this._changeControllerText("play", "play");
            this._disableController('speed');
        },

        /* Private */

        _player: function() {
            this.timer = _.delay(function(_this){
                _this.iteration++;
                if(_this.iteration < _this.guiIteration.__max) {
                    _this._player();
                } else {
                    _this.pause();
                }
            }, this._calculateSpeed(),this);
        },

        _changeControllerText: function(name, label) {
            for (var i = 0; i < this.gui.__controllers.length; i++) {
                if (this.gui.__controllers[i].property === name) {
                    this.gui.__controllers[i].name(label);
                }
            }
        },

        _calculateSpeed: function() {
            return this.maxSpeed - this.speed;
        },

        _findController: function(controllerName) {
            for (var i = 0; i < this.gui.__controllers.length; i++) {
                var controller = this.gui.__controllers[i];

                if (controller.property === controllerName) {
                    return controller;
                }
            }

            return null;
        },

        _disableController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            if($(controller.__li).children(".disabled").length > 0) return;
            $(controller.__li).append("<div class='disabled'></div>");
        },

        _enableController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            $(controller.__li).children().remove(".disabled");
        },

        _hideController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            $(controller.__li).addClass("hidden");
        },

        _initScene: function() {
            var container = this.container,
                width = container.width(),
                height = container.height();

            var scene = new THREE.Scene();
            var renderer = this.initRenderer();

            var camera = this.initCamera(width, height);
            scene.add(camera);

            renderer.setSize(width, height);
            this.container.append(renderer.domElement);

            this.renderer = renderer;
            this.camera = camera;
            this.scene = scene;

            this._watchForResize();
        },

        _watchForResize: function() {
            var renderer = this.renderer,
                camera = this.camera,
                container = this.container;

            $(window).resize(function() {
                var width = container.width(),
                    height = container.height();

                renderer.setSize(width, height);
                
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            });
        },

        _initControls: function() {
            var camera = this.camera,
                renderer = this.renderer,
                controls = new THREE.TrackballControls(camera, renderer.domElement);

            controls.rotateSpeed = 1.0;
            controls.zoomSpeed = 1.2;
            controls.panSpeed = 0.8;

            controls.noZoom = false;
            controls.noPan = false;

            controls.staticMoving = true;
            controls.dynamicDampingFactor = 0.3;

            controls.keys = [65, 83, 68];

            this.controls = controls;
        },

        _initStats: function() {
            var stats = new Stats(),
                domElement = $(stats.domElement);

            stats.setMode(0); // 0: fps; 1: ms

            domElement.addClass("stats");
            this.container.append(domElement);

            this.stats = stats;
        },

        _initGUI: function() {
            var gui = new dat.GUI({ autoPlace: false }),
                domElement = $(gui.domElement);

            domElement.addClass("controls");
            this.container.append(domElement);

            this.next = this._nextIteration;
            this.prev = this._prevIteration;

            this.guiIteration = gui.add(this, 'iteration', 0, 0).step(1).listen();
            gui.add(this, 'play');
            gui.add(this, 'speed', 0, this.maxSpeed).step(1);
            gui.add(this, 'next');
            gui.add(this, 'prev');

            this.gui = gui;
            this.addGuiControls();
        },

        _update: function() {
            if (this.lastIteration != this.iteration) {
                this._iterationChanged();
                this.lastIteration = this.iteration;
            }
        },

        _nextIteration: function() {
            this.pause();
            this.iteration = Math.min(this.iteration + 1, this.history.length());
        },

        _prevIteration: function() {
            this.pause();
            this.iteration = Math.max(this.iteration - 1, 1);
        },

        _iterationChanged: function() {
            var lastSnapshot = this.snapshot,
                snapshot = this.history.getSnapshotAtIndex(this.iteration - 1);

            if (!snapshot) {
                console.log("Invalid iteration index: " + this.iteration);
                console.log("History length: " + this.history.length());
                return;
            }
            
            this.snapshot = snapshot;

            this.iterationChanged(snapshot, lastSnapshot); // fire public event
        },
    };
});
