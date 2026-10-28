// Web Worker entry: counts large text off the main thread. Nothing is sent anywhere; messages stay inside this page.
import { createSession, handleMessage } from './worker-core.mjs';

const session = createSession();
self.onmessage = (e) => self.postMessage(handleMessage(session, e.data));
