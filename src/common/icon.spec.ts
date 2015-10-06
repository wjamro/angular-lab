import {
	AsyncTestCompleter,
	afterEach,
	beforeEach,
	describe,
	expect,
	inject,
	it,
	SpyObject
} from 'angular2/test_lib';
import {
	Injector,
	bind
} from 'angular2/angular2';
import {
	MockBackend,
	MockConnection,
	ConnectionBackend,
	BaseRequestOptions,
	ResponseOptions,
	Response,
	Http
} from 'angular2/http';

import { isObservable } from './lang';
import { IconStore } from './icon';

const SVG_GLYPH_HTML = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>';
const FAKE_URL = 'glyph.svg';

export function main () {
	describe('IconStore', () => {
		var injector: Injector;
		var store: IconStore;
		var backend: MockBackend;
		var glyph: Node;
		var response;

		beforeEach(() => {
			injector = Injector.resolveAndCreate([
				BaseRequestOptions,
				MockBackend,
				bind(Http).toFactory((connectionBackend: ConnectionBackend, defaultOptions: BaseRequestOptions) => {
					return new Http(connectionBackend, defaultOptions);
				}, [
					MockBackend,
					BaseRequestOptions
				]),
				bind(IconStore).toFactory(
					(http: Http) => {
						return new IconStore(http);
					},
					[
						Http
					]
				)
			]);
			backend = injector.get(MockBackend);
			store = injector.get(IconStore);
			response = new Response(
				new ResponseOptions({ body: SVG_GLYPH_HTML })
			);
			glyph = createGlyphNode();
		});

		afterEach(() => backend.verifyNoPendingRequests());

		describe('.get', () => {
			it('should return an Observable', () => {
				expect(isObservable(store.get(FAKE_URL))).toBe(true);
			});
			it('return value should be an SVG element', inject([AsyncTestCompleter], (async) => {
				backend.connections.observer({ next: (connection: MockConnection) => connection.mockRespond(response) });
				store.get(FAKE_URL).observer({
					next: (svg) => {
						expect(svg.isEqualNode(glyph)).toBe(true);
						async.done();
					}
				});
			}));
			it('should only fire one request for the same path and resolve from cache', inject([AsyncTestCompleter], (async) => {
				let url = 'ofor/' + FAKE_URL;
				let bc = new BackendConnectionSpy();
				backend.connections.observer({
					next: (connection: MockConnection) => {
						bc.onEstablish();
						connection.mockRespond(response);
					}
				});
				store.get(url).observer({
					next: () => {
						store.get(url).observer({
							next: () => {
								expect(bc.onEstablish.calls.count()).toEqual(1);
								async.done();
							}
						});
					}
				});
			}));
		});
	});
}

class BackendConnectionSpy extends SpyObject {
	onEstablish: any;
	constructor() {
		super();
		this.onEstablish = this.spy('onEstablish');
	}
}

function createGlyphNode (): Node {
	let container = document.createElement('div');
	container.innerHTML = SVG_GLYPH_HTML;
	return container.firstChild.cloneNode(true);
}