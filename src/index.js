import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const RealWebSocket = window.WebSocket;
const ZEGO_REPORT_URL_MARKERS = ['/ws/report/stream?'];

class ZegoReportSocketStub {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this._handlers = {};
  }
  addEventListener(type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
    if (type === 'open' && this.readyState === 1) {
      setTimeout(() => fn({ type: 'open' }), 0);
    }
  }
  removeEventListener(type, fn) {
    this._handlers[type] = (this._handlers[type] || []).filter((f) => f !== fn);
  }
  send() {}
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    (this._handlers.close || []).forEach((fn) => {
      try {
        fn({ type: 'close' });
      } catch (e) {}
    });
  }
}

window.WebSocket = function (url, protocols) {
  if (typeof url === 'string' && ZEGO_REPORT_URL_MARKERS.some((marker) => url.includes(marker))) {
    return new ZegoReportSocketStub(url);
  }
  return new RealWebSocket(url, protocols);
};
window.WebSocket.prototype = RealWebSocket.prototype;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
