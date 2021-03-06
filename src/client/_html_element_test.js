// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.

(function() {
	"use strict";

	var HtmlElement = require("./html_element.js");
	var browser = require("./browser.js");

	describe("HtmlElement", function() {
		var windowElement;
		var bodyElement;
		var htmlElement;

		beforeEach(function() {
			windowElement = new HtmlElement(window);
			bodyElement = new HtmlElement(document.body);
			htmlElement = HtmlElement.fromHtml("<div></div>");
		});

		afterEach(function() {
			if (browser.supportsCaptureApi()) htmlElement.releaseCapture();
			windowElement.removeAllEventHandlers();
			bodyElement.removeAllEventHandlers();
			htmlElement.removeAllEventHandlers();
		});

		describe("event handling", function() {

			beforeEach(function() {
				htmlElement.appendSelfToBody();
			});

			afterEach(function() {
				htmlElement.remove();
			});

			it("clears all event handlers (useful for testing)", function() {
				htmlElement.onMouseDown(function() {
					throw new Error("event handler should have been removed");
				});

				htmlElement.removeAllEventHandlers();
				htmlElement.triggerMouseDown(0, 0);
			});

			describe("default prevention", function() {
				it("allows drag-related browser defaults to be prevented", function() {
					htmlElement.preventBrowserDragDefaults();

					expectEventToBePrevented("selectstart", htmlElement.triggerSelectStart);   // required for IE 8 text dragging
					expectEventToBePrevented("mousedown", htmlElement.triggerMouseDown);
					if (browser.supportsTouchEvents()) {
						expectEventToBePrevented("touchstart", htmlElement.triggerSingleTouchStart);
						expectEventToBePrevented("touchstart", htmlElement.triggerMultiTouchStart);
					}

					function expectEventToBePrevented(event, eventTriggerFn) {
						var monitor = monitorEvent(event);
						htmlElement._element.trigger(event);
						expect(monitor.defaultPrevented).to.be(true);
					}
				});

				it("reports whether drag-related defaults have been prevented", function() {
					expect(htmlElement.isBrowserDragDefaultsPrevented()).to.be(false);
					htmlElement.preventBrowserDragDefaults();
					expect(htmlElement.isBrowserDragDefaultsPrevented()).to.be(true);
				});
			});

			describe("mouse events", function() {
				it("can be triggered with coordinates relative to the element", function() {
					checkEventTrigger(htmlElement.triggerMouseClick, "click");
					checkEventTrigger(htmlElement.triggerMouseDown, "mousedown");
					checkEventTrigger(htmlElement.triggerMouseMove, "mousemove");
					checkEventTrigger(htmlElement.triggerMouseLeave, "mouseleave");
					checkEventTrigger(htmlElement.triggerMouseUp, "mouseup");

					function checkEventTrigger(eventTriggerFn, event) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement, 4, 7);

						var expectedPageCoordinates = htmlElement.pageOffset({ x: 4, y: 7 });
						expect(monitor.pageCoordinates).to.eql([ expectedPageCoordinates.x, expectedPageCoordinates.y ]);
					}
				});

				it("can be triggered without coordinates", function() {
					checkEventTrigger(htmlElement.triggerMouseClick, "click");
					checkEventTrigger(htmlElement.triggerMouseDown, "mousedown");
					checkEventTrigger(htmlElement.triggerMouseMove, "mousemove");
					checkEventTrigger(htmlElement.triggerMouseLeave, "mouseleave");
					checkEventTrigger(htmlElement.triggerMouseUp, "mouseup");

					function checkEventTrigger(eventTriggerFn, event) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement);
						expect(monitor.pageCoordinates).to.eql([ 0, 0 ]);
					}
				});

				it("handlers receive coordinates relative to the page", function() {
					checkEventHandler(htmlElement.onMouseClick, htmlElement.triggerMouseClick);
					checkEventHandler(htmlElement.onMouseDown, htmlElement.triggerMouseDown);
					checkEventHandler(htmlElement.onMouseMove, htmlElement.triggerMouseMove);
					checkEventHandler(htmlElement.onMouseLeave, htmlElement.triggerMouseLeave);
					checkEventHandler(htmlElement.onMouseUp, htmlElement.triggerMouseUp);

					function checkEventHandler(eventHandlerFn, eventTriggerFn) {
						var monitor = monitorEventHandler(htmlElement, eventHandlerFn);
						eventTriggerFn.call(htmlElement, 60, 40);

						var expectedPageCoordinates = htmlElement.pageOffset({ x: 60, y: 40 });
						expect(monitor.eventTriggeredAt).to.eql(expectedPageCoordinates);
					}
				});

				it("simulates buggy IE 8 behavior (where mouse events on window aren't sent to window object)", function() {
					if (!browser.doesNotHandlesUserEventsOnWindow()) return;

					var monitor = monitorEventHandler(windowElement, windowElement.onMouseUp);
					windowElement.triggerMouseUp();
					expect(monitor.eventTriggered).to.be(false);
				});
			});

			describe("touch events", function() {
				if (!browser.supportsTouchEvents()) return;

				it("sends zero touches when emulating the end of a touch", function() {
					checkEventTrigger("touchend", htmlElement.triggerTouchEnd);
					checkEventTrigger("touchcancel", htmlElement.triggerTouchCancel);

					function checkEventTrigger(event, eventTriggerFn) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement);
						expect(monitor.touches).to.eql([]);
					}
				});

				it("sends single-touch events relative to triggering element", function() {
					checkEventTrigger(htmlElement.triggerSingleTouchStart, "touchstart");
					checkEventTrigger(htmlElement.triggerSingleTouchMove, "touchmove");

					function checkEventTrigger(eventTriggerFn, event) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement, 4, 7);

						var expectedPageCoordinates = htmlElement.pageOffset({ x: 4, y: 7 });
						expect(monitor.touches).to.eql([[ expectedPageCoordinates.x, expectedPageCoordinates.y ]]);
					}
				});

				it("can send single-touch events without coordinates", function() {
					checkEventTrigger(htmlElement.triggerSingleTouchStart, "touchstart");
					checkEventTrigger(htmlElement.triggerSingleTouchMove, "touchmove");

					function checkEventTrigger(eventTriggerFn, event) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement);
						expect(monitor.touches).to.eql([[ 0, 0 ]]);
					}
				});

				it("sends multi-touch events relative to triggering element", function() {
					checkEventTrigger(htmlElement.triggerMultiTouchStart, "touchstart");

					function checkEventTrigger(eventTriggerFn, event) {
						var monitor = monitorEvent(event);
						eventTriggerFn.call(htmlElement, 10, 20, 30, 40);
						
						var expectedFirstTouch = htmlElement.pageOffset({ x: 10, y: 20 });
						var expectedSecondTouch = htmlElement.pageOffset({ x: 30, y: 40 });
						expect(monitor.touches).to.eql([
							[ expectedFirstTouch.x, expectedFirstTouch.y ],
							[ expectedSecondTouch.x, expectedSecondTouch.y ]
						]);
					}
				});

				it("handles zero-touch events", function() {
					checkEventHandler(htmlElement.onTouchEnd, htmlElement.triggerTouchEnd);
					checkEventHandler(htmlElement.onTouchCancel, htmlElement.triggerTouchCancel);

					function checkEventHandler(eventHandlerFn, eventTriggerFn) {
						var monitor = monitorEventHandler(htmlElement, eventHandlerFn);
						eventTriggerFn.call(htmlElement);
						expect(monitor.eventTriggered).to.be(true);
						expect(monitor.eventTriggeredAt).to.be(undefined);
					}
				});

				it("handles single-touch events", function() {
					checkEventHandler(htmlElement.onSingleTouchStart, htmlElement.triggerSingleTouchStart);
					checkEventHandler(htmlElement.onSingleTouchMove, htmlElement.triggerSingleTouchMove);

					function checkEventHandler(eventHandlerFn, eventTriggerFn) {
						var monitor = monitorEventHandler(htmlElement, eventHandlerFn);
						eventTriggerFn.call(htmlElement, 60, 40);

						var expectedPageCoordinates = htmlElement.pageOffset({ x: 60, y: 40 });
						expect(monitor.eventTriggeredAt).to.eql(expectedPageCoordinates);
					}
				});

				it("handles multi-touch events (but doesn't provide coordinates)", function() {
					checkEventHandler(htmlElement.onMultiTouchStart, htmlElement.triggerMultiTouchStart);

					function checkEventHandler(eventHandlerFn, eventTriggerFn) {
						var monitor = monitorEventHandler(htmlElement, eventHandlerFn);
						eventTriggerFn.call(htmlElement, 1, 2, 3, 4);

						expect(monitor.eventTriggered).to.be(true);
						expect(monitor.eventTriggeredAt).to.be(undefined);
					}
				});
			});

			describe("Capture API", function() {
				if (!browser.supportsCaptureApi()) return;

				afterEach(function() {
					htmlElement.releaseCapture();
				});

				it("emulates behavior of setCapture() (on browsers that support it)", function() {
					var monitor = monitorEventHandler(htmlElement, htmlElement.onMouseMove);
					htmlElement.setCapture();
					bodyElement.triggerMouseMove();
					expect(monitor.eventTriggered).to.be(true);
				});

				it("emulates behavior of releaseCapture() (on browsers that support it)", function() {
					var monitor = monitorEventHandler(htmlElement, htmlElement.onMouseMove);
					htmlElement.setCapture();
					htmlElement.releaseCapture();
					bodyElement.triggerMouseMove();
					expect(monitor.eventTriggered).to.be(false);
				});

				it("when event triggered, event coordinates are relative to triggering element, not capturing element", function() {
					var expectedPageCoordinates = bodyElement.pageOffset({ x: 30, y: 20 });

					var monitor = monitorEventHandler(htmlElement, htmlElement.onMouseMove);
					htmlElement.setCapture();
					bodyElement.triggerMouseMove(30, 20);
					expect(monitor.eventTriggeredAt).to.eql(expectedPageCoordinates);
				});

			});

			function monitorEvent(event) {
				var monitor = {
					eventTriggered: false,
					touches: null,
					pageCoordinates: null,
					defaultPrevented: false
				};

				htmlElement._element.on(event, function(event) {
					monitor.eventTriggered = true;
					monitor.pageCoordinates = [ event.pageX, event.pageY ];
					monitor.defaultPrevented = event.isDefaultPrevented();

					if (event.originalEvent) {
						var eventTouches = event.originalEvent.touches;
						monitor.touches = [];
						for (var i = 0; i < eventTouches.length; i++) {
							monitor.touches.push([ eventTouches[i].pageX, eventTouches[i].pageY ]);
						}
					}
				});

				return monitor;
			}

			function monitorEventHandler(htmlElement, eventFunction) {
				var monitor = {
					eventTriggered: false
				};

				eventFunction.call(htmlElement, function(pageOffset) {
					monitor.eventTriggered = true;
					monitor.eventTriggeredAt = pageOffset;
				});
				return monitor;
			}
		});

		describe("coordinate conversion", function() {

			it("converts page coordinates into relative element coordinates", function() {
				try {
					htmlElement.appendSelfToBody();
					var offset = htmlElement.relativeOffset({x: 100, y: 150});

					if (browser.reportsElementPositionOffByOneSometimes()) {
						// compensate for off-by-one error in IE 8
						expect(offset.x).to.equal(92);
						expect(offset.y === 141 || offset.y === 142).to.be(true);
					}
					else {
						expect(offset).to.eql({x: 92, y: 142});
					}
				} finally {
					htmlElement.remove();
				}
			});

			it("converts relative coordinates into page coordinates", function() {
				try {
					htmlElement.appendSelfToBody();
					var offset = htmlElement.pageOffset({x: 100, y: 150});

					if (browser.reportsElementPositionOffByOneSometimes()) {
						// compensate for off-by-one error in IE 8
						expect(offset.x).to.equal(108);
						expect(offset.y === 158 || offset.y === 159).to.be(true);
					}
					else {
						expect(offset).to.eql({x: 108, y: 158});
					}
				} finally {
					htmlElement.remove();
				}
			});
		});

		describe("DOM manipulation", function() {

			it("creates element from raw HTML; also, converts to DOM element", function() {
				var element = HtmlElement.fromHtml("<code>foo</code>");

				var domElement = element.toDomElement();

				expect(domElement.outerHTML.toLowerCase()).to.equal("<code>foo</code>");

				// Ensure that fromHtml converts HTML to DOM element, not jQuery element
				expect(element._domElement).to.equal(domElement);
			});

			it("appends elements", function() {
				htmlElement.append(HtmlElement.fromHtml("<div></div>"));
				expect(htmlElement._element.children().length).to.equal(1);
			});

			it("appends to body", function() {
				try {
					var childrenBeforeAppend = bodyElement._element.children().length;

					htmlElement.appendSelfToBody();
					var childrenAfterAppend = bodyElement._element.children().length;
					expect(childrenBeforeAppend + 1).to.equal(childrenAfterAppend);
				} finally {
					htmlElement.remove();
				}
			});

			it("removes elements", function() {
				var elementToAppend = HtmlElement.fromHtml("<div></div>");
				htmlElement.append(elementToAppend);
				elementToAppend.remove();
				expect(htmlElement._element.children().length).to.equal(0);
			});
		});

	});

}());